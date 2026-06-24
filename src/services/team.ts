import { supabase } from "@/integrations/supabase/client";
import type { TeamMember } from "@/types";
import { isMissingTableError } from "@/services/supabaseErrors";

type TeamRow = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  unstop_profile_url: string | null;
  skills: string[] | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  display_order: number | null;
};

function mapMember(row: TeamRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    linkedinUrl: row.linkedin_url,
    githubUrl: row.github_url,
    unstopProfileUrl: row.unstop_profile_url,
    skills: row.skills,
    isActive: row.is_active,
    isVerified: row.is_verified,
    displayOrder: row.display_order,
  };
}

export async function getActiveTeam(): Promise<TeamMember[]> {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true, nullsFirst: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as unknown as TeamRow[]).map(mapMember);
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function getAllTeamAdmin(): Promise<TeamMember[]> {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as unknown as TeamRow[]).map(mapMember);
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export type TeamInput = {
  name: string;
  role: string;
  department?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  unstop_profile_url?: string | null;
  skills?: string[] | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  display_order?: number | null;
};

export async function createTeamMember(input: TeamInput) {
  try {
    const safeInput = {
      name: input.name ?? null,
      role: input.role ?? null,
      department: input.department ?? null,
      bio: input.bio ?? null,
      avatar_url: input.avatar_url ?? null,
      linkedin_url: input.linkedin_url ?? null,
      github_url: input.github_url ?? null,
      unstop_profile_url: input.unstop_profile_url ?? null,
      skills: input.skills ?? null,
      is_active: input.is_active ?? null,
      is_verified: input.is_verified ?? null,
      display_order: input.display_order ?? null,
    };

    const { data, error } = await supabase
      .from("team_members")
      .insert(safeInput)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function updateTeamMember(id: string, input: Partial<TeamInput>) {
  try {
    const safeInput: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) safeInput.name = input.name;
    if (input.role !== undefined) safeInput.role = input.role;
    if (input.department !== undefined) safeInput.department = input.department;
    if (input.bio !== undefined) safeInput.bio = input.bio;
    if (input.avatar_url !== undefined) safeInput.avatar_url = input.avatar_url;
    if (input.linkedin_url !== undefined) safeInput.linkedin_url = input.linkedin_url;
    if (input.github_url !== undefined) safeInput.github_url = input.github_url;
    if (input.unstop_profile_url !== undefined) safeInput.unstop_profile_url = input.unstop_profile_url;
    if (input.skills !== undefined) safeInput.skills = input.skills;
    if (input.is_active !== undefined) safeInput.is_active = input.is_active;
    if (input.is_verified !== undefined) safeInput.is_verified = input.is_verified;
    if (input.display_order !== undefined) safeInput.display_order = input.display_order;

    const { data, error } = await supabase
      .from("team_members")
      .update(safeInput)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function deleteTeamMember(id: string) {
  try {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}
