/**
 * Contest Event Page - Main Vibe Coding Contest page
 * 
 * Renders ALL sections unconditionally (never hides sections because of 0 data).
 * "Your Contest Status" card covers 100% of user states and never renders blank.
 */

import { useState } from "react";
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
  useCreateVerificationClaim,
} from "@/hooks/useContest";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  LogIn,
  Globe,
  Eye,
  Share2,
  ArrowRight,
  ShieldCheck,
  Rocket,
  Zap,
  BarChart3,
  ScrollText,
} from "lucide-react";
import { getSafeExternalLinkProps } from "@/lib/urlValidation";
import type { ContestSubmission } from "@/types";

// ---------------------------------------------------------------------------
// Helper: normalize status string for reliable comparison
// ---------------------------------------------------------------------------
function normalizeStatus(s?: string | null): string {
  return (s ?? "").trim().toLowerCase();
}

function isContestActive(event: { contestStatus?: string | null; isSubmissionsOpen?: boolean | null; isRatingsOpen?: boolean | null; status?: string }): boolean {
  const cs = normalizeStatus(event.contestStatus);
  const es = normalizeStatus(event.status);
  const activeStatuses = ["published", "submissions_open", "ratings_open", "verification_open", "results_published"];
  return activeStatuses.includes(cs) || activeStatuses.includes(es) || !!event.isSubmissionsOpen || !!event.isRatingsOpen;
}

// ---------------------------------------------------------------------------
// 7-Step Workflow Items
// ---------------------------------------------------------------------------
const WORKFLOW_STEPS = [
  { icon: Globe, label: "Register on Unstop", desc: "Sign up on Unstop to get started" },
  { icon: ShieldCheck, label: "Verify Eligibility", desc: "Confirm your registration" },
  { icon: Rocket, label: "Submit Live Website", desc: "Share your best project" },
  { icon: Eye, label: "Explore Gallery", desc: "Browse peer submissions" },
  { icon: Star, label: "Rate Peer Websites", desc: "Give 1–5 ★ ratings" },
  { icon: Share2, label: "Request Ratings", desc: "Share your project link" },
  { icon: Trophy, label: "Top 5 Leaderboard", desc: "Climb the rankings" },
];

