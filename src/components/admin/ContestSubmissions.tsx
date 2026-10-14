/**
 * Contest Submissions - Admin moderation panel
 */

import { useState } from "react";
import { useAllSubmissions, useModerateSubmission } from "@/hooks/useContest";
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
  CheckCircle2, 
  XCircle, 
  Eye,
  EyeOff,
  Clock, 
  Search,
  ExternalLink,
  Star,
  Download
} from "lucide-react";
import { format } from "date-fns";
import type { SubmissionStatus } from "@/types";
import { getSafeExternalLinkProps } from "@/lib/urlValidation";

interface ContestSubmissionsProps {
  eventId: string;
}

export function ContestSubmissions({ eventId }: ContestSubmissionsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | "all">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [showModerateDialog, setShowModerateDialog] = useState(false);
  const [moderationReason, setModerationReason] = useState("");

  const { data: submissions, isLoading } = useAllSubmissions(eventId, {
    status: filterStatus === "all" ? undefined : filterStatus,
  });
  const moderateSubmission = useModerateSubmission();

  const filteredSubmissions = submissions?.filter((s) =>
    s.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.projectDescription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleModerate = (submission: any) => {
    setSelectedSubmission(submission);
    setModerationReason(submission.moderationReason || "");
    setShowModerateDialog(true);
  };

  const handleSubmitModeration = async (status: SubmissionStatus) => {
    if (!selectedSubmission) return;

    await moderateSubmission.mutateAsync({
      submissionId: selectedSubmission.id,
      status,
      reason: moderationReason || undefined,
    });

    setShowModerateDialog(false);
    setSelectedSubmission(null);
    setModerationReason("");
  };

  const handleExportCSV = () => {
    if (!submissions) return;

    const csv = [
      ["Project Name", "Participant", "Live URL", "Repo URL", "Status", "Avg Rating", "Rating Count", "Submitted At"],
      ...submissions.map(s => [
        s.projectName,
        s.participantName || "Unknown",
        s.liveUrl,
        s.repoUrl || "",
        s.status,
        s.avgRating.toFixed(2),
        s.ratingCount.toString(),
        format(new Date(s.submittedAt), "yyyy-MM-dd HH:mm:ss"),
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contest-submissions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submission Management</CardTitle>
              <CardDescription>
                Moderate and manage all contest submissions
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV} disabled={!submissions || submissions.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by project name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending_moderation">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{submissions?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {submissions?.filter(s => s.status === "approved").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {submissions?.filter(s => s.status === "pending_moderation").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {submissions?.filter(s => s.status === "rejected").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {submissions?.filter(s => s.status === "hidden").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Hidden</div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions && filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{submission.projectName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {submission.projectDescription.slice(0, 50)}...
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {submission.participantName || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {submission.status === "approved" && (
                          <Badge className="bg-green-600">Approved</Badge>
                        )}
                        {submission.status === "pending_moderation" && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        {submission.status === "rejected" && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                        {submission.status === "hidden" && (
                          <Badge variant="outline">Hidden</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{submission.avgRating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">
                            ({submission.ratingCount})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(submission.submittedAt), "MMM d")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={submission.liveUrl} {...getSafeExternalLinkProps()}>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleModerate(submission)}
                        >
                          Moderate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No submissions match your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Dialog */}
      <Dialog open={showModerateDialog} onOpenChange={setShowModerateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Moderate Submission</DialogTitle>
            <DialogDescription>
              Review and update the status of this submission
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <Label>Project Name</Label>
                <p className="text-sm font-medium">{selectedSubmission.projectName}</p>
              </div>
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">{selectedSubmission.projectDescription}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Participant</Label>
                  <p className="text-sm">{selectedSubmission.participantName || "Unknown"}</p>
                </div>
                <div>
                  <Label>Current Status</Label>
                  <p className="text-sm capitalize">{selectedSubmission.status.replace("_", " ")}</p>
                </div>
              </div>
              <div>
                <Label>Links</Label>
                <div className="flex gap-2 mt-1">
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedSubmission.liveUrl} {...getSafeExternalLinkProps()}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Live Website
                    </a>
                  </Button>
                  {selectedSubmission.repoUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedSubmission.repoUrl} {...getSafeExternalLinkProps()}>
                        Repository
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Moderation Reason</Label>
                <Textarea
                  id="reason"
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Add a reason for rejection or hiding..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowModerateDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmitModeration("hidden")}
              disabled={moderateSubmission.isPending}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Hide
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSubmitModeration("rejected")}
              disabled={moderateSubmission.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleSubmitModeration("approved")}
              disabled={moderateSubmission.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
