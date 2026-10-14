import { supabase } from "@/integrations/supabase/client";

const BUCKET = "event-media";

function uniquePath(folder: string, file: File): string {
  const ext = file.name.split(".").pop() || "bin";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const safe = file.name.replace(/[^a-zA-Z0-9.]/g, "_").slice(0, 24);
  return `${folder}/${stamp}-${rand}-${safe}.${ext}`;
}

/** Uploads to the `event-media` bucket and returns its public URL. */
export async function uploadMedia(
  file: File,
  folder: "events" | "gallery" | "team"
): Promise<string> {
  const path = uniquePath(folder, file);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export const uploadEventBanner = (file: File) => uploadMedia(file, "events");
export const uploadGalleryMedia = (file: File) => uploadMedia(file, "gallery");
export const uploadTeamPhoto = (file: File) => uploadMedia(file, "team");
