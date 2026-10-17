/**
 * ContestLeaderboardAdmin — Admin leaderboard control and awards management
 */

import { useState } from "react";
import { useContestLeaderboard } from "@/hooks/useContest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Crown, 
  Medal, 
  Star, 
  ExternalLink, 
  Download, 
  Award,
  Sparkles,
  Github
} from "lucide-react";
import { getSafeExternalLinkProps } from "@/lib/urlValidation";

interface ContestLeaderboardAdminProps {
  eventId: string;
}

export function ContestLeaderboardAdmin({ eventId }: ContestLeaderboardAdminProps) {
  const { data: leaderboard, isLoading } = useContestLeaderboard(eventId, 50);

  const top3 = leaderboard?.slice(0, 3) || [];
  const rest = leaderboard?.slice(3) || [];

  const handleExportCSV = () => {
    if (!leaderboard || leaderboard.length === 0) return;

    const headers = ["Rank", "Project Name", "Participant", "Average Rating", "Total Ratings", "Live URL", "Repo URL"];
    const rows = leaderboard.map((e) => [
      e.rank,
      `"${(e.projectName || "").replace(/"/g, '""')}"`,
      `"${(e.participantName || "").replace(/"/g, '""')}"`,
      e.avgRating.toFixed(2),
      e.ratingCount,
      e.liveUrl,
      e.repoUrl || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contest_leaderboard_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Contest Rankings & Awards
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calculated in real-time from verified peer ratings with anti-fraud exclusion
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!leaderboard || leaderboard.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Standings CSV
        </Button>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rank 1: Gold */}
          {top3[0] && (
            <Card className="relative overflow-hidden border-2 border-amber-400 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15">
              <div className="absolute top-3 right-3">
                <Crown className="h-6 w-6 text-amber-500 animate-pulse" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-white font-bold px-2 py-0.5 text-xs">
                    🥇 1ST PLACE
                  </Badge>
                  {top3[0].isProvisional && (
                    <Badge variant="outline" className="text-[10px]">Provisional</Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-bold mt-2 truncate" title={top3[0].projectName}>
                  {top3[0].projectName}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-foreground">
                  By {top3[0].participantName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                    {top3[0].avgRating.toFixed(2)}
                  </span>
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <span className="text-xs text-muted-foreground">({top3[0].ratingCount} ratings)</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" asChild>
                    <a {...getSafeExternalLinkProps(top3[0].liveUrl)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Visit Site
                    </a>
                  </Button>
                  {top3[0].repoUrl && (
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" asChild>
                      <a {...getSafeExternalLinkProps(top3[0].repoUrl)}>
                        <Github className="h-3.5 w-3.5" />
                        Code
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rank 2: Silver */}
          {top3[1] && (
            <Card className="relative overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-200/20 via-slate-100/10 to-transparent dark:from-slate-800/30">
              <div className="absolute top-3 right-3">
                <Medal className="h-6 w-6 text-slate-400" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-400 text-white font-bold px-2 py-0.5 text-xs">
                    🥈 2ND PLACE
                  </Badge>
                  {top3[1].isProvisional && (
                    <Badge variant="outline" className="text-[10px]">Provisional</Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-bold mt-2 truncate" title={top3[1].projectName}>
                  {top3[1].projectName}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-foreground">
                  By {top3[1].participantName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-700 dark:text-slate-300">
                    {top3[1].avgRating.toFixed(2)}
                  </span>
                  <div className="flex items-center text-slate-400">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <span className="text-xs text-muted-foreground">({top3[1].ratingCount} ratings)</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" asChild>
                    <a {...getSafeExternalLinkProps(top3[1].liveUrl)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Visit Site
                    </a>
                  </Button>
                  {top3[1].repoUrl && (
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" asChild>
                      <a {...getSafeExternalLinkProps(top3[1].repoUrl)}>
                        <Github className="h-3.5 w-3.5" />
                        Code
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rank 3: Bronze */}
          {top3[2] && (
            <Card className="relative overflow-hidden border-2 border-amber-700/40 bg-gradient-to-b from-amber-700/10 via-amber-800/5 to-transparent dark:from-amber-900/20">
              <div className="absolute top-3 right-3">
                <Medal className="h-6 w-6 text-amber-700" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-700 text-white font-bold px-2 py-0.5 text-xs">
                    🥉 3RD PLACE
                  </Badge>
                  {top3[2].isProvisional && (
                    <Badge variant="outline" className="text-[10px]">Provisional</Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-bold mt-2 truncate" title={top3[2].projectName}>
                  {top3[2].projectName}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-foreground">
                  By {top3[2].participantName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-800 dark:text-amber-500">
                    {top3[2].avgRating.toFixed(2)}
                  </span>
                  <div className="flex items-center text-amber-600">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <span className="text-xs text-muted-foreground">({top3[2].ratingCount} ratings)</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" asChild>
                    <a {...getSafeExternalLinkProps(top3[2].liveUrl)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Visit Site
                    </a>
                  </Button>
                  {top3[2].repoUrl && (
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" asChild>
                      <a {...getSafeExternalLinkProps(top3[2].repoUrl)}>
                        <Github className="h-3.5 w-3.5" />
                        Code
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Complete Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Complete Standings</CardTitle>
          <CardDescription>
            All submitted projects ranked by validated community ratings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Average Rating</TableHead>
                  <TableHead>Ratings Cast</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard && leaderboard.length > 0 ? (
                  leaderboard.map((entry) => (
                    <TableRow key={entry.submissionId}>
                      <TableCell className="font-bold">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                            🥇
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-bold text-sm">
                            🥈
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-900/10 text-amber-900 font-bold text-sm">
                            🥉
                          </span>
                        ) : (
                          <span className="text-muted-foreground pl-2 font-mono">#{entry.rank}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{entry.projectName}</TableCell>
                      <TableCell className="text-sm">{entry.participantName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-bold">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span>{entry.avgRating.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.ratingCount} reviews
                      </TableCell>
                      <TableCell>
                        {entry.isProvisional ? (
                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                            Provisional
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">
                            Official
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild title="Visit live website">
                            <a {...getSafeExternalLinkProps(entry.liveUrl)}>
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          {entry.repoUrl && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild title="View repository">
                              <a {...getSafeExternalLinkProps(entry.repoUrl)}>
                                <Github className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Trophy className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="font-medium">No ranked submissions yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Once participants submit websites and peer reviews start coming in, the leaderboard will automatically generate.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
