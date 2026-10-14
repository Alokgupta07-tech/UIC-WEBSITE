/**
 * Contest Overview - Admin Dashboard KPI Cards
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  FileCheck, 
  Star, 
  Trophy, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  TrendingUp 
} from "lucide-react";
import { useAllContestParticipants, useAllSubmissions, contestKeys } from "@/hooks/useContest";
import { supabase } from "@/integrations/supabase/client";

interface ContestOverviewProps {
  eventId: string;
}

export function ContestOverview({ eventId }: ContestOverviewProps) {
  const { data: participants, isLoading: participantsLoading } = useAllContestParticipants(eventId);
  const { data: submissions, isLoading: submissionsLoading } = useAllSubmissions(eventId, {});

  // Fetch ratings count
  const { data: ratingsData } = useQuery({
    queryKey: ["contestRatingsCount", eventId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contest_ratings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("is_valid", true);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate metrics
  const totalParticipants = participants?.length || 0;
  const verifiedParticipants = participants?.filter(p => p.verificationStatus === "verified").length || 0;
  const pendingParticipants = participants?.filter(p => p.verificationStatus === "pending").length || 0;
  const rejectedParticipants = participants?.filter(p => p.verificationStatus === "rejected").length || 0;

  const totalSubmissions = submissions?.length || 0;
  const approvedSubmissions = submissions?.filter(s => s.status === "approved").length || 0;
  const pendingSubmissions = submissions?.filter(s => s.status === "pending_moderation").length || 0;
  const rejectedSubmissions = submissions?.filter(s => s.status === "rejected").length || 0;

  const totalRatings = ratingsData || 0;
  const avgRating = submissions && submissions.length > 0
    ? submissions.reduce((sum, s) => sum + s.avgRating, 0) / submissions.length
    : 0;

  const verifiedWithoutSubmission = participants?.filter(
    p => p.verificationStatus === "verified" && !submissions?.some(s => s.userId === p.userId)
  ).length || 0;

  if (participantsLoading || submissionsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Participants",
      value: totalParticipants,
      icon: Users,
      description: `${verifiedParticipants} verified, ${pendingParticipants} pending`,
      trend: verifiedParticipants > 0 ? "positive" : "neutral",
    },
    {
      title: "Verified Participants",
      value: verifiedParticipants,
      icon: CheckCircle2,
      description: `${verifiedWithoutSubmission} haven't submitted yet`,
      trend: verifiedParticipants > 0 ? "positive" : "neutral",
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Pending Verification",
      value: pendingParticipants,
      icon: Clock,
      description: rejectedParticipants > 0 ? `${rejectedParticipants} rejected` : "Awaiting review",
      trend: pendingParticipants > 0 ? "warning" : "neutral",
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Total Submissions",
      value: totalSubmissions,
      icon: FileCheck,
      description: `${approvedSubmissions} approved, ${pendingSubmissions} pending`,
      trend: totalSubmissions > 0 ? "positive" : "neutral",
    },
    {
      title: "Approved Submissions",
      value: approvedSubmissions,
      icon: Trophy,
      description: rejectedSubmissions > 0 ? `${rejectedSubmissions} rejected` : "Published",
      trend: approvedSubmissions > 0 ? "positive" : "neutral",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Pending Moderation",
      value: pendingSubmissions,
      icon: AlertCircle,
      description: "Awaiting moderation",
      trend: pendingSubmissions > 0 ? "warning" : "neutral",
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Total Ratings Cast",
      value: totalRatings,
      icon: Star,
      description: `Across ${approvedSubmissions} submissions`,
      trend: totalRatings > 0 ? "positive" : "neutral",
    },
    {
      title: "Global Average Rating",
      value: avgRating > 0 ? avgRating.toFixed(2) : "-",
      icon: TrendingUp,
      description: "Across all submissions",
      trend: avgRating >= 4 ? "positive" : avgRating >= 3 ? "neutral" : "negative",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Contest Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color || "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.description}
                </p>
                {metric.trend && (
                  <Badge 
                    variant={
                      metric.trend === "positive" 
                        ? "default" 
                        : metric.trend === "warning" 
                        ? "secondary" 
                        : "outline"
                    }
                    className="mt-2 text-xs"
                  >
                    {metric.trend === "positive" && "Active"}
                    {metric.trend === "warning" && "Action Required"}
                    {metric.trend === "neutral" && "Monitoring"}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions Needed</CardTitle>
          <CardDescription>Items requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingParticipants > 0 && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">{pendingParticipants} participants awaiting verification</span>
              </div>
              <Badge variant="secondary">{pendingParticipants}</Badge>
            </div>
          )}
          
          {pendingSubmissions > 0 && (
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">{pendingSubmissions} submissions awaiting moderation</span>
              </div>
              <Badge variant="secondary">{pendingSubmissions}</Badge>
            </div>
          )}

          {verifiedWithoutSubmission > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{verifiedWithoutSubmission} verified participants haven't submitted</span>
              </div>
              <Badge variant="outline">{verifiedWithoutSubmission}</Badge>
            </div>
          )}

          {pendingParticipants === 0 && pendingSubmissions === 0 && verifiedWithoutSubmission === 0 && (
            <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              All caught up! No immediate actions required.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
