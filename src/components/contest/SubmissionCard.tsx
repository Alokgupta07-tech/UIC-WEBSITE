/**
 * Submission Card - Display individual contest submission in gallery
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Github, Star, Trophy, User } from "lucide-react";
import type { ContestSubmission } from "@/types";
import { getSafeExternalLinkProps } from "@/lib/urlValidation";

interface SubmissionCardProps {
  submission: ContestSubmission & {
    participantName?: string;
    participantAvatar?: string | null;
    userHasRated?: boolean;
    userRating?: number | null;
  };
  isOwnSubmission?: boolean;
  onRate?: () => void;
  onRequestRatings?: () => void;
  showRateButton?: boolean;
  isHighlighted?: boolean;
  rank?: number;
}

export function SubmissionCard({
  submission,
  isOwnSubmission = false,
  onRate,
  onRequestRatings,
  showRateButton = true,
  isHighlighted = false,
  rank,
}: SubmissionCardProps) {
  const hasRatings = submission.ratingCount > 0;
  const participantInitials = submission.participantName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <Card className={`h-full flex flex-col transition-all ${isHighlighted ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={submission.participantAvatar || undefined} />
              <AvatarFallback>{participantInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {submission.participantName || "Anonymous"}
              </p>
            </div>
          </div>
          {rank && rank <= 3 && (
            <Badge variant={rank === 1 ? "default" : "secondary"} className="flex-shrink-0">
              <Trophy className="h-3 w-3 mr-1" />
              #{rank}
            </Badge>
          )}
        </div>

        <div>
          <CardTitle className="text-lg line-clamp-2">{submission.projectName}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <CardDescription className="line-clamp-3">
          {submission.projectDescription}
        </CardDescription>

        {/* Rating Display */}
        <div className="flex items-center gap-4 text-sm">
          {hasRatings ? (
            <>
              <div className="flex items-center gap-1 font-semibold">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{submission.avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground font-normal">/ 5</span>
              </div>
              <div className="text-muted-foreground">
                {submission.ratingCount} {submission.ratingCount === 1 ? "rating" : "ratings"}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">No ratings yet</div>
          )}
        </div>

        {/* User Rating Status */}
        {submission.userHasRated && submission.userRating && (
          <Badge variant="outline" className="w-fit">
            You rated: {submission.userRating}/5 ★
          </Badge>
        )}

        {isOwnSubmission && (
          <Badge variant="outline" className="w-fit">
            <User className="h-3 w-3 mr-1" />
            Your Submission
          </Badge>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {/* External Links */}
        <div className="flex gap-2 w-full">
          <Button
            variant="default"
            className="flex-1"
            size="sm"
            asChild
          >
            <a href={submission.liveUrl} {...getSafeExternalLinkProps()}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Website
            </a>
          </Button>
          {submission.repoUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={submission.repoUrl} {...getSafeExternalLinkProps()}>
                <Github className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        {isOwnSubmission ? (
          onRequestRatings && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRequestRatings}
              className="w-full"
            >
              Request Ratings
            </Button>
          )
        ) : showRateButton && onRate ? (
          <Button
            variant={submission.userHasRated ? "outline" : "default"}
            size="sm"
            onClick={onRate}
            disabled={submission.userHasRated}
            className="w-full"
          >
            <Star className="h-4 w-4 mr-2" />
            {submission.userHasRated ? "Already Rated" : "Rate Website"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
