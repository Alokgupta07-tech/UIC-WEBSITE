import { supabase } from "@/integrations/supabase/client";
import type { SiteSettings, SocialLinks } from "@/types";

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  instagram: null,
  linkedin: null,
  youtube: null,
  whatsappCommunity: null,
};

export const DEFAULT_SETTINGS: SiteSettings = {
  communityMemberCount: 0,
  social: DEFAULT_SOCIAL_LINKS,
  siteUrl: null,
  siteOgImage: null,
};

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from("site_settings").select("*");
  if (error || !data) return DEFAULT_SETTINGS;

  const getVal = (key: string) => data.find((row) => row.key === key)?.value || null;

  return {
    communityMemberCount: parseInt(getVal("community_members") || "0", 10),
    social: {
      instagram: getVal("instagram_url"),
      linkedin: getVal("linkedin_url"),
      youtube: getVal("youtube_url"),
      whatsappCommunity: getVal("whatsapp_url"),
    },
    siteUrl: getVal("site_url"),
    siteOgImage: getVal("site_og_image"),
  };
}

export async function updateSettings(input: {
  community_member_count?: number;
  instagram?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  whatsapp_community?: string | null;
  site_og_image?: string | null;
  site_url?: string | null;
}) {
  const { data: existing } = await supabase.from("site_settings").select("*");
  const existingMap = new Map(existing?.map(e => [e.key, e]) || []);
  
  const upserts = [
    { key: "community_members", value: String(input.community_member_count ?? 0), label: existingMap.get("community_members")?.label || "WhatsApp Community Members" },
    { key: "instagram_url", value: input.instagram || "", label: existingMap.get("instagram_url")?.label || "Instagram URL" },
    { key: "linkedin_url", value: input.linkedin || "", label: existingMap.get("linkedin_url")?.label || "LinkedIn URL" },
    { key: "youtube_url", value: input.youtube || "", label: existingMap.get("youtube_url")?.label || "YouTube URL" },
    { key: "whatsapp_url", value: input.whatsapp_community || "", label: existingMap.get("whatsapp_url")?.label || "WhatsApp URL" },
    { key: "site_url", value: input.site_url || "", label: existingMap.get("site_url")?.label || "Site URL" },
    { key: "site_og_image", value: input.site_og_image || "", label: existingMap.get("site_og_image")?.label || "OG Image" },
  ];

  const { error } = await supabase.from("site_settings").upsert(upserts, { onConflict: "key" });
  if (error) throw error;
  
  return true;
}

