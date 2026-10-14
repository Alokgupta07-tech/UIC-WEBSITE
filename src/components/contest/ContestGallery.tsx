/**
 * Contest Gallery - Grid of all submissions with filtering and sorting
 */

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { SubmissionCard } from "./SubmissionCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContestSubmission } from "@/types";

interface ContestGalleryProps {
  submissions: (ContestSubmission & {
    participantName?: string;
    participantAvatar?: string | null;
    userHasRated?: boolean;
    userRating?: number | null;
  })[];
  currentUserId?: string;
  isLoading?: boolean;
  onRate?: (submission: ContestSubmission) => void;
  onRequestRatings?: (submission: ContestSubmission) => void;
  showRateButton?: boolean;
}

type SortOption = "newest" | "highest_rated" | "most_rated";
type FilterOption = "all" | "not_rated_by_me";

export function ContestGallery({
  submissions,
  currentUserId,
  isLoading = false,
  onRate,
  onRequestRatings,
  showRateButton = true,
}: ContestGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  // Filter and sort submissions
  const filteredAndSortedSubmissions = useMemo(() => {
    let result = [...submissions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.projectName.toLowerCase().includes(query) ||
          sub.participantName?.toLowerCase().includes(query) ||
          sub.projectDescription.toLowerCase().includes(query)
      );
    }

    // Apply filter
    if (filterBy === "not_rated_by_me") {
      result = result.filter((sub) => !sub.userHasRated && sub.userId !== currentUserId);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "highest_rated":
          if (b.avgRating !== a.avgRating) {
            return b.avgRating - a.avgRating;
          }
          return b.ratingCount - a.ratingCount;
        case "most_rated":
          if (b.ratingCount !== a.ratingCount) {
            return b.ratingCount - a.ratingCount;
          }
          return b.avgRating - a.avgRating;
        case "newest":
        default:
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
    });

    return result;
  }, [submissions, searchQuery, sortBy, filterBy, currentUserId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full sm:w-48" />
          <Skeleton className="h-10 w-full sm:w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by project name or participant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest Submissions</SelectItem>
            <SelectItem value="highest_rated">Highest Rated</SelectItem>
            <SelectItem value="most_rated">Most Rated</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter */}
        {currentUserId && (
          <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="not_rated_by_me">Not Yet Rated by Me</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedSubmissions.length}{" "}
          {filteredAndSortedSubmissions.length === 1 ? "submission" : "submissions"}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
          >
            Clear search
          </Button>
        )}
      </div>

      {/* Gallery Grid */}
      {filteredAndSortedSubmissions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedSubmissions.map((submission) => {
            const isOwnSubmission = submission.userId === currentUserId;
            return (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                isOwnSubmission={isOwnSubmission}
                onRate={onRate && !isOwnSubmission ? () => onRate(submission) : undefined}
                onRequestRatings={
                  onRequestRatings && isOwnSubmission
                    ? () => onRequestRatings(submission)
                    : undefined
                }
                showRateButton={showRateButton && !isOwnSubmission}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground">
            {searchQuery
              ? `No submissions found matching "${searchQuery}"`
              : filterBy === "not_rated_by_me"
              ? "You've rated all available submissions!"
              : "No submissions yet"}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-4"
            >
              Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
