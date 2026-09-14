import { supabase } from "@/integrations/supabase/client";
import type { AttendanceCode, AttendanceRecord } from "@/types";

export async function generateAttendanceCode(
  eventId: string,
  validFrom: Date,
  validUntil: Date
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("generate_event_attendance_code", {
      p_event_id: eventId,
      p_valid_from: validFrom.toISOString(),
      p_valid_until: validUntil.toISOString(),
    });

    if (error) throw error;
    return data as string;
  } catch (error: unknown) {
    console.error("Error generating attendance code:", error);
    throw error;
  }
}

export async function getActiveAttendanceCode(eventId: string): Promise<AttendanceCode | null> {
  try {
    const { data, error } = await supabase
      .from("event_attendance_codes")
      .select("*")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      eventId: data.event_id,
      codeHash: data.code_hash,
      validFrom: data.valid_from,
      validUntil: data.valid_until,
      isActive: data.is_active,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  } catch (error: unknown) {
    console.error("Error fetching active attendance code:", error);
    throw error;
  }
}

export async function revokeAttendanceCode(eventId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("revoke_event_attendance_code", {
      p_event_id: eventId,
    });
    if (error) throw error;
  } catch (error: unknown) {
    console.error("Error revoking attendance code:", error);
    throw error;
  }
}

export async function markAttendance(
  eventId: string,
  code: string
): Promise<{ success: boolean; message: string; status: string }> {
  try {
    const { data, error } = await supabase.rpc("mark_attendance", {
      p_event_id: eventId,
      p_code: code.trim(),
    });

    if (error) throw error;

    const status = data as string;
    
    switch (status) {
      case "success":
        return { success: true, message: "Attendance marked successfully!", status };
      case "unauthorized":
        return { success: false, message: "You must be signed in to mark attendance.", status };
      case "no_active_code":
        return { success: false, message: "Attendance is not currently active for this event.", status };
      case "invalid_code":
        return { success: false, message: "Invalid attendance code.", status };
      case "too_early":
        return { success: false, message: "Attendance window has not opened yet.", status };
      case "too_late":
        return { success: false, message: "Attendance window has closed.", status };
      case "already_attended":
        return { success: false, message: "You have already marked attendance for this event.", status };
      default:
        return { success: false, message: "An unknown error occurred.", status };
    }
  } catch (error: unknown) {
    console.error("Error marking attendance:", error);
    throw error;
  }
}

export async function getEventAttendance(eventId: string): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*, auth_users:user_id(email, raw_user_meta_data)")
      .eq("event_id", eventId)
      .order("marked_at", { ascending: false });

    if (error) throw error;

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
  } catch (error: unknown) {
    console.error("Error fetching event attendance:", error);
    throw error;
  }
}

// Ensure old function is still exported to not break other files while we refactor
export async function deleteAttendanceCode(id: string): Promise<void> {
  // Deprecated in new schema, left to prevent import errors in old components temporarily
}
