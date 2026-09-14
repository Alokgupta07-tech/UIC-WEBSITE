import { supabase } from "@/integrations/supabase/client";
import type { AttendanceCode, AttendanceRecord } from "@/types";

/**
 * Generate (or regenerate) the attendance code for an event.
 *
 * The server generates the code with a cryptographically-secure generator,
 * computes the validity window from the SERVER clock (the browser never sends
 * timestamps), stores only a bcrypt hash — plus an admin-only display copy —
 * and returns the raw code exactly once for the organizer to display.
 */
export async function generateAttendanceCode(
  eventId: string,
  validityHours: number
): Promise<string> {
  const { data, error } = await supabase.rpc("generate_event_attendance_code", {
    p_event_id: eventId,
    p_validity_hours: validityHours,
  });

  if (error) {
    console.error("Error generating attendance code:", error);
    if (error.code === "PGRST202" || error.message?.includes("Could not find the function")) {
      throw new Error(
        "The attendance database functions are out of date. Ask an admin to run the latest supabase/migrations/20260914*.sql files in the Supabase SQL editor."
      );
    }
    if (error.message?.includes("invalid_window")) {
      throw new Error("Validity must be between 1 and 72 hours.");
    }
    if (error.message?.includes("event_not_available")) {
      throw new Error("This event is not available for attendance.");
    }
    if (error.message?.includes("unauthorized")) {
      throw new Error("You do not have permission to generate attendance codes.");
    }
    throw new Error("Unable to generate the attendance code. Please try again.");
  }
  return data as string;
}

export async function getActiveAttendanceCode(eventId: string): Promise<AttendanceCode | null> {
  const { data, error } = await supabase
    .from("event_attendance_codes")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching active attendance code:", error);
    throw error;
  }
  if (!data) return null;

  return {
    id: data.id,
    eventId: data.event_id,
    codeHash: data.code_hash,
    codeDisplay: data.code_display ?? null,
    validFrom: data.valid_from,
    validUntil: data.valid_until,
    isActive: data.is_active,
    createdBy: data.created_by,
    createdAt: data.created_at,
    revokedAt: data.revoked_at ?? null,
    revokedBy: data.revoked_by ?? null,
  };
}

export async function revokeAttendanceCode(eventId: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_event_attendance_code", {
    p_event_id: eventId,
  });
  if (error) {
    console.error("Error revoking attendance code:", error);
    throw new Error("Unable to revoke the code. Please try again.");
  }
}

/** All backend rejection reasons mapped to safe, user-friendly messages. */
const MARK_STATUS_MESSAGES: Record<string, string> = {
  success: "Attendance marked successfully!",
  unauthorized: "You must be signed in to mark attendance.",
  rate_limited:
    "Too many attempts. Please wait a few minutes and try again.",
  invalid_code: "Invalid attendance code for this event.",
  too_early: "Attendance is not available yet. Please wait until the window opens.",
  too_late: "Attendance code has expired.",
  event_not_available: "Attendance is no longer valid for this event.",
  not_registered: "You must be registered for this event to mark attendance.",
  already_attended: "You have already marked attendance for this event.",
};

/**
 * Submit a participant's attendance code.
 *
 * The event is resolved server-side from the code itself — the browser does
 * not send (and the backend does not trust) any event id. Input is normalized
 * defensively before sending; the server normalizes and validates again.
 */
export async function markAttendance(
  rawCode: string
): Promise<{ success: boolean; message: string; status: string }> {
  // Normalize: trim, uppercase, drop separators/spaces ("uic-7k9x-4m2p" -> "UIC7K9X4M2P").
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  const { data, error } = await supabase.rpc("mark_attendance", { p_code: code });

  if (error) {
    console.error("Error marking attendance:", error);
    return {
      success: false,
      message: "Unable to mark attendance. Please try again.",
      status: "error",
    };
  }

  const status = data as string;
  return {
    success: status === "success",
    message: MARK_STATUS_MESSAGES[status] ?? "Invalid attendance code for this event.",
    status,
  };
}

export async function getEventAttendance(eventId: string): Promise<AttendanceRecord[]> {
  // Preferred path: SECURITY DEFINER RPC that joins auth.users server-side.
  // (PostgREST cannot embed auth.users directly — the auth schema is not
  // exposed, which is why the old FK-embed query returned 400.)
  try {
    const { data, error } = await supabase.rpc("get_event_attendance", {
      p_event_id: eventId,
    });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      eventId,
      userId: row.user_id,
      codeId: row.code_id,
      status: row.status as "verified" | "revoked",
      markedAt: row.marked_at,
      userEmail: row.email ?? undefined,
      userName: row.full_name || undefined,
    }));
  } catch (rpcError) {
    console.warn("get_event_attendance RPC unavailable, falling back to direct query", rpcError);
  }

  // Fallback: direct query (works if auth schema embedding is ever enabled).
  const { data, error } = await supabase
    .from("attendance")
    .select("*, auth_users:user_id(email, raw_user_meta_data)")
    .eq("event_id", eventId)
    .order("marked_at", { ascending: false });

  if (error) {
    console.error("Error fetching event attendance:", error);
    throw error;
  }

  return (data as unknown[]).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    codeId: row.code_id,
    status: row.status as "verified" | "revoked",
    markedAt: row.marked_at,
    userEmail: row.auth_users?.email,
    userName: row.auth_users?.raw_user_meta_data?.full_name,
  }));
}
