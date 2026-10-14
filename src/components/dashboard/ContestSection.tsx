/**
 * Contest Section for User Dashboard
 */

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/services/events";
import {
  useUserSubmission,
  useUserContestStatus,
  useUserRatings,
} from "@/hooks/useContest";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Star,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Award,
} from "lucide-react";
import { getSafeExternalLinkProps } from "@/lib/urlValidation";

export function ContestSection() {
  const { user } = useAuth();
  
  // Find the Vibe Coding Contest event
  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  const contestEvent = events?.find((e) => 
    e.title.toLowerCase().includes("vibe coding contest") || 
    e.title.toLowerCase().includes("coding contest")
  );

  const contestId = contestEvent?.id;

  const { data: submission } = useUserSubmission(contestId || "");
  const { data: userStatus } = useUserContestStatus(contestId || "");
  const { data: userRatings } = useUserRatings(contestId || "", user?.id || "");

  if (!contestEvent) {
    return null; // No contest event found
  }

  const verificationStatus = userStatus?.verificationStatus;
  const isVerified = userStatus?.isVerified || false;
  const hasSubmitted = userStatus?.hasSubmitted || false;

  const getVerificationBadge = () => {
    if (isVerified) {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (verificationStatus === "pending") {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending Verification
        </Badge>
      );
    }
    if (verificationStatus === "rejected") {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="outline">Not Registered</Badge>
    );
  };

  const ratingProgress = userStatus?.eligibleToRate
    ? Math.round((userStatus.websitesRated / (userStatus.websitesRated + userStatus.eligibleToRate)) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>My Vibe Coding Contest</CardTitle>
              <CardDescription>Your contest participation and performance</CardDescription>
            </div>
          </div>
          {getVerificationBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isVerified ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-muted-foreground">
              {verificationStatus === "pending"
                ? "Your registration is awaiting admin verification."
                : "Register on Unstop and get verified to participate in the contest."}
            </p>
            <Button asChild>
              <Link to={`/events/${contestId}`}>View Contest Details</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Submission Status */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Award className="h-4 w-4" />
                Submission Status
              </h4>
              {hasSubmitted && submission ? (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div>
                    <h5 className="font-medium">{submission.projectName}</h5>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {submission.projectDescription}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{submission.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">/ 5</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {submission.ratingCount} {submission.ratingCount === 1 ? "rating" : "ratings"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={submission.liveUrl} {...getSafeExternalLinkProps()}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Visit
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/events/${contestId}#gallery`}>View in Gallery</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    You haven't submitted your website yet
                  </p>
                  <Button size="sm" asChild>
                    <Link to={`/events/${contestId}`}>Submit Website</Link>
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current Rank</p>
                <p className="text-2xl font-bold">
                  {userStatus?.currentRank ? `#${userStatus.currentRank}` : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {userStatus?.totalRanked || 0}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {submission?.avgRating ? (
                    <>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {submission.avgRating.toFixed(1)}
                    </>
                  ) : (
                    "-"
                  )}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ratings Received</p>
                <p className="text-2xl font-bold">{submission?.ratingCount || 0}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Websites Rated</p>
                <p className="text-2xl font-bold">{userStatus?.websitesRated || 0}</p>
              </div>
            </div>

            <Separator />

            {/* Rating Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Your Rating Activity
                </h4>
                <span className="text-sm text-muted-foreground">
                  {userStatus?.websitesRated || 0} / {(userStatus?.websitesRated || 0) + (userStatus?.eligibleToRate || 0)} websites
                </span>
              </div>
              
              <Progress value={ratingProgress} className="h-2" />
              
              <p className="text-xs text-muted-foreground">
                {userStatus?.eligibleToRate || 0} websites remaining to rate
              </p>
              
              {(userStatus?.eligibleToRate || 0) > 0 && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/events/${contestId}#gallery`}>
                    Rate More Websites
                  </Link>
                </Button>
              )}
            </div>

            {/* Recent Ratings */}
            {userRatings && userRatings.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Recent Ratings</h4>
                  <div className="space-y-2">
                    {userRatings.slice(0, 3).map((rating) => (
                      <div
                        key={rating.id}
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                      >
                        <span className="text-muted-foreground truncate flex-1">
                          Rating submitted
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="font-medium">{rating.score}</span>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {userRatings.length > 3 && (
                    <Button size="sm" variant="ghost" asChild className="w-full">
                      <Link to={`/events/${contestId}`}>View All Ratings</Link>
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
