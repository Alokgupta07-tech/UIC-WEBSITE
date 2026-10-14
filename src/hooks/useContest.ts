/**
 * React Query hooks for Vibe Coding Contest
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as contestService from "@/services/contest";
import type {
  VerificationStatus,
  SubmissionStatus,
} from "@/types";
import { toast } from "sonner";

// Query keys
export const contestKeys = {
  all: ["contest"] as const,
  participant: (eventId: string, userId: string) => 
    ["contest", "participant", eventId, userId] as const,
  participants: (eventId: string) => 
    ["contest", "participants", eventId] as const,
  submission: (eventId: string, userId: string) => 
    ["contest", "submission", eventId, userId] as const,
  submissionById: (submissionId: string) => 
    ["contest", "submission", submissionId] as const,
  submissions: (eventId: string, filters?: Record<string, unknown>) => 
    ["contest", "submissions", eventId, filters] as const,
  leaderboard: (eventId: string, limit: number) => 
    ["contest", "leaderboard", eventId, limit] as const,
  userStatus: (eventId: string, userId: string) => 
    ["contest", "status", eventId, userId] as const,
  userRatings: (eventId: string, userId: string) => 
    ["contest", "ratings", eventId, userId] as const,
  userRating: (submissionId: string, userId: string) => 
    ["contest", "rating", submissionId, userId] as const,
};

// ============================================================================
// PARTICIPANT HOOKS
// ============================================================================

export function useContestParticipant(eventId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: contestKeys.participant(eventId, user?.id || ""),
    queryFn: () => contestService.getContestParticipant(eventId, user!.id),
    enabled: !!user?.id,
  });
}

export function useAllContestParticipants(eventId: string) {
  return useQuery({
    queryKey: contestKeys.participants(eventId),
    queryFn: () => contestService.getAllContestParticipants(eventId),
  });
}

export function useCreateVerificationClaim() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: contestService.createVerificationClaim,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: contestKeys.participant(variables.eventId, variables.userId),
      });
      toast.success("Verification claim submitted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit verification claim");
    },
  });
}

// ============================================================================
// SUBMISSION HOOKS
// ============================================================================

export function useUserSubmission(eventId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: contestKeys.submission(eventId, user?.id || ""),
    queryFn: () => contestService.getUserSubmission(eventId, user!.id),
    enabled: !!user?.id,
  });
}

export function useSubmissionById(submissionId: string) {
  return useQuery({
    queryKey: contestKeys.submissionById(submissionId),
    queryFn: () => contestService.getSubmissionById(submissionId),
    enabled: !!submissionId,
  });
}

export function useAllSubmissions(
  eventId: string,
  filters?: {
    status?: SubmissionStatus;
    searchQuery?: string;
    sortBy?: 'newest' | 'highest_rated' | 'most_rated';
  }
) {
  return useQuery({
    queryKey: contestKeys.submissions(eventId, filters),
    queryFn: () => contestService.getAllSubmissions(eventId, filters),
  });
}

export function useSubmitWebsite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: contestService.submitWebsite,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: contestKeys.submission(variables.eventId, variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.submissions(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.userStatus(variables.eventId, variables.userId),
      });
      toast.success("Website submitted successfully!");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("You have already submitted a website for this contest");
      } else {
        toast.error(error.message || "Failed to submit website");
      }
    },
  });
}

export function useUpdateWebsite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ submissionId, ...params }: { submissionId: string } & Parameters<typeof contestService.updateWebsite>[1]) =>
      contestService.updateWebsite(submissionId, params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: contestKeys.submission(data.eventId, user?.id || ""),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.submissions(data.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.submissionById(data.id),
      });
      toast.success("Website updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update website");
    },
  });
}

// ============================================================================
// RATING HOOKS
// ============================================================================

export function useUserRating(submissionId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: contestKeys.userRating(submissionId, user?.id || ""),
    queryFn: () => contestService.getUserRatingForSubmission(submissionId, user!.id),
    enabled: !!user?.id && !!submissionId,
  });
}

export function useUserRatings(eventId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: contestKeys.userRatings(eventId, user?.id || ""),
    queryFn: () => contestService.getUserRatings(eventId, user!.id),
    enabled: !!user?.id,
  });
}

export function useSubmitRating() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: contestService.submitRating,
    onSuccess: (_, variables) => {
      // Invalidate multiple related queries
      queryClient.invalidateQueries({
        queryKey: contestKeys.submissionById(variables.submissionId),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.submissions(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.leaderboard(variables.eventId, 5),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.userStatus(variables.eventId, variables.reviewerId),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.userRatings(variables.eventId, variables.reviewerId),
      });
      queryClient.invalidateQueries({
        queryKey: contestKeys.userRating(variables.submissionId, variables.reviewerId),
      });
      toast.success("Rating submitted successfully!");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("You have already rated this website");
      } else if (error.message.includes("SELF_RATING")) {
        toast.error("You cannot rate your own website submission");
      } else {
        toast.error(error.message || "Failed to submit rating");
      }
    },
  });
}

// ============================================================================
// LEADERBOARD HOOKS
// ============================================================================

export function useContestLeaderboard(eventId: string, limit: number = 5) {
  return useQuery({
    queryKey: contestKeys.leaderboard(eventId, limit),
    queryFn: () => contestService.getContestLeaderboard(eventId, limit),
    staleTime: 30000, // 30 seconds
  });
}

// ============================================================================
// USER STATUS HOOKS
// ============================================================================

export function useUserContestStatus(eventId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: contestKeys.userStatus(eventId, user?.id || ""),
    queryFn: () => contestService.getUserContestStatus(eventId, user!.id),
    enabled: !!user?.id,
  });
}

// ============================================================================
// ADMIN HOOKS
// ============================================================================

export function useUpdateParticipantVerification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({
      participantId,
      status,
      note,
    }: {
      participantId: string;
      status: VerificationStatus;
      note?: string;
    }) => contestService.updateParticipantVerification(participantId, status, note, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contestKeys.all });
      toast.success("Participant verification updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update verification");
    },
  });
}

export function useModerateSubmission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({
      submissionId,
      status,
      reason,
    }: {
      submissionId: string;
      status: SubmissionStatus;
      reason?: string;
    }) => contestService.moderateSubmission(submissionId, status, reason, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contestKeys.all });
      toast.success("Submission moderation updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to moderate submission");
    },
  });
}

export function useInvalidateRating() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({
      ratingId,
      isValid,
      reason,
    }: {
      ratingId: string;
      isValid: boolean;
      reason: string;
    }) => contestService.invalidateRating(ratingId, isValid, reason, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contestKeys.all });
      toast.success("Rating moderation updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to moderate rating");
    },
  });
}

export function useImportUnstopCSV() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({
      eventId,
      csvData,
    }: {
      eventId: string;
      csvData: Array<{ email: string; name: string; unstopId?: string }>;
    }) => contestService.importUnstopParticipantsCSV(eventId, csvData, user!.id),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: contestKeys.participants(variables.eventId),
      });
      toast.success(`Imported ${result.totalImported} participants successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import CSV");
    },
  });
}
