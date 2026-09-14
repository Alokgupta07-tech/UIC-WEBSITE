// Resolves everything the member dashboard shows, from real backend records.
//
// Three independent, RLS-gated sources are combined:
//   1. event_registrations  — rows for this member (by user_id or account email)
//   2. attendance_codes     — codes redeemed at the venue with this member's email
//   3. certificates         — certificates issued to this member
//
// Nothing is inferred: a member is only ever shown as "Attended" when a real
// attendance record exists. An event simply being in the past does NOT count as
// attendance.
import { supabase } from "@/integrations/supabase/client";
import { isMissingTableError } from "@/services/supabaseErrors";
import { getPublishedEvents } from "@/services/events";
import { getMyCertificates, claimMyCertificates } from "@/services/certificates";
import type {
  Certificate,
  ClubEvent,
  MemberActivity,
  MemberEvent,
  MemberEventState,
  MemberProgress,
  MemberStats,
  ParticipationSource,
} from "@/types";

/** Assumed duration of an event that has no explicit end date, for deciding
 *  whether it is "Live" right now. */
const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// UIC progress formula
//
// A member's progress is the weighted fill of three real activity targets.
// Each component is capped at its target so the bar can never exceed 100%, and
// the weights reflect how much each signal actually says about involvement:
// showing up matters most, earned certificates next, sign-ups least.
//
//   attended      -> 45%  (target: 8 attended events)
//   certificates  -> 30%  (target: 5 valid certificates)
//   registrations -> 25%  (target: 5 registered events)
//
// Only certificates that are still valid (status "issued") count, so a revoked
// certificate does not inflate the number.
// ---------------------------------------------------------------------------
const PROGRESS_TARGETS = { attended: 8, certificates: 5, registered: 5 } as const;
const PROGRESS_WEIGHTS = { attended: 45, certificates: 30, registered: 25 } as const;