export default function ContestEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showRequestRatingsDialog, setShowRequestRatingsDialog] = useState(false);
  const [selectedSubmissionForRating, setSelectedSubmissionForRating] = useState<ContestSubmission | null>(null);

  // Verification claim form state
  const [claimUnstopId, setClaimUnstopId] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimName, setClaimName] = useState("");

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
  const createVerificationClaim = useCreateVerificationClaim();

  if (eventLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!event) {
    return <div className="container mx-auto px-4 py-8">Contest not found</div>;
  }

  // Normalize all status checks (handles PUBLISHED, Published, published, etc.)
  const isVerified = normalizeStatus(participant?.verificationStatus) === "verified";
  const isPending = normalizeStatus(participant?.verificationStatus) === "pending";
  const isRejected = normalizeStatus(participant?.verificationStatus) === "rejected";
  const hasSubmitted = !!userSubmission;
  
  const submissionsOpen = !!event.isSubmissionsOpen || normalizeStatus(event.contestStatus) === "submissions_open";
  const ratingsOpen = !!event.isRatingsOpen || normalizeStatus(event.contestStatus) === "ratings_open";
  
  const canSubmit = isVerified && submissionsOpen;
  const canRate = isVerified && ratingsOpen;
  const canEdit = hasSubmitted && (canSubmit || userSubmission?.adminOverrideEditAllowed);

  const externalUrl = event.externalRegistrationUrl || event.unstopRegistrationLink || null;

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

  const handleVerificationClaim = async () => {
    if (!user || !id) return;
    await createVerificationClaim.mutateAsync({
      eventId: id,
      userId: user.id,
      unstopRegistrationId: claimUnstopId.trim(),
      unstopEmail: claimEmail.trim() || user.email || "",
      participantName: claimName.trim() || user.user_metadata?.full_name || user.email || "Participant",
    });
    setClaimUnstopId("");
    setClaimEmail("");
    setClaimName("");
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
        {/* ================================================================
            SECTION 1: Hero & Quick Action Bar
            ================================================================ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">{event.title}</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {event.description || "Submit your best website project and compete with fellow developers. Build, rate, and win!"}
          </p>
          
          {/* Contest Status Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="text-sm">
              Status: {normalizeStatus(event.contestStatus || event.status).replace(/_/g, " ").toUpperCase() || "ACTIVE"}
            </Badge>
            {submissionsOpen && (
              <Badge className="bg-green-600 text-white text-sm">Submissions Open</Badge>
            )}
            {ratingsOpen && (
              <Badge className="bg-blue-600 text-white text-sm">Ratings Open</Badge>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {externalUrl && (
              <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90" asChild>
                <a href={externalUrl} {...getSafeExternalLinkProps()}>
                  <ExternalLink className="h-5 w-5" />
                  Register on Unstop
                </a>
              </Button>
            )}
            {user && isVerified && submissionsOpen && !hasSubmitted && (
              <Button size="lg" variant="outline" className="gap-2" onClick={() => setShowSubmissionForm(true)}>
                <Plus className="h-5 w-5" />
                Submit My Website
              </Button>
            )}
            {!user && (
              <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate("/auth")}>
                <LogIn className="h-5 w-5" />
                Sign In to Participate
              </Button>
            )}
          </div>
        </div>

        {/* ================================================================
            SECTION 2: How It Works — 7-Step Visual Workflow
            ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              How It Works
            </CardTitle>
            <CardDescription>Follow these 7 steps to participate and compete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="relative flex flex-col items-center text-center p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary mb-2">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-primary mb-1">Step {i + 1}</span>
                    <span className="text-sm font-medium leading-tight">{step.label}</span>
                    <span className="text-xs text-muted-foreground mt-1 leading-tight">{step.desc}</span>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            SECTION 3: Rules & Eligibility
            ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Rules & Eligibility
            </CardTitle>
            <CardDescription>Please read and follow these rules to participate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Submission Rules</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Submit a <strong>valid, publicly accessible HTTPS URL</strong> to your live website
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Each participant may submit <strong>one website</strong> per contest
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    The website must be your own original work
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Provide an optional GitHub/GitLab repository URL for source code
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Rating Rules</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    Rate each peer website on a scale of <strong>1–5 stars</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    You <strong>cannot rate your own</strong> submission
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    Each participant can rate each submission <strong>only once</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <strong>Top 5</strong> ranked by average rating, then rating count, then submission time
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            SECTION 4: Your Contest Status (NEVER BLANK)
            ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Contest Status
            </CardTitle>
            <CardDescription>
              {user ? "Your registration and submission status" : "Sign in to participate in the contest"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ── STATE 1: Not Logged In ── */}
            {!user && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sign in to register, verify your Unstop registration, submit your website, and rate peer projects.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate("/auth")} className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In / Log In
                  </Button>
                  {externalUrl && (
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={externalUrl} {...getSafeExternalLinkProps()}>
                        <ExternalLink className="h-4 w-4" />
                        Register on Unstop
                      </a>
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* ── STATE 2: Logged In, Verified ── */}
            {user && isVerified && (
              <>
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <span className="font-semibold">Verified Participant</span> — You are verified and eligible to participate in the contest!
                  </AlertDescription>
                </Alert>

                {/* Submission section for verified users */}
                {hasSubmitted ? (
                  <>
                    <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{userSubmission.projectName}</h3>
                          <p className="text-sm text-muted-foreground">{userSubmission.projectDescription}</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {userSubmission.status === "approved" ? "Approved" : userSubmission.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
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
                      <Separator />
                      <div className="flex items-center gap-6">
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
                        {userStatus?.currentRank && (
                          <>
                            <Separator orientation="vertical" className="h-12" />
                            <div>
                              <p className="text-sm text-muted-foreground">Leaderboard Rank</p>
                              <p className="text-2xl font-bold">#{userStatus.currentRank}</p>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {canEdit && (
                          <Button size="sm" onClick={() => setShowSubmissionForm(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit My Website
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setShowRequestRatingsDialog(true)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Request Ratings
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View in Gallery
                        </Button>
                      </div>
                    </div>
                  </>
                ) : submissionsOpen ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You're verified! Submit your website project to enter the contest.
                    </p>
                    <Button onClick={() => setShowSubmissionForm(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Submit My Website
                    </Button>
                  </div>
                ) : (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Website submissions are currently closed. Check back later!
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* ── STATE 3: Logged In, Pending Verification ── */}
            {user && isPending && (
              <>
                <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">Registration verification is pending.</span>
                    {participant?.unstopRegistrationId && (
                      <> Your Unstop ID: <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded text-xs">{participant.unstopRegistrationId}</code></>
                    )}
                    <span className="block mt-1 text-sm">You'll be notified once an admin verifies your registration.</span>
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* ── STATE 4: Logged In, Rejected ── */}
            {user && isRejected && (
              <>
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Verification rejected{participant?.rejectionOrAdminNote ? `: ${participant.rejectionOrAdminNote}` : "."}
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* ── STATE 5: Logged In, Not Yet Registered (no participant record) ── */}
            {user && !participant && (
              <>
                <div className="space-y-4">
                  {/* Step 1: Register on Unstop */}
                  {externalUrl && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="space-y-2">
                        <p className="font-semibold">Step 1 — Register on Unstop</p>
                        <p className="text-sm">First, register on Unstop to participate in the contest.</p>
                        <Button size="sm" variant="default" asChild>
                          <a href={externalUrl} {...getSafeExternalLinkProps()}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Register on Unstop
                          </a>
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Step 2: Verify / Claim Registration */}
                  <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {externalUrl ? "Step 2 — Verify Your Registration" : "Verify / Claim Your Registration"}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter your Unstop Registration ID or email to verify your eligibility.
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="claim-unstop-id" className="text-xs">Unstop Registration ID</Label>
                        <Input
                          id="claim-unstop-id"
                          placeholder="e.g., UNSTOP12345"
                          value={claimUnstopId}
                          onChange={(e) => setClaimUnstopId(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="claim-email" className="text-xs">Email (used on Unstop)</Label>
                        <Input
                          id="claim-email"
                          type="email"
                          placeholder={user.email || "your@email.com"}
                          value={claimEmail}
                          onChange={(e) => setClaimEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="claim-name" className="text-xs">Your Full Name</Label>
                      <Input
                        id="claim-name"
                        placeholder={user.user_metadata?.full_name || "Enter your name"}
                        value={claimName}
                        onChange={(e) => setClaimName(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleVerificationClaim}
                      disabled={createVerificationClaim.isPending || (!claimUnstopId.trim() && !claimEmail.trim())}
                      className="gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {createVerificationClaim.isPending ? "Submitting..." : "Verify / Submit Registration"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* User stats grid (when available) */}
            {user && userStatus && (
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

        {/* ================================================================
            SECTION 5: Top 5 Websites — Vibe Coding Contest (ALWAYS VISIBLE)
            ================================================================ */}
        <Separator />
        <ContestLeaderboard entries={leaderboard || []} isLoading={leaderboardLoading} />

        {/* ================================================================
            SECTION 6: Participant Websites Gallery & Peer Rating
            ================================================================ */}
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

            {(!submissions || submissions.length === 0) && !submissionsLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No submissions yet</p>
                <p className="text-sm mt-1">Be the first to submit your website and start the competition!</p>
              </div>
            )}
          </div>
        </div>

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
