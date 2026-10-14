/**
 * Contest service — All database operations for the Vibe Coding Contest
 * Handles participants, submissions, ratings, and leaderboard
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  ContestParticipant,
  ContestSubmission,
  ContestSubmissionWithDetails,
  ContestRating,
  ContestLeaderboardEntry,
  UserContestStatus,
  ContestModerationLog,
  VerificationStatus,
  SubmissionStatus,
} from "@/types";

// ============================================================================
// PARTICIPANT VERIFICATION
// ============================================================================

export async function getContestParticipant(eventId: string, userId: string) {
  const { data, error } = await supabase
    .from("contest_participants")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapParticipant(data) : null;
}

export async function getAllContestParticipants(eventId: string) {
  const { data, error } = await supabase
    .from("contest_participants")
    .select(`
      *,
      verified_by_profile:profiles!verified_by(full_name),
      user_profile:profiles!user_id(full_name, email, avatar_url)
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data?.map(mapParticipant) || [];
}

export async function createVerificationClaim(params: {
  eventId: string;
  userId: string;
  unstopRegistrationId: string;
  unstopEmail: string;
  participantName: string;
}) {
  const { data, error } = await supabase
    .from("contest_participants")
    .insert({
      event_id: params.eventId,
      user_id: params.userId,
      unstop_registration_id: params.unstopRegistrationId,
      participant_email: params.unstopEmail.trim().toLowerCase(),
      participant_name: params.participantName.trim(),
      verification_status: "pending",
      verification_source: "user_claim",
    })
    .select()
    .single();

  if (error) throw error;
  return mapParticipant(data);
}

export async function linkParticipantToUser(eventId: string, userEmail: string) {
  const { data, error } = await supabase.rpc("link_contest_participant_to_user", {
    p_event_id: eventId,
    p_user_email: userEmail,
  });

  if (error) throw error;
  return data;
}

// ============================================================================
// SUBMISSIONS
// ============================================================================

export async function getUserSubmission(eventId: string, userId: string) {
  const { data, error } = await supabase
    .from("contest_submissions")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSubmission(data) : null;
}

export async function getSubmissionById(submissionId: string) {
  const { data, error } = await supabase.rpc("get_contest_submission_with_details", {
    p_submission_id: submissionId,
  });

  if (error) throw error;
  return data?.[0] ? mapSubmissionWithDetails(data[0]) : null;
}

export async function getAllSubmissions(eventId: string, filters?: {
  status?: SubmissionStatus;
  searchQuery?: string;
  sortBy?: 'newest' | 'highest_rated' | 'most_rated';
}) {
  let query = supabase
    .from("contest_submissions")
    .select(`
      *,
      profiles!user_id(full_name, avatar_url)
    `)
    .eq("event_id", eventId);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    // Default to approved for public gallery
    query = query.eq("status", "approved");
  }

  if (filters?.searchQuery) {
    query = query.or(`project_name.ilike.%${filters.searchQuery}%`);
  }

  // Apply sorting
  switch (filters?.sortBy) {
    case 'highest_rated':
      query = query.order("avg_rating", { ascending: false });
      break;
    case 'most_rated':
      query = query.order("rating_count", { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order("submitted_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) throw error;
  return data?.map(mapSubmission) || [];
}

export async function submitWebsite(params: {
  eventId: string;
  userId: string;
  projectName: string;
  projectDescription: string;
  liveUrl: string;
  repoUrl?: string | null;
}) {
  const { data, error } = await supabase
    .from("contest_submissions")
    .insert({
      event_id: params.eventId,
      user_id: params.userId,
      project_name: params.projectName.trim(),
      project_description: params.projectDescription.trim(),
      live_url: params.liveUrl.trim(),
      repo_url: params.repoUrl?.trim() || null,
      status: "approved", // Auto-approve by default, admin can moderate later
    })
    .select()
    .single();

  if (error) throw error;
  return mapSubmission(data);
}

export async function updateWebsite(
  submissionId: string,
  params: {
    projectName?: string;
    projectDescription?: string;
    liveUrl?: string;
    repoUrl?: string | null;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (params.projectName !== undefined) updateData.project_name = params.projectName.trim();
  if (params.projectDescription !== undefined) updateData.project_description = params.projectDescription.trim();
  if (params.liveUrl !== undefined) updateData.live_url = params.liveUrl.trim();
  if (params.repoUrl !== undefined) updateData.repo_url = params.repoUrl?.trim() || null;

  const { data, error } = await supabase
    .from("contest_submissions")
    .update(updateData)
    .eq("id", submissionId)
    .select()
    .single();

  if (error) throw error;
  return mapSubmission(data);
}

// ============================================================================
// RATINGS
// ============================================================================

export async function submitRating(params: {
  eventId: string;
  submissionId: string;
  reviewerId: string;
  score: number;
}) {
  const { data, error } = await supabase
    .from("contest_ratings")
    .insert({
      event_id: params.eventId,
      submission_id: params.submissionId,
      reviewer_id: params.reviewerId,
      score: params.score,
    })
    .select()
    .single();

  if (error) throw error;
  return mapRating(data);
}

export async function getUserRatingForSubmission(
  submissionId: string,
  reviewerId: string
) {
  const { data, error } = await supabase
    .from("contest_ratings")
    .select("*")
    .eq("submission_id", submissionId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRating(data) : null;
}

export async function getUserRatings(eventId: string, reviewerId: string) {
  const { data, error } = await supabase
    .from("contest_ratings")
    .select(`
      *,
      contest_submissions!submission_id(project_name, user_id, profiles!user_id(full_name))
    `)
    .eq("event_id", eventId)
    .eq("reviewer_id", reviewerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data?.map(mapRating) || [];
}

export async function getSubmissionRatings(submissionId: string) {
  const { data, error } = await supabase
    .from("contest_ratings")
    .select("*")
    .eq("submission_id", submissionId)
    .eq("is_valid", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data?.map(mapRating) || [];
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export async function getContestLeaderboard(eventId: string, limit: number = 5) {
  const { data, error } = await supabase.rpc("get_contest_leaderboard", {
    p_event_id: eventId,
    p_limit: limit,
  });

  if (error) throw error;
  return data?.map(mapLeaderboardEntry) || [];
}

// ============================================================================
// USER STATUS
// ============================================================================

export async function getUserContestStatus(eventId: string, userId: string) {
  const { data, error } = await supabase.rpc("get_user_contest_status", {
    p_event_id: eventId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data?.[0] ? mapUserStatus(data[0]) : null;
}

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

export async function updateParticipantVerification(
  participantId: string,
  status: VerificationStatus,
  adminNote?: string,
  adminId?: string
) {
  const updateData: Record<string, unknown> = {
    verification_status: status,
    rejection_or_admin_note: adminNote || null,
  };

  if (status === "verified") {
    updateData.verified_at = new Date().toISOString();
    updateData.verified_by = adminId;
  }

  const { data, error } = await supabase
    .from("contest_participants")
    .update(updateData)
    .eq("id", participantId)
    .select()
    .single();

  if (error) throw error;
  return mapParticipant(data);
}

export async function moderateSubmission(
  submissionId: string,
  status: SubmissionStatus,
  reason?: string,
  adminId?: string
) {
  const { data, error } = await supabase
    .from("contest_submissions")
    .update({
      status,
      moderation_reason: reason || null,
      moderated_by: adminId,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .select()
    .single();

  if (error) throw error;
  return mapSubmission(data);
}

export async function invalidateRating(
  ratingId: string,
  isValid: boolean,
  reason: string,
  adminId: string
) {
  const { data, error } = await supabase
    .from("contest_ratings")
    .update({
      is_valid: isValid,
      moderation_reason: reason,
      moderated_by: adminId,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", ratingId)
    .select()
    .single();

  if (error) throw error;
  return mapRating(data);
}

export async function logModerationAction(log: Omit<ContestModerationLog, "id" | "createdAt">) {
  const { data, error } = await supabase
    .from("contest_moderation_logs")
    .insert({
      event_id: log.eventId,
      admin_id: log.adminId,
      target_type: log.targetType,
      target_id: log.targetId,
      action: log.action,
      reason: log.reason,
      metadata: log.metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function importUnstopParticipantsCSV(
  eventId: string,
  csvData: Array<{
    email: string;
    name: string;
    unstopId?: string;
  }>,
  adminId: string
) {
  const records = csvData.map((row) => ({
    event_id: eventId,
    participant_email: row.email.trim().toLowerCase(),
    participant_name: row.name.trim(),
    unstop_registration_id: row.unstopId?.trim() || null,
    verification_status: "verified" as const,
    verification_source: "csv_import" as const,
    verified_by: adminId,
    verified_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("contest_participants")
    .upsert(records, {
      onConflict: "event_id,participant_email",
      ignoreDuplicates: false,
    })
    .select();

  if (error) throw error;

  // Attempt to link to existing user accounts
  for (const record of data) {
    try {
      await linkParticipantToUser(eventId, record.participant_email);
    } catch {
      // Ignore linking errors - user may not have signed up yet
    }
  }

  return {
    totalImported: data.length,
    records: data.map(mapParticipant),
  };
}

// ============================================================================
// MAPPERS (DB -> Domain Types)
// ============================================================================

function mapParticipant(row: Record<string, unknown>): ContestParticipant {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    userId: (row.user_id as string) || null,
    unstopRegistrationId: (row.unstop_registration_id as string) || null,
    participantEmail: row.participant_email as string,
    participantName: row.participant_name as string,
    verificationStatus: row.verification_status as VerificationStatus,
    verificationSource: row.verification_source as string,
    verifiedBy: (row.verified_by as string) || null,
    verifiedAt: (row.verified_at as string) || null,
    rejectionOrAdminNote: (row.rejection_or_admin_note as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSubmission(row: Record<string, unknown>): ContestSubmission {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    userId: row.user_id as string,
    projectName: row.project_name as string,
    projectDescription: row.project_description as string,
    liveUrl: row.live_url as string,
    repoUrl: (row.repo_url as string) || null,
    status: row.status as SubmissionStatus,
    moderationReason: (row.moderation_reason as string) || null,
    moderatedBy: (row.moderated_by as string) || null,
    moderatedAt: (row.moderated_at as string) || null,
    adminOverrideEditAllowed: (row.admin_override_edit_allowed as boolean) || false,
    avgRating: Number(row.avg_rating) || 0,
    ratingCount: Number(row.rating_count) || 0,
    submittedAt: row.submitted_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSubmissionWithDetails(row: Record<string, unknown>): ContestSubmissionWithDetails {
  return {
    ...mapSubmission(row),
    participantName: row.participant_name as string,
    participantEmail: (row.participant_email as string) || null,
    participantAvatar: (row.participant_avatar as string) || null,
    verificationStatus: (row.verification_status as VerificationStatus) || null,
    userHasRated: (row.user_has_rated as boolean) || false,
  };
}

function mapRating(row: Record<string, unknown>): ContestRating {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    submissionId: row.submission_id as string,
    reviewerId: row.reviewer_id as string,
    score: Number(row.score),
    isValid: (row.is_valid as boolean) || true,
    moderationReason: (row.moderation_reason as string) || null,
    moderatedBy: (row.moderated_by as string) || null,
    moderatedAt: (row.moderated_at as string) || null,
    createdAt: row.created_at as string,
  };
}

function mapLeaderboardEntry(row: Record<string, unknown>): ContestLeaderboardEntry {
  return {
    rank: Number(row.rank),
    submissionId: row.submission_id as string,
    projectName: row.project_name as string,
    participantName: row.participant_name as string,
    participantId: row.participant_id as string,
    liveUrl: row.live_url as string,
    repoUrl: (row.repo_url as string) || null,
    avgRating: Number(row.avg_rating),
    ratingCount: Number(row.rating_count),
    submittedAt: row.submitted_at as string,
    isProvisional: (row.is_provisional as boolean) || false,
  };
}

function mapUserStatus(row: Record<string, unknown>): UserContestStatus {
  return {
    isVerified: (row.is_verified as boolean) || false,
    verificationStatus: (row.verification_status as VerificationStatus) || null,
    hasSubmitted: (row.has_submitted as boolean) || false,
    submissionId: (row.submission_id as string) || null,
    currentRank: row.current_rank ? Number(row.current_rank) : null,
    totalRanked: Number(row.total_ranked) || 0,
    websitesRated: Number(row.websites_rated) || 0,
    eligibleToRate: Number(row.eligible_to_rate) || 0,
  };
}