function computeProgress(stats: MemberStats): MemberProgress {
  const share = (value: number, target: number, weight: number) =>
    (Math.min(value, target) / target) * weight;

  const percent = Math.round(
    share(stats.eventsAttended, PROGRESS_TARGETS.attended, PROGRESS_WEIGHTS.attended) +
      share(
        stats.validCertificates,
        PROGRESS_TARGETS.certificates,
        PROGRESS_WEIGHTS.certificates
      ) +
      share(stats.registeredEvents, PROGRESS_TARGETS.registered, PROGRESS_WEIGHTS.registered)
  );

  let label = "Just getting started";
  if (percent >= 100) label = "UIC veteran";
  else if (percent >= 75) label = "Highly active member";
  else if (percent >= 45) label = "Active member";
  else if (percent >= 15) label = "Finding your feet";

  return {
    percent: Math.max(0, Math.min(100, percent)),
    label,
    milestones: [
      {
        label: "Registered for an event",
        reached: stats.registeredEvents >= 1,
        hint: "Sign up for any UIC event",
      },
      {
        label: "Attended your first event",
        reached: stats.eventsAttended >= 1,
        hint: "Redeem the attendance code handed out at the venue",
      },
      {
        label: "Earned your first certificate",
        reached: stats.validCertificates >= 1,
        hint: "Certificates are issued after you attend",
      },
      {
        label: `Attended ${PROGRESS_TARGETS.attended} events`,
        reached: stats.eventsAttended >= PROGRESS_TARGETS.attended,
        hint: `${stats.eventsAttended} of ${PROGRESS_TARGETS.attended} so far`,
      },
      {
        label: `Collected ${PROGRESS_TARGETS.certificates} certificates`,
        reached: stats.validCertificates >= PROGRESS_TARGETS.certificates,
        hint: `${stats.validCertificates} of ${PROGRESS_TARGETS.certificates} so far`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Event timeline state
// ---------------------------------------------------------------------------

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Bucket an event relative to now. "live" is only returned inside the real
 * event window, never just because the event is today.
 */
export function resolveEventState(event: ClubEvent, now = new Date()): MemberEventState {
  const start = new Date(event.eventDate);
  if (Number.isNaN(start.getTime())) return "upcoming";

  const end = event.endDate ? new Date(event.endDate) : null;
  const endTime =
    end && !Number.isNaN(end.getTime())
      ? end.getTime()
      : start.getTime() + DEFAULT_EVENT_DURATION_MS;

  if (now.getTime() >= start.getTime() && now.getTime() <= endTime) return "live";
  if (now.getTime() > endTime) return "past";
  if (isSameCalendarDay(start, now)) return "today";
  return "upcoming";
}

// ---------------------------------------------------------------------------
// Raw source reads
// ---------------------------------------------------------------------------

type RegistrationRecord = {
  eventId: string;
  attended: boolean;
  status: string | null;
  registeredAt: string | null;
};

/** Registrations for this member. RLS restricts rows to `user_id = auth.uid()`
 *  or a match on the caller's verified email. */
async function getMyRegistrations(): Promise<RegistrationRecord[]> {
  try {
    const { data, error } = await supabase
      .from("event_registrations")
      .select("event_id, attended, status, registered_at");

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }

    return (data ?? []).map((row) => ({
      eventId: row.event_id,
      attended: row.attended === true,
      status: row.status ?? null,
      registeredAt: row.registered_at ?? null,
    }));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

type AttendanceRecord = { eventId: string; redeemedAt: string | null };

/** Attendance for this member from the verified `attendance` table (one row
 *  per (event, user) created exclusively by the mark_attendance RPC, RLS
 *  restricted to the caller). Falls back to the legacy `attendance_codes`
 *  desk-redemption table if the new table is not installed. */
async function getMyAttendance(): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("event_id, marked_at");

    if (error) throw error;

    return (data ?? []).map((row) => ({
      eventId: row.event_id,
      redeemedAt: row.marked_at ?? null,
    }));
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error("Error reading member attendance:", error);
    }
  }

  // Legacy source: codes redeemed at the venue with this member's email.
  try {
    const { data, error } = await supabase
      .from("attendance_codes")
      .select("event_id, redeemed_at")
      .eq("status", "used");

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }

    return (data ?? []).map((row) => ({
      eventId: row.event_id,
      redeemedAt: row.redeemed_at ?? null,
    }));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Load and combine the member's activity.
 *
 * All four reads run in parallel; each source degrades to an empty list on its
 * own if that part of the schema is not installed, so one missing table never
 * blanks the whole dashboard.
 *
 * Events are resolved against the published-events list, which means an event
 * the member cannot see (unpublished/removed) is left out of both the lists and
 * the counters, keeping the numbers consistent with what is on screen.
 */
export async function getMemberActivity(): Promise<MemberActivity> {
  // Best-effort: attach certificates issued to this email to the account.
  await claimMyCertificates();

  const [events, registrations, attendance, certificates] = await Promise.all([
    getPublishedEvents(),
    getMyRegistrations(),
    getMyAttendance(),
    getMyCertificates(),
  ]);

  const eventById = new Map(events.map((event) => [event.id, event]));
  const now = new Date();

  const registrationByEvent = new Map<string, RegistrationRecord>();
  for (const record of registrations) {
    const existing = registrationByEvent.get(record.eventId);
    // Keep the strongest signal if a member somehow has duplicate rows.
    if (!existing || (record.attended && !existing.attended)) {
      registrationByEvent.set(record.eventId, record);
    }
  }

  const attendanceByEvent = new Map<string, AttendanceRecord>();
  for (const record of attendance) {
    if (!attendanceByEvent.has(record.eventId)) {
      attendanceByEvent.set(record.eventId, record);
    }
  }

  const certificatesByEvent = new Map<string, Certificate[]>();
  for (const certificate of certificates) {
    const list = certificatesByEvent.get(certificate.eventId);
    if (list) list.push(certificate);
    else certificatesByEvent.set(certificate.eventId, [certificate]);
  }

  const relevantEventIds = new Set<string>([
    ...registrationByEvent.keys(),
    ...attendanceByEvent.keys(),
    ...certificatesByEvent.keys(),
  ]);

  const memberEvents: MemberEvent[] = [];
  for (const eventId of relevantEventIds) {
    const event = eventById.get(eventId);
    if (!event) continue; // Not visible to this member — skip rather than guess.

    const registration = registrationByEvent.get(eventId);
    const attendanceRecord = attendanceByEvent.get(eventId);
    const eventCertificates = certificatesByEvent.get(eventId) ?? [];

    const sources: ParticipationSource[] = [];
    if (registration) sources.push("registration");
    if (attendanceRecord) sources.push("attendance-code");

    memberEvents.push({
      event,
      state: resolveEventState(event, now),
      isRegistered: Boolean(registration),
      hasAttended: Boolean(attendanceRecord) || registration?.attended === true,
      attendedAt: attendanceRecord?.redeemedAt ?? null,
      sources,
      certificates: eventCertificates,
    });
  }

  const byDateAsc = (a: MemberEvent, b: MemberEvent) =>
    new Date(a.event.eventDate).getTime() - new Date(b.event.eventDate).getTime();
  const byDateDesc = (a: MemberEvent, b: MemberEvent) => byDateAsc(b, a);

  const upcoming = memberEvents
    .filter((item) => item.state !== "past")
    .sort(byDateAsc);
  const past = memberEvents.filter((item) => item.state === "past").sort(byDateDesc);
  const attended = memberEvents.filter((item) => item.hasAttended).sort(byDateDesc);

  const stats: MemberStats = {
    totalCertificates: certificates.length,
    validCertificates: certificates.filter((item) => item.status === "issued").length,
    eventsAttended: attended.length,
    upcomingEvents: upcoming.length,
    completedEvents: past.length,
    registeredEvents: memberEvents.filter((item) => item.isRegistered).length,
  };

  return {
    events: memberEvents,
    upcoming,
    past,
    attended,
    certificates,
    stats,
    progress: computeProgress(stats),
    isEmpty: memberEvents.length === 0 && certificates.length === 0,
  };
}
