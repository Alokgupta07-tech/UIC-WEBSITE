import { supabase } from "@/integrations/supabase/client";
import type { SiteSettings, SocialLinks } from "@/types";

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  instagram: null,
  linkedin: null,
};

export const DEFAULT_SETTINGS: SiteSettings = {
  communityMemberCount: 1200,
  social: DEFAULT_SOCIAL_LINKS,
  siteUrl: null,
  siteOgImage: null,
};

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from("site_settings").select("*");
  if (error || !data || data.length === 0) return DEFAULT_SETTINGS;

  const getVal = (key: string): string | null => {
    const row = data.find((r) => r.key === key);
    if (!row) return null;
    // Return the stored value even if it's an empty string — only return null
    // when the key itself doesn't exist in the database.
    return row.value;
  };

  const rawCount = getVal("community_members");
  const parsed = rawCount !== null ? parseInt(rawCount, 10) : NaN;

  return {
    communityMemberCount: Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : DEFAULT_SETTINGS.communityMemberCount,
    social: {
      instagram: getVal("instagram_url"),
      linkedin: getVal("linkedin_url"),
    },
    siteUrl: getVal("site_url"),
    siteOgImage: getVal("site_og_image"),
  };
}

export async function updateSettings(input: {
  community_member_count?: number;
  instagram?: string | null;
  linkedin?: string | null;
  site_og_image?: string | null;
  site_url?: string | null;
}) {
  const { data: existing } = await supabase.from("site_settings").select("*");
  const existingMap = new Map(existing?.map(e => [e.key, e]) || []);
  
  const upserts = [
    { key: "community_members", value: String(input.community_member_count ?? DEFAULT_SETTINGS.communityMemberCount), label: existingMap.get("community_members")?.label || "Community Members" },
    { key: "instagram_url", value: input.instagram || "", label: existingMap.get("instagram_url")?.label || "Instagram URL" },
    { key: "linkedin_url", value: input.linkedin || "", label: existingMap.get("linkedin_url")?.label || "LinkedIn URL" },
    { key: "site_url", value: input.site_url || "", label: existingMap.get("site_url")?.label || "Site URL" },
    { key: "site_og_image", value: input.site_og_image || "", label: existingMap.get("site_og_image")?.label || "OG Image" },
  ];

  const { error } = await supabase.from("site_settings").upsert(upserts, { onConflict: "key" });
  if (error) throw error;
  
  return true;
}
