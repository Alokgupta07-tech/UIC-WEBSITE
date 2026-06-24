/**
 * User Management Service
 *
 * SECURITY NOTE:
 * - These functions only work because the calling user is a verified admin
 *   (checked via user_roles at page load in Admin.tsx).
 * - RLS policies on user_roles allow admins to manage all roles.
 * - Never expose the Admin tab/page to non-admin users.
 * - The Super Admin (agupta88094@gmail.com) is permanently protected.
 */

import { supabase } from "@/integrations/supabase/client";
import { isSuperAdmin } from "@/config/superAdmin";

export interface AdminUser {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: "admin" | "super_admin";
}

export interface RegisteredUser {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  createdAt: string | null;
}

/** Fetch all users who have the 'admin' role, joined with their profile. */
export async function getAdmins(): Promise<AdminUser[]> {
  try {
    // Step 1: Get all user_ids from user_roles where role = 'admin'
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) throw rolesError;

    const userIds = (rolesData ?? []).map((row: any) => row.user_id);
    if (userIds.length === 0) return [];

    // Step 2: Get profiles where user_id IN those ids
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    if (profilesError) throw profilesError;

    // Merge results
    return userIds.map((userId: string) => {
      const profile = (profilesData ?? []).find((p: any) => p.user_id === userId);
      return {
        userId,
        fullName: profile?.full_name ?? null,
        email: profile?.email ?? null,
        role: isSuperAdmin(profile?.email) ? "super_admin" : "admin",
      };
    });
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

/** Fetch up to 20 most recent registered users from profiles. */
export async function getAllUsers(): Promise<RegisteredUser[]> {
  try {
    // Step 1: Get profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (profilesError) throw profilesError;

    const profiles = profilesData ?? [];
    if (profiles.length === 0) return [];

    // Step 2: Get user_roles for those user_ids
    const userIds = profiles.map((p: any) => p.user_id ?? p.id).filter(Boolean);
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    if (rolesError) throw rolesError;

    const rolesMap = new Map<string, string>();
    (rolesData ?? []).forEach((r: any) => {
      if (r.role) rolesMap.set(r.user_id, r.role);
    });

    return profiles.map((row: any) => {
      const uid = row.user_id ?? row.id;
      const dbRole = rolesMap.get(uid) ?? null;
      return {
        id: row.id,
        userId: uid,
        fullName: row.full_name ?? null,
        email: row.email ?? null,
        role: isSuperAdmin(row.email) ? "super_admin" : dbRole,
        createdAt: row.created_at ?? null,
      };
    });
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

/**
 * Promote a user to admin by their email address.
 * Looks up the user in profiles, then inserts an admin role.
 * Uses onConflict: "do nothing" to avoid duplicates.
 */
export async function promoteToAdmin(email: string): Promise<void> {
  try {
    // Step 1: Find user by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      throw new Error("No user found with that email. They must sign in first.");
    }

    const userId = (profile as any).user_id ?? (profile as any).id;

    // Step 2: Insert admin role (on conflict do nothing)
    const { error: insertError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });

    if (insertError) throw insertError;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

/** Remove the admin role from a user. Protected: cannot remove super admin. */
export async function removeAdmin(userId: string): Promise<void> {
  try {
    // Guard: look up email for this userId to check super admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .maybeSingle();

    if (isSuperAdmin(profile?.email)) {
      throw new Error("Super Admin cannot be modified or removed.");
    }

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) throw error;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}
