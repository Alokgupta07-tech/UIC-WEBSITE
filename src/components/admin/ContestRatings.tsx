/**
 * ContestRatings — Admin rating audit and moderation panel
 */

import { useState } from "react";
import { useAllContestRatings, useInvalidateRating } from "@/hooks/useContest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Star, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download
} from "lucide-react";
import { format } from "date-fns";
import type { ContestRating } from "@/types";

type ContestRatingWithDetails = ContestRating & { reviewerName?: string; projectName?: string; creatorName?: string };

interface ContestRatingsProps {
  eventId: string;
}

export function ContestRatings({ eventId }: ContestRatingsProps) {
  const { data: ratings, isLoading } = useAllContestRatings(eventId);
  const invalidateRatingMutation = useInvalidateRating();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterValidity, setFilterValidity] = useState<"all" | "valid" | "flagged">("all");
  const [filterScore, setFilterScore] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<ContestRatingWithDetails | null>(null);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagTargetState, setFlagTargetState] = useState<boolean>(false);

  const filteredRatings = ratings?.filter((r) => {
    const matchesSearch =
      r.reviewerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.creatorName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesValidity =
      filterValidity === "all" ||
      (filterValidity === "valid" && r.isValid) ||
      (filterValidity === "flagged" && !r.isValid);

    const matchesScore = filterScore === "all" || r.score === Number(filterScore);

    return matchesSearch && matchesValidity && matchesScore;
  });

  const totalCount = ratings?.length || 0;
  const validRatings = ratings?.filter((r) => r.isValid) || [];
  const validCount = validRatings.length;
  const flaggedCount = totalCount - validCount;
  const avgScore = validCount > 0
    ? (validRatings.reduce((sum, r) => sum + r.score, 0) / validCount).toFixed(2)
    : "-";

  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: ratings?.filter((r) => r.isValid && r.score === s).length || 0,
  }));

  const handleOpenFlagDialog = (rating: ContestRatingWithDetails, makeValid: boolean) => {
    setSelectedRating(rating);
    setFlagTargetState(makeValid);
    setFlagReason(rating.moderationReason || "");
    setShowFlagDialog(true);
  };

  const handleConfirmFlag = async () => {
    if (!selectedRating) return;

    await invalidateRatingMutation.mutateAsync({
      ratingId: selectedRating.id,
      isValid: flagTargetState,
      reason: flagReason || (flagTargetState ? "Restored by admin" : "Flagged for irregular pattern"),
    });

    setShowFlagDialog(false);
    setSelectedRating(null);
    setFlagReason("");
  };

  const handleExportCSV = () => {
    if (!ratings || ratings.length === 0) return;

    const headers = ["Rating ID", "Project Name", "Creator", "Reviewer", "Score", "Valid", "Flag Reason", "Date"];
    const rows = ratings.map((r) => [
      r.id,
      `"${(r.projectName || "").replace(/"/g, '""')}"`,
      `"${(r.creatorName || "").replace(/"/g, '""')}"`,
      `"${(r.reviewerName || "").replace(/"/g, '""')}"`,
      r.score,
      r.isValid ? "Yes" : "No",
      `"${(r.moderationReason || "").replace(/"/g, '""')}"`,
      r.createdAt,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contest_ratings_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Ratings</p>
          <p className="text-2xl font-bold mt-1">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{validCount} valid ratings counted</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Average Score</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold">{avgScore}</span>
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Across all valid ratings</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Valid / Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{validCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Included in leaderboard score</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Flagged / Invalid</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{flaggedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Excluded from ranking</p>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                Rating Moderation & Audit
              </CardTitle>
              <CardDescription>
                Audit peer reviews, investigate suspicious rating patterns, and moderate invalid scores
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={totalCount === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reviewer, project, or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterValidity} onValueChange={(v) => setFilterValidity(v as "all" | "valid" | "flagged")}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Validity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Validity</SelectItem>
                <SelectItem value="valid">Valid Only</SelectItem>
                <SelectItem value="flagged">Flagged Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterScore} onValueChange={setFilterScore}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRatings && filteredRatings.length > 0 ? (
                  filteredRatings.map((rating) => (
                    <TableRow key={rating.id} className={!rating.isValid ? "bg-red-50/40 dark:bg-red-950/20" : ""}>
                      <TableCell className="font-semibold">{rating.projectName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rating.creatorName}</TableCell>
                      <TableCell className="text-sm">{rating.reviewerName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm">{rating.score}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= rating.score
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-gray-300 dark:text-gray-700"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {rating.isValid ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            Flagged
                          </Badge>
                        )}
                        {rating.moderationReason && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs truncate" title={rating.moderationReason}>
                            {rating.moderationReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rating.createdAt ? format(new Date(rating.createdAt), "MMM d, h:mm a") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {rating.isValid ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleOpenFlagDialog(rating, false)}
                          >
                            <ShieldAlert className="h-4 w-4 mr-1" />
                            Flag
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleOpenFlagDialog(rating, true)}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <Star className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="font-medium">No ratings found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        When participants rate websites, scores and timestamps will appear here for audit.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Flag / Restore Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {flagTargetState ? "Restore Rating to Valid" : "Flag Rating as Invalid"}
            </DialogTitle>
            <DialogDescription>
              {flagTargetState
                ? "Restoring this rating will include it again in the submission's average rating calculation."
                : "Flagging this rating will immediately exclude it from the submission's leaderboard score."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Reason / Audit Note</Label>
              <Textarea
                placeholder={flagTargetState ? "Reason for restoring..." : "e.g., Suspected collusion, automated script, reciprocal spam..."}
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={flagTargetState ? "default" : "destructive"}
              onClick={handleConfirmFlag}
              disabled={invalidateRatingMutation.isPending}
            >
              {invalidateRatingMutation.isPending ? "Processing..." : flagTargetState ? "Restore Rating" : "Confirm Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
