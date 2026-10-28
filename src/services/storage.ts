import { supabase } from "@/integrations/supabase/client";

const BUCKET = "event-media";

function uniquePath(folder: string, file: File): string {
  const ext = file.type === "image/webp" ? "webp" : file.name.split(".").pop() || "bin";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const safe = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24);
  return `${folder}/${stamp}-${rand}-${safe}.${ext}`;
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { return file; }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp", lastModified: file.lastModified });
  } finally { bitmap.close(); }
}

/** Uploads to the `event-media` bucket and returns its public URL. */
export async function uploadMedia(
  file: File,
  folder: "events" | "gallery" | "team"
): Promise<string> {
  const optimizedFile = await compressImage(file);
  const path = uniquePath(folder, optimizedFile);
  const { error } = await supabase.storage.from(BUCKET).upload(path, optimizedFile, {
    cacheControl: "3600",
    upsert: false,
    contentType: optimizedFile.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export const uploadEventBanner = (file: File) => uploadMedia(file, "events");
export const uploadGalleryMedia = (file: File) => uploadMedia(file, "gallery");
export const uploadTeamPhoto = (file: File) => uploadMedia(file, "team");
