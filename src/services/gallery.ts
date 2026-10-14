import { supabase } from "@/integrations/supabase/client";
import type { EventGalleryItem, MediaType } from "@/types";
import { isMissingTableError } from "@/services/supabaseErrors";

/**
 * Row shape as returned by Supabase for event_gallery.
 *
 * The live table may have BOTH old columns (image_url, uploaded_at) AND new ones
 * (media_url, created_at) depending on which migrations ran.  We accept both
 * here so the mapper always has data to work with.
 */
type GalleryRow = {
  id: string;
  event_id: string | null;
  image_url: string | null;
  media_url: string;
  media_type: string | null;
  album: string | null;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string | null;
  uploaded_at: string | null;
};

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "ogg", "ogv", "mkv"];

/** Classify a URL/filename as "image" or "video" based on its extension. */
export function detectMediaType(fileNameOrUrl: string): MediaType {
  const ext = fileNameOrUrl.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.includes(ext) ? "video" : "image";
}

/**
 * Fix storage URLs that are missing the `/public/` segment.
 *
 * Supabase public storage URLs MUST contain `/object/public/`.
 * Old code or manual inserts may have stored URLs as
 *   …/storage/v1/object/{bucket}/file.jpg          ← broken (400)
 *   …/storage/v1/object/public/{bucket}/file.jpg   ← correct
 *
 * This helper patches the URL in-place so existing DB rows keep working.
 */
export function sanitizeMediaUrl(url: string): string {
  if (!url) return url;
  // Already has /public/ — good.
  if (url.includes("/object/public/")) return url;
  // Missing /public/ — insert it.
  return url.replace(/\/object\//, "/object/public/");
}

/**
 * Pick the best image URL from a row.
 * Prefer `image_url` (NOT NULL on live DB), fall back to `media_url`.
 */
function pickImageUrl(row: GalleryRow): string {
  const url = row.image_url || row.media_url;
  return sanitizeMediaUrl(url);
}

function mapItem(row: GalleryRow): EventGalleryItem {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: null,
    mediaUrl: pickImageUrl(row),
    mediaType: (row.media_type === "video" ? "video" : "image") as MediaType,
    album: row.album?.trim() || "General",
    caption: row.caption,
    createdAt: row.uploaded_at || row.created_at,
  };
}

export async function getGallery(): Promise<EventGalleryItem[]> {
  try {
    // Prefer uploaded_at (guaranteed on live DB); fall back to created_at.
    let { data, error } = await supabase
      .from("event_gallery")
      .select("*")
      .order("uploaded_at", { ascending: false });

    // uploaded_at might not exist — fall back to created_at
    if (error && error.code === "42703") {
      ({ data, error } = await supabase
        .from("event_gallery")
        .select("*")
        .order("created_at", { ascending: false }));
    }

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as unknown as GalleryRow[]).map(mapItem);
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function createGalleryItem(input: {
  image_url: string;
  media_url: string;
  caption?: string | null;
  album?: string | null;
  media_type?: MediaType | null;
  event_id?: string | null;
  uploaded_by?: string | null;
}) {
  const sanitizedUrl = sanitizeMediaUrl(input.media_url);
  try {
    const { data, error } = await supabase
      .from("event_gallery")
      .insert({
        image_url: sanitizedUrl,
        media_url: sanitizedUrl,
        caption: input.caption ?? null,
        album: input.album?.trim() || "General",
        media_type: input.media_type ?? detectMediaType(input.media_url),
        event_id: input.event_id ?? null,
        uploaded_by: input.uploaded_by ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function deleteGalleryItem(id: string) {
  try {
    const { error } = await supabase.from("event_gallery").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

/**
 * Upload a file to the public "event-media" Storage bucket and return its public URL.
 *
 * Uses raw XHR against the Supabase Storage REST endpoint so we get real upload
 * progress events (the installed storage-js `.upload()` typings expose no progress
 * callback). Authenticated with the admin's access token so the bucket's RLS write
 * policy passes. `onProgress` receives a 0–100 percentage.
 *
 * Files are stored under a `gallery/` prefix to keep them organised alongside
 * other bucket content (events, team photos, …).
 */
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_").slice(0, 24);
  const fileName = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.${fileExt}`;
  const bucket = "event-media";

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? supabaseKey;

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", supabaseKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName);
        resolve(pub.publicUrl);
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
