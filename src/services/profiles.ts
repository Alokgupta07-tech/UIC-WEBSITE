import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  skills: string[] | null;
  created_at: string | null;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    bio: row.bio,
    skills: row.skills,
    createdAt: row.created_at,
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, bio, skills, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as unknown as ProfileRow);
}

export async function updateProfile(
  userId: string,
  input: { bio?: string | null; skills?: string[] | null; avatar_url?: string | null }
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
