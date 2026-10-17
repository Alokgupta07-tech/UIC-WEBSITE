/**
 * ContestSettingsAdmin — Contest lifecycle, deadline, and feature controls
 */

import { useState, useEffect } from "react";
import { useContestEventSettings, useUpdateContestEventSettings } from "@/hooks/useContest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings, 
  Save, 
  Clock, 
  Globe, 
  Users, 
  Sparkles, 
  Lock, 
  Unlock, 
  Trophy,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import type { ContestStatus } from "@/types";

interface ContestSettingsAdminProps {
  eventId: string;
}

export function ContestSettingsAdmin({ eventId }: ContestSettingsAdminProps) {
  const { data: settings, isLoading } = useContestEventSettings(eventId);
  const updateSettingsMutation = useUpdateContestEventSettings();

  const [contestStatus, setContestStatus] = useState<ContestStatus>("draft");
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const [isGalleryPublished, setIsGalleryPublished] = useState(true);
  const [isLeaderboardPublished, setIsLeaderboardPublished] = useState(false);
  const [minRatings, setMinRatings] = useState(1);
  const [externalUrl, setExternalUrl] = useState("");

  useEffect(() => {
    if (settings) {
      setContestStatus(settings.contestStatus || "draft");
      setIsSubmissionsOpen(settings.isSubmissionsOpen ?? false);
      setIsRatingsOpen(settings.isRatingsOpen ?? false);
      setIsGalleryPublished(settings.isGalleryPublished ?? true);
      setIsLeaderboardPublished(settings.isLeaderboardPublished ?? false);
      setMinRatings(settings.minRatingsForRanking ?? 1);
      setExternalUrl(settings.externalRegistrationUrl || "");
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettingsMutation.mutateAsync({
      eventId,
      settings: {
        contest_status: contestStatus,
        is_submissions_open: isSubmissionsOpen,
        is_ratings_open: isRatingsOpen,
        is_gallery_published: isGalleryPublished,
        is_leaderboard_published: isLeaderboardPublished,
        min_ratings_for_ranking: minRatings,
        external_registration_url: externalUrl.trim() || null,
      },
    });
  };

  const statusDescriptions: Record<ContestStatus, string> = {
    draft: "Draft mode — Only admins can see the contest page.",
    published: "Contest published — Overview and guidelines are public.",
    verification_open: "Registration verification is open for participants.",
    submissions_open: "Participants can now submit their websites.",
    submissions_closed: "Submissions closed — Review / evaluation window.",
    ratings_open: "Peer ratings active — Verified participants rate submissions.",
    ratings_closed: "Rating concluded — Final calculation and auditing.",
    results_published: "Leaderboard & winners announced publicly.",
    completed: "Contest completed and archived.",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Contest Lifecycle & Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure phase controls, submission access, peer rating windows, and leaderboard visibility
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateSettingsMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lifecycle Phase Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              Contest Phase & Status
            </CardTitle>
            <CardDescription>
              Sets the official phase of the contest across all user-facing pages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Active Contest Phase</Label>
              <Select value={contestStatus} onValueChange={(val: any) => setContestStatus(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (Admin Only)</SelectItem>
                  <SelectItem value="published">Published (Upcoming)</SelectItem>
                  <SelectItem value="verification_open">Registration / Verification Open</SelectItem>
                  <SelectItem value="submissions_open">Website Submissions Open</SelectItem>
                  <SelectItem value="submissions_closed">Submissions Closed</SelectItem>
                  <SelectItem value="ratings_open">Peer Ratings Active</SelectItem>
                  <SelectItem value="ratings_closed">Ratings Closed (Auditing)</SelectItem>
                  <SelectItem value="results_published">Official Results Published</SelectItem>
                  <SelectItem value="completed">Contest Completed / Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {statusDescriptions[contestStatus]}
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label>Unstop Registration Link</Label>
              <Input
                placeholder="https://unstop.com/competitions/..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                External event link displayed to visitors who need to register on Unstop.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature Access Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Unlock className="h-5 w-5 text-emerald-500" />
              Feature Switches
            </CardTitle>
            <CardDescription>
              Toggle specific features on or off regardless of current phase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 divide-y">
            {/* Submissions Switch */}
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Allow Website Submissions</Label>
                <p className="text-xs text-muted-foreground">
                  Verified participants can submit their live projects
                </p>
              </div>
              <Switch checked={isSubmissionsOpen} onCheckedChange={setIsSubmissionsOpen} />
            </div>

            {/* Ratings Switch */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Allow Peer Ratings</Label>
                <p className="text-xs text-muted-foreground">
                  Eligible participants can rate other submissions (1-5 stars)
                </p>
              </div>
              <Switch checked={isRatingsOpen} onCheckedChange={setIsRatingsOpen} />
            </div>

            {/* Gallery Switch */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Publish Gallery</Label>
                <p className="text-xs text-muted-foreground">
                  Show approved participant websites on the contest page
                </p>
              </div>
              <Switch checked={isGalleryPublished} onCheckedChange={setIsGalleryPublished} />
            </div>

            {/* Leaderboard Switch */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Publish Leaderboard</Label>
                <p className="text-xs text-muted-foreground">
                  Show public rankings and Top 5 leaderboard on the contest page
                </p>
              </div>
              <Switch checked={isLeaderboardPublished} onCheckedChange={setIsLeaderboardPublished} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Ranking Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Ranking & Leaderboard Settings
          </CardTitle>
          <CardDescription>
            Configure thresholds and fairness rules for leaderboard inclusion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="min-ratings">Minimum Ratings for Official Rank</Label>
              <Input
                id="min-ratings"
                type="number"
                min={0}
                max={20}
                value={minRatings}
                onChange={(e) => setMinRatings(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Submissions with fewer ratings are marked "Provisional" until reaching this threshold.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t flex items-center justify-between py-3">
          <span className="text-xs text-muted-foreground">
            Changes will take effect immediately upon saving.
          </span>
          <Button size="sm" onClick={handleSave} disabled={updateSettingsMutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
