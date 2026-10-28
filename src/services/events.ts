// Supabase query helpers for events.
// All reads here are subject to RLS (public sees only published).
import { supabase } from "@/integrations/supabase/client";
import type { ClubEvent } from "@/types";
import type { ContestStatus } from "@/types";
import { isMissingTableError } from "@/services/supabaseErrors";
import { isPast } from "date-fns";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  event_date: string;
  end_date: string | null;
  venue: string | null;
  location: string | null;
  is_online: boolean | null;
  meeting_link: string | null;
  image_url: string | null;
  max_participants: number | null;
  registration_deadline: string | null;
  is_published: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  event_categories: { id: string; name: string; color: string | null } | null;
  // Contest fields
  event_type: string | null;
  contest_status: string | null;
  is_submissions_open: boolean | null;
  is_ratings_open: boolean | null;
  is_gallery_published: boolean | null;
  is_leaderboard_published: boolean | null;
  submission_open_at: string | null;
  submission_close_at: string | null;
  rating_open_at: string | null;
  rating_close_at: string | null;
  min_ratings_for_ranking: number | null;
  external_registration_url: string | null;
  unstop_registration_link: string | null;
};

const selectWithCategory = "*, event_categories:category_id(id, name, color)";

function mapEvent(row: EventRow): ClubEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    shortDescription: row.short_description,
    bannerImage: row.image_url ?? null,
    eventDate: row.event_date,
    endDate: row.end_date,
    venue: row.venue,
    location: row.location,
    isOnline: row.is_online,
    meetingLink: row.meeting_link,
    maxParticipants: row.max_participants,
    registrationDeadline: row.registration_deadline,
    isPublished: row.is_published,
    isUpcoming: row.is_published ? !isPast(new Date(row.event_date)) : false,
    status: row.is_published ? "published" : "draft",
    unstopRegistrationLink: row.unstop_registration_link ?? row.meeting_link,
    category: row.event_categories
      ? {
          id: row.event_categories.id,
          name: row.event_categories.name,
          color: row.event_categories.color,
        }
      : null,
    createdAt: row.created_at,
    // Contest fields
    eventType: row.event_type,
    contestStatus: row.contest_status as ContestStatus | null,
    isSubmissionsOpen: row.is_submissions_open,
    isRatingsOpen: row.is_ratings_open,
    isGalleryPublished: row.is_gallery_published,
    isLeaderboardPublished: row.is_leaderboard_published,
    submissionOpenAt: row.submission_open_at,
    submissionCloseAt: row.submission_close_at,
    ratingOpenAt: row.rating_open_at,
    ratingCloseAt: row.rating_close_at,
    minRatingsForRanking: row.min_ratings_for_ranking,
    externalRegistrationUrl: row.external_registration_url,
  };
}

export async function getPublishedEvents(): Promise<ClubEvent[]> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select(selectWithCategory)
      .eq("is_published", true)
      .order("event_date", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as unknown as EventRow[]).map(mapEvent);
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function getEvents(): Promise<ClubEvent[]> {
  return getPublishedEvents();
}

export function getEventById(id: string): Promise<ClubEvent | null> {
  return getEvent(id);
}

export async function getEvent(id: string): Promise<ClubEvent | null> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select(selectWithCategory)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return null;
      throw error;
    }
    if (!data) return null;
    return mapEvent(data as unknown as EventRow);
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

// --- Admin (also RLS-gated to admins server-side) ---
export async function getAllEventsAdmin(): Promise<ClubEvent[]> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select(selectWithCategory)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data as unknown as EventRow[]).map(mapEvent);
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export type EventInput = {
  title: string;
  description?: string | null;
  short_description?: string | null;
  category_id?: string | null;
  event_date: string;
  end_date?: string | null;
  venue?: string | null;
  location?: string | null;
  is_online?: boolean | null;
  meeting_link?: string | null;
  image_url?: string | null;
  max_participants?: number | null;
  registration_deadline?: string | null;
  event_type?: string | null;
  contest_status?: string | null;
  is_submissions_open?: boolean | null;
  is_ratings_open?: boolean | null;
  is_leaderboard_published?: boolean | null;
  unstop_registration_link?: string | null;
};

export async function createEvent(input: EventInput, createdBy: string) {
  try {
    const safeInput = {
      title: input.title,
      description: input.description ?? null,
      short_description: input.short_description ?? null,
      category_id: input.category_id ?? null,
      event_date: input.event_date,
      end_date: input.end_date ?? null,
      venue: input.venue ?? null,
      location: input.location ?? null,
      is_online: input.is_online ?? false,
      meeting_link: input.meeting_link ?? null,
      image_url: input.image_url ?? null,
      max_participants: input.max_participants ?? null,
      registration_deadline: input.registration_deadline ?? null,
      event_type: input.event_type ?? null,
      contest_status: input.contest_status ?? null,
      is_submissions_open: input.is_submissions_open ?? false,
      is_ratings_open: input.is_ratings_open ?? false,
      is_leaderboard_published: input.is_leaderboard_published ?? false,
      unstop_registration_link: input.unstop_registration_link ?? null,
      is_published: true,
      created_by: createdBy,
    };

    const { data, error } = await supabase
      .from("events")
      .insert(safeInput)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function updateEvent(id: string, input: Partial<EventInput>) {
  try {
    const safeInput: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) safeInput.title = input.title;
    if (input.description !== undefined) safeInput.description = input.description;
    if (input.short_description !== undefined) safeInput.short_description = input.short_description;
    if (input.category_id !== undefined) safeInput.category_id = input.category_id;
    if (input.event_date !== undefined) safeInput.event_date = input.event_date;
    if (input.end_date !== undefined) safeInput.end_date = input.end_date;
    if (input.venue !== undefined) safeInput.venue = input.venue;
    if (input.location !== undefined) safeInput.location = input.location;
    if (input.is_online !== undefined) safeInput.is_online = input.is_online;
    if (input.meeting_link !== undefined) safeInput.meeting_link = input.meeting_link;
    if (input.image_url !== undefined) safeInput.image_url = input.image_url;
    if (input.max_participants !== undefined) safeInput.max_participants = input.max_participants;
    if (input.registration_deadline !== undefined) safeInput.registration_deadline = input.registration_deadline;
    if (input.event_type !== undefined) safeInput.event_type = input.event_type;
    if (input.contest_status !== undefined) safeInput.contest_status = input.contest_status;
    if (input.is_submissions_open !== undefined) safeInput.is_submissions_open = input.is_submissions_open;
    if (input.is_ratings_open !== undefined) safeInput.is_ratings_open = input.is_ratings_open;
    if (input.is_leaderboard_published !== undefined) safeInput.is_leaderboard_published = input.is_leaderboard_published;
    if (input.unstop_registration_link !== undefined) safeInput.unstop_registration_link = input.unstop_registration_link;

    const { data, error } = await supabase
      .from("events")
      .update(safeInput)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}

export async function deleteEvent(id: string) {
  try {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("Error:", JSON.stringify(error));
    throw error;
  }
}
