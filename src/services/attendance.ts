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
  code_already_used: "This attendance code has already been used.",
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
    return (data ?? []).map((row: Record<string, unknown>) => ({
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
    const err = rpcError as { code?: string; message?: string; details?: string; hint?: string };
    console.error(
      `[attendance] get_event_attendance failed — code=${err?.code ?? "?"} message=${err?.message ?? "?"} details=${err?.details ?? "-"} hint=${err?.hint ?? "-"}`
    );
  }

  // Fallback: direct query (works if auth schema embedding is ever enabled).
  const { data, error } = await supabase
    .from("attendance")
    .select("*, auth_users:user_id(email, raw_user_meta_data)")
    .eq("event_id", eventId)
    .order("marked_at", { ascending: false });

  if (error) {
    const err = error as { code?: string; message?: string; details?: string; hint?: string };
    console.error(
      `[attendance] direct attendance query failed — code=${err?.code ?? "?"} message=${err?.message ?? "?"} details=${err?.details ?? "-"} hint=${err?.hint ?? "-"}`
    );
    throw error;
  }

  return (data as unknown[]).map((raw) => {
    const row = raw as {
      id: string; event_id: string; user_id: string; code_id: string;
      status: "verified" | "revoked"; marked_at: string;
      auth_users?: { email?: string; raw_user_meta_data?: { full_name?: string } };
    };
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      codeId: row.code_id,
      status: row.status,
      markedAt: row.marked_at,
      userEmail: row.auth_users?.email,
      userName: row.auth_users?.raw_user_meta_data?.full_name,
    };
  });
}

// ============================================================================
// Participant code batches (Method B — printed single-use codes)
// ============================================================================

export interface ParticipantBatch {
  id: string;
  label: string;
  codeCount: number;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  revokedAt: string | null;
  usedCount: number;
  remainingCount: number;
}

export interface GeneratedBatch {
  batchId: string;
  label: string;
  eventId: string;
  requestedCount: number;
  generatedCount: number;
  validFrom: string;
  validUntil: string;
}

/**
 * Generate a batch of N unique single-use codes for an event.
 * Everything happens in ONE server-side RPC: crypto-secure generation,
 * collision retry, uniqueness by DB constraint, atomic transaction (a failure
 * rolls back the whole batch, so no half-created batches can exist).
 */
export async function generateParticipantCodes(
  eventId: string,
  count: number,
  validityHours: number
): Promise<GeneratedBatch> {
  const { data, error } = await supabase.rpc("generate_participant_codes", {
    p_event_id: eventId,
    p_count: count,
    p_validity_hours: validityHours,
  });

  if (error) {
    const err = error as { code?: string; message?: string; details?: string; hint?: string };
    console.error(
      `[attendance] generate_participant_codes failed — code=${err?.code ?? "?"} message=${err?.message ?? "?"} details=${err?.details ?? "-"} hint=${err?.hint ?? "-"}`
    );
    if (error.code === "PGRST202" || error.message?.includes("Could not find the function")) {
      throw new Error(
        "The participant-code database functions are not installed yet. An admin must run supabase/migrations/20260914000005_participant_code_batches.sql in the Supabase SQL editor."
      );
    }
    if (error.message?.includes("invalid_count")) {
      throw new Error("Number of codes must be a whole number between 1 and 5000.");
    }
    if (error.message?.includes("invalid_window")) {
      throw new Error("Validity must be between 1 and 72 hours.");
    }
    if (error.message?.includes("event_not_available")) {
      throw new Error("This event is not available for attendance.");
    }
    if (error.message?.includes("unauthorized")) {
      throw new Error("You do not have permission to generate participant codes.");
    }
    throw new Error("Unable to generate the codes. Please try again.");
  }

  const b = data as Record<string, unknown>;
  return {
    batchId: b.batch_id,
    label: b.label,
    eventId: b.event_id,
    requestedCount: b.requested_count as number,
    generatedCount: b.generated_count as number,
    validFrom: b.valid_from as string,
    validUntil: b.valid_until as string,
  };
}

/** Batch list with live database usage stats for an event (admin only). */
export async function getParticipantBatches(eventId: string): Promise<ParticipantBatch[]> {
  const { data, error } = await supabase.rpc("get_participant_batches", {
    p_event_id: eventId,
  });
  if (error) {
    console.error("Error fetching participant batches:", error);
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[]).map((raw) => {
    const b = raw as { id: string; label: string; code_count: number; valid_from: string; valid_until: string; created_at: string; revoked_at: string | null; used_count: number | string | null; remaining_count: number | string | null };
    return ({
    id: b.id,
    label: b.label,
    codeCount: b.code_count,
    validFrom: b.valid_from,
    validUntil: b.valid_until,
    createdAt: b.created_at,
    revokedAt: b.revoked_at ?? null,
    usedCount: Number(b.used_count ?? 0),
    remainingCount: Number(b.remaining_count ?? 0),
    });
  });
}

/** The printable codes of a batch (admin only). Never exposed to members. */
export async function getParticipantBatchCodes(
  batchId: string
): Promise<{ serial: number; code: string; isUsed: boolean }[]> {
  const { data, error } = await supabase.rpc("get_participant_codes", {
    p_batch_id: batchId,
  });
  if (error) {
    console.error("Error fetching batch codes:", error);
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[]).map((raw) => {
    const row = raw as { serial_no: number | string; code: string; is_used: boolean };
    return ({
    serial: Number(row.serial_no),
    code: row.code,
    isUsed: row.is_used === true,
    });
  });
}

/** Revoke an entire batch: unused codes become unusable; attendance history is kept. */
export async function revokeParticipantBatch(batchId: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_participant_batch", {
    p_batch_id: batchId,
  });
  if (error) {
    console.error("Error revoking batch:", error);
    throw new Error("Unable to revoke the batch. Please try again.");
  }
}
