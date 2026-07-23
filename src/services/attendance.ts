import { supabase } from "@/integrations/supabase/client";
import type { AttendanceCode } from "@/types";

export async function generateAttendanceCodes(eventId: string, count: number): Promise<AttendanceCode[]> {
  try {
    const { data, error } = await supabase.rpc("generate_attendance_codes", {
      p_event_id: eventId,
      p_count: count,
    });
    
    if (error) throw error;
    
    return (data as unknown[]).map((row: any) => ({
      id: row.id,
      eventId: row.event_id,
      code: row.code,
      status: row.status as "unused" | "used",
      participantName: row.participant_name,
      participantEmail: row.participant_email,
      redeemedAt: row.redeemed_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }));
  } catch (error: unknown) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function getAttendanceCodes(eventId: string): Promise<AttendanceCode[]> {
  try {
    const { data, error } = await supabase
      .from("attendance_codes")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
      
    if (error) throw error;
    
    return (data as unknown[]).map((row: any) => ({
      id: row.id,
      eventId: row.event_id,
      code: row.code,
      status: row.status as "unused" | "used",
      participantName: row.participant_name,
      participantEmail: row.participant_email,
      redeemedAt: row.redeemed_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }));
  } catch (error: unknown) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function verifyAttendanceCode(
  eventId: string, 
  code: string, 
  name: string, 
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc("verify_attendance_code", {
      p_event_id: eventId,
      p_code: code,
      p_name: name,
      p_email: email,
    });
    
    if (error) throw error;
    
    if (data) {
      return { success: true, message: "Attendance marked successfully!" };
    } else {
      return { success: false, message: "This code is invalid or has already been used." };
    }
  } catch (error: unknown) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export function codesToCSV(codes: AttendanceCode[], eventTitle: string): string {
  const header = "Code,Status,Redeemed By,Redeemed At\n";
  const rows = codes.map(c => {
    const redeemedBy = c.participantName ? `"${c.participantName} (${c.participantEmail})"` : "";
    const redeemedAt = c.redeemedAt ? `"${new Date(c.redeemedAt).toLocaleString()}"` : "";
    return `${c.code},${c.status},${redeemedBy},${redeemedAt}`;
  });
  return header + rows.join("\n");
}

export async function deleteAttendanceCode(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("attendance_codes").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function deleteAllAttendanceCodes(eventId: string): Promise<void> {
  try {
    const { error } = await supabase.from("attendance_codes").delete().eq("event_id", eventId);
    if (error) throw error;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}
