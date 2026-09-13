import { supabase } from "@/integrations/supabase/client";
import type { CertifiedStudent } from "@/types";

export async function getCertifiedStudents(): Promise<CertifiedStudent[]> {
  const { data, error } = await supabase
    .from("certified_students")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  return data.map(mapToCertifiedStudent);
}

export async function getAllCertifiedStudentsAdmin(): Promise<CertifiedStudent[]> {
  const { data, error } = await supabase
    .from("certified_students")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  return data.map(mapToCertifiedStudent);
}

export async function createCertifiedStudent(input: Omit<CertifiedStudent, "id">) {
  const { error } = await supabase.from("certified_students").insert({
    name: input.name,
    department: input.department,
    year: input.year,
    achievement: input.achievement,
    event: input.event,
    position: input.position,
    image_url: input.imageUrl,
    linkedin_url: input.linkedInUrl,
    display_order: input.displayOrder,
    is_active: input.isActive,
  });

  if (error) throw error;
  return true;
}

export async function updateCertifiedStudent(id: string, input: Partial<CertifiedStudent>) {
  const updateData: Record<string, any> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.department !== undefined) updateData.department = input.department;
  if (input.year !== undefined) updateData.year = input.year;
  if (input.achievement !== undefined) updateData.achievement = input.achievement;
  if (input.event !== undefined) updateData.event = input.event;
  if (input.position !== undefined) updateData.position = input.position;
  if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
  if (input.linkedInUrl !== undefined) updateData.linkedin_url = input.linkedInUrl;
  if (input.displayOrder !== undefined) updateData.display_order = input.displayOrder;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;
  
  const { error } = await supabase
    .from("certified_students")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteCertifiedStudent(id: string) {
  const { error } = await supabase
    .from("certified_students")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

// Helper to map DB row to frontend type
function mapToCertifiedStudent(row: any): CertifiedStudent {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    year: row.year,
    achievement: row.achievement,
    event: row.event,
    position: row.position,
    imageUrl: row.image_url,
    linkedInUrl: row.linkedin_url,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}
