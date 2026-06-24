import { supabase } from "@/integrations/supabase/client";
import type { EventCategory } from "@/types";
import { isMissingTableError } from "@/services/supabaseErrors";

type CategoryRow = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
};

export async function getCategories(): Promise<EventCategory[]> {
  const { data, error } = await supabase
    .from("event_categories")
    .select("*")
    .order("name");
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data as unknown as CategoryRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    description: r.description,
  }));
}
