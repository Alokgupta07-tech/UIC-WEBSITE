import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/** Editable shape of the member's `profiles` row, as used by the edit dialog. */
export interface MemberProfile {
  fullName: string;
  email: string;
  phone: string;
  bio: string;
  linkedinUrl: string;
  unstopProfileUrl: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string | null;
}

export const EMPTY_MEMBER_PROFILE: MemberProfile = {
  fullName: "",
  email: "",
  phone: "",
  bio: "",
  linkedinUrl: "",
  unstopProfileUrl: "",
  role: "Member",
  avatarUrl: null,
  createdAt: null,
};

/** Optional fields that count towards the profile completion indicator. */
const COMPLETION_FIELDS: (keyof MemberProfile)[] = [
  "fullName",
  "email",
  "phone",
  "bio",
  "linkedinUrl",
  "unstopProfileUrl",
];

/** Share of the tracked profile fields that carry a value, as a percentage. */
export function profileCompletion(profile: MemberProfile): number {
  const filled = COMPLETION_FIELDS.filter((field) => {
    const value = profile[field];
    return typeof value === "string" && value.trim().length > 0;
  }).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

export function profileInitials(fullName: string): string {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "U";
}

/**
 * Loads the signed-in member's profile, falling back to their Google identity
 * for any field the `profiles` row does not have yet. Nothing is invented — a
 * field with no stored value comes back as an empty string and is rendered as
 * "Not provided".
 */
export function useMemberProfile(user: User | null) {
  const query = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return { profile: EMPTY_MEMBER_PROFILE, isAdmin: false };

      const [{ data: profileRow, error: profileError }, { data: adminRole, error: roleError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, user_id, full_name, email, phone, bio, linkedin_url, unstop_profile_url, role, avatar_url, created_at"
            )
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
        ]);

      if (profileError) throw profileError;
      if (roleError) throw roleError;

      const metadata = user.user_metadata ?? {};
      const fallbackName =
        (metadata.full_name as string | undefined) ||
        (metadata.name as string | undefined) ||
        (user.email?.split("@")[0] ?? "Member");
      const googleAvatar =
        (metadata.avatar_url as string | undefined) ||
        (metadata.picture as string | undefined) ||
        null;

      const isAdmin = Boolean(adminRole);
      const profile: MemberProfile = {
        fullName: profileRow?.full_name ?? fallbackName,
        email: profileRow?.email ?? user.email ?? "",
        phone: profileRow?.phone ?? "",
        bio: profileRow?.bio ?? "",
        linkedinUrl: profileRow?.linkedin_url ?? "",
        unstopProfileUrl: profileRow?.unstop_profile_url ?? "",
        role: isAdmin ? "Admin" : profileRow?.role ?? "Member",
        avatarUrl: profileRow?.avatar_url ?? googleAvatar,
        createdAt: profileRow?.created_at ?? null,
      };

      return { profile, isAdmin };
    },
  });

  return query;
}

/** Saves the member's own `profiles` row. RLS restricts the write to `auth.uid()`. */
export function useSaveMemberProfile(user: User | null, onSaved?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MemberProfile) => {
      if (!user) return;

      const { data: existing, error: existingError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      const updatePayload = {
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone || null,
        bio: payload.bio || null,
        linkedin_url: payload.linkedinUrl || null,
        unstop_profile_url: payload.unstopProfileUrl || null,
      };

      if (existing) {
        const { error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, ...updatePayload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["dashboard-profile", user?.id] });
      onSaved?.();
    },
    onError: () => {
      toast.error("Failed to update profile.");
    },
  });
}
