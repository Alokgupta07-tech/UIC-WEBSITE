/**
 * Contest Leaderboard - Top 5 ranked submissions
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Star, ExternalLink, Medal, Award } from "lucide-react";
import type { ContestLeaderboardEntry } from "@/types";
import { getSafeExternalLinkProps } from "@/lib/urlValidation";
import { Skeleton } from "@/components/ui/skeleton";

interface ContestLeaderboardProps {
  entries: ContestLeaderboardEntry[];
  isLoading?: boolean;
  showProvisional?: boolean;
}

const RANK_ICONS = {
  1: Trophy,
  2: Medal,
  3: Award,
};

const RANK_COLORS = {
  1: "text-yellow-500",
  2: "text-gray-400",
  3: "text-orange-600",
};

const RANK_BG_COLORS = {
  1: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200",
  2: "bg-gray-50 dark:bg-gray-950/20 border-gray-200",
  3: "bg-orange-50 dark:bg-orange-950/20 border-orange-200",
};

export function ContestLeaderboard({
  entries,
  isLoading = false,
  showProvisional = true,
}: ContestLeaderboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Top 5 Websites — Vibe Coding Contest</h2>
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top 5 Websites — Vibe Coding Contest
          </CardTitle>
          <CardDescription>The highest-rated projects will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No rated submissions yet.</p>
            <p className="text-sm mt-1">Be the first to submit and get rated!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Top 5 Websites — Vibe Coding Contest
        </h2>
        <p className="text-muted-foreground">
          Ranked by average rating, number of ratings, and submission time
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => {
          const RankIcon = RANK_ICONS[entry.rank as keyof typeof RANK_ICONS];
          const rankColor = RANK_COLORS[entry.rank as keyof typeof RANK_COLORS];
          const bgColor = RANK_BG_COLORS[entry.rank as keyof typeof RANK_BG_COLORS] || "";
          
          const participantInitials = entry.participantName
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?";

          return (
            <Card
              key={entry.submissionId}
              className={`${entry.rank <= 3 ? bgColor : ""} transition-all hover:shadow-md`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    {RankIcon ? (
                      <div className={`flex items-center justify-center h-12 w-12 rounded-full ${rankColor}`}>
                        <RankIcon className="h-8 w-8" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted text-muted-foreground font-bold text-xl">
                        #{entry.rank}
                      </div>
                    )}
                  </div>

                  {/* Participant Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>{participantInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{entry.projectName}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        by {entry.participantName}
                      </p>
                    </div>
                  </div>

                  {/* Rating Display */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 font-bold text-lg">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span>{entry.avgRating.toFixed(1)}</span>
                        <span className="text-muted-foreground font-normal text-sm">/ 5</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.ratingCount} {entry.ratingCount === 1 ? "rating" : "ratings"}
                      </p>
                    </div>

                    {/* Visit Button */}
                    <Button size="sm" variant="outline" asChild>
                      <a href={entry.liveUrl} {...getSafeExternalLinkProps()}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Provisional Badge */}
                {showProvisional && entry.isProvisional && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="secondary" className="text-xs">
                      Provisional — Needs more ratings for official ranking
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {entries.length < 5 && (
        <p className="text-center text-sm text-muted-foreground">
          {5 - entries.length} more {entries.length < 4 ? "slots" : "slot"} available in the Top 5
        </p>
      )}
    </div>
  );
}
