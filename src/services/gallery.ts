import { supabase } from "@/integrations/supabase/client";
import type { EventGalleryItem } from "@/types";
import { isMissingTableError } from "@/services/supabaseErrors";

type GalleryRow = {
  id: string;
  event_id: string | null;
  image_url: string;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
};

function mapItem(row: GalleryRow): EventGalleryItem {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: null,
    mediaUrl: row.image_url,
    mediaType: "image" as EventGalleryItem["mediaType"],
    caption: row.caption,
    createdAt: row.uploaded_at,
  };
}

export async function getGallery(): Promise<EventGalleryItem[]> {
  try {
    const { data, error } = await supabase
      .from("event_gallery")
      .select("*")
      .order("uploaded_at", { ascending: false });

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
  caption?: string | null;
  event_id?: string | null;
  uploaded_by?: string | null;
}) {
  try {
    const { data, error } = await supabase
      .from("event_gallery")
      .insert({
        image_url: input.image_url,
        caption: input.caption ?? null,
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
