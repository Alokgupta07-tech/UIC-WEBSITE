/**
 * Contest Event Page - Main Vibe Coding Contest page
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getEventById } from "@/services/events";
import { useAuth } from "@/hooks/useAuth";
import {
  useContestParticipant,
  useUserSubmission,
  useAllSubmissions,
  useContestLeaderboard,
  useSubmitWebsite,
  useUpdateWebsite,
  useSubmitRating,
  useUserContestStatus,
} from "@/hooks/useContest";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ContestSubmissionForm } from "@/components/contest/ContestSubmissionForm";
import { RatingDialog } from "@/components/contest/RatingDialog";
import { RequestRatingsDialog } from "@/components/contest/RequestRatingsDialog";
import { ContestGallery } from "@/components/contest/ContestGallery";
import { ContestLeaderboard } from "@/components/contest/ContestLeaderboard";
import {
  Trophy,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  Edit,
  Star,
  Users,
  Award,
} from "lucide-react";
import { getSafeExternalLinkProps } from "@/lib/urlValidation";
import type { ContestSubmission } from "@/types";

export default function ContestEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showRequestRatingsDialog, setShowRequestRatingsDialog] = useState(false);
  const [selectedSubmissionForRating, setSelectedSubmissionForRating] = useState<ContestSubmission | null>(null);

  // Fetch event details
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventById(id!),
    enabled: !!id,
  });

  // Contest data
  const { data: participant } = useContestParticipant(id!);
  const { data: userSubmission } = useUserSubmission(id!);
  const { data: userStatus } = useUserContestStatus(id!);
  const { data: submissions, isLoading: submissionsLoading } = useAllSubmissions(id!);
  const { data: leaderboard, isLoading: leaderboardLoading } = useContestLeaderboard(id!, 5);

  // Mutations
  const submitWebsite = useSubmitWebsite();
  const updateWebsite = useUpdateWebsite();
  const submitRating = useSubmitRating();

  // Auto-link participant on page load if email matches
  useEffect(() => {
    if (user && id && !participant) {
      // The RPC function will auto-link if email matches
      // This happens silently in the background via the service
    }
  }, [user, id, participant]);

  if (eventLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!event) {
    return <div className="container mx-auto px-4 py-8">Contest not found</div>;
  }

  const isVerified = participant?.verificationStatus === "verified";
  const isPending = participant?.verificationStatus === "pending";
  const isRejected = participant?.verificationStatus === "rejected";
  const hasSubmitted = !!userSubmission;
  
  const canSubmit = isVerified && (event.isSubmissionsOpen || event.contestStatus === "submissions_open");
  const canRate = isVerified && (event.isRatingsOpen || event.contestStatus === "ratings_open");
  const canEdit = hasSubmitted && (canSubmit || userSubmission?.adminOverrideEditAllowed);

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/events/${id}#gallery`
    : "";

  const handleSubmitWebsite = async (data: {
    projectName: string;
    projectDescription: string;
    liveUrl: string;
    repoUrl?: string;
  }) => {
    if (!user || !id) return;

    if (hasSubmitted) {
      await updateWebsite.mutateAsync({
        submissionId: userSubmission.id,
        ...data,
      });
    } else {
      await submitWebsite.mutateAsync({
        eventId: id,
        userId: user.id,
        ...data,
      });
    }
  };

  const handleRate = (submission: ContestSubmission) => {
    setSelectedSubmissionForRating(submission);
    setShowRatingDialog(true);
  };

  const handleSubmitRating = async (score: number) => {
    if (!user || !id || !selectedSubmissionForRating) return;

    await submitRating.mutateAsync({
      eventId: id,
      submissionId: selectedSubmissionForRating.id,
      reviewerId: user.id,
      score,
    });
  };

  return (
    <>
      <Seo
        path={`/events/${id}`}
        title={event.title}
        description={event.description || "Submit your website and compete with fellow developers!"}
        type="website"
      />

      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">{event.title}</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {event.description || "Submit your best website project and compete with fellow developers. Build, rate, and win!"}
          </p>
          
          {/* Contest Status Badge */}
          {event.contestStatus && (
            <Badge variant="outline" className="text-sm">
              Status: {event.contestStatus.replace(/_/g, " ").toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Verification & Registration Section */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Contest Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isVerified && (
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    You are verified and eligible to participate in the contest!
                  </AlertDescription>
                </Alert>
              )}
              
              {isPending && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your registration verification is pending admin approval. You'll be notified once verified.
                  </AlertDescription>
                </Alert>
              )}
              
              {isRejected && participant?.rejectionOrAdminNote && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Verification rejected: {participant.rejectionOrAdminNote}
                  </AlertDescription>
                </Alert>
              )}
              
              {!participant && event.externalRegistrationUrl && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p>Register on Unstop first to participate in the contest:</p>
                    <Button size="sm" variant="default" asChild>
                      <a href={event.externalRegistrationUrl} {...getSafeExternalLinkProps()}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Register on Unstop
                      </a>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {userStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                    <p className="text-2xl font-bold">
                      {userStatus.currentRank ? `#${userStatus.currentRank}` : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Websites Rated</p>
                    <p className="text-2xl font-bold">{userStatus.websitesRated}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Eligible to Rate</p>
                    <p className="text-2xl font-bold">{userStatus.eligibleToRate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Ranked</p>
                    <p className="text-2xl font-bold">{userStatus.totalRanked}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!user && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in to participate in the contest and submit your website.
            </AlertDescription>
          </Alert>
        )}

        {/* Submission Section */}
        {isVerified && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Your Website Submission
              </CardTitle>
              <CardDescription>
                {hasSubmitted
                  ? "Your submitted website for the contest"
                  : "Submit your best website project to compete"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasSubmitted ? (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{userSubmission.projectName}</h3>
                    <p className="text-sm text-muted-foreground">{userSubmission.projectDescription}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={userSubmission.liveUrl} {...getSafeExternalLinkProps()}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Website
                        </a>
                      </Button>
                      {userSubmission.repoUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={userSubmission.repoUrl} {...getSafeExternalLinkProps()}>
                            View Repo
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Your Rating</p>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        {userSubmission.avgRating.toFixed(1)} / 5
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {userSubmission.ratingCount} {userSubmission.ratingCount === 1 ? "rating" : "ratings"}
                      </p>
                    </div>
                    
                    <Separator orientation="vertical" className="h-12" />
                    
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button size="sm" onClick={() => setShowSubmissionForm(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Submission
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setShowRequestRatingsDialog(true)}>
                        Request Ratings
                      </Button>
                    </div>
                  </div>
                </>
              ) : canSubmit ? (
                <Button onClick={() => setShowSubmissionForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit My Website
                </Button>
              ) : (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Website submissions are currently closed. Check back later!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        {event.isLeaderboardPublished && leaderboard && leaderboard.length > 0 && (
          <>
            <Separator />
            <ContestLeaderboard entries={leaderboard} isLoading={leaderboardLoading} />
          </>
        )}

        {/* Gallery */}
        {event.isGalleryPublished && (
          <>
            <Separator />
            <div id="gallery" className="scroll-mt-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Participant Websites</h2>
                  <p className="text-muted-foreground">
                    Explore all submitted projects and rate them
                  </p>
                </div>
                
                {canRate && (
                  <Alert>
                    <Star className="h-4 w-4" />
                    <AlertDescription>
                      You can rate each website once on a scale of 1-5. Visit the websites and provide honest feedback!
                    </AlertDescription>
                  </Alert>
                )}
                
                <ContestGallery
                  submissions={submissions || []}
                  currentUserId={user?.id}
                  isLoading={submissionsLoading}
                  onRate={canRate ? handleRate : undefined}
                  onRequestRatings={(sub) => {
                    setSelectedSubmissionForRating(sub);
                    setShowRequestRatingsDialog(true);
                  }}
                  showRateButton={canRate}
                />
              </div>
            </div>
          </>
        )}

        {/* Dialogs */}
        <ContestSubmissionForm
          open={showSubmissionForm}
          onOpenChange={setShowSubmissionForm}
          onSubmit={handleSubmitWebsite}
          defaultValues={
            hasSubmitted
              ? {
                  projectName: userSubmission.projectName,
                  projectDescription: userSubmission.projectDescription,
                  liveUrl: userSubmission.liveUrl,
                  repoUrl: userSubmission.repoUrl || "",
                }
              : undefined
          }
          isEditing={hasSubmitted}
          isLoading={submitWebsite.isPending || updateWebsite.isPending}
        />

        {selectedSubmissionForRating && (
          <RatingDialog
            open={showRatingDialog}
            onOpenChange={setShowRatingDialog}
            projectName={selectedSubmissionForRating.projectName}
            participantName={selectedSubmissionForRating.participantName || "Unknown"}
            liveUrl={selectedSubmissionForRating.liveUrl}
            onSubmit={handleSubmitRating}
            isLoading={submitRating.isPending}
          />
        )}

        {userSubmission && (
          <RequestRatingsDialog
            open={showRequestRatingsDialog}
            onOpenChange={setShowRequestRatingsDialog}
            projectName={userSubmission.projectName}
            shareUrl={shareUrl}
          />
        )}
      </div>
    </>
  );
}
