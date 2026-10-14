/**
 * Contest Admin - Main admin panel with tabs
 * Integrates all 6 contest management modules
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Users, 
  FileCheck, 
  Star, 
  Trophy, 
  Settings 
} from "lucide-react";
import { ContestOverview } from "./ContestOverview";
import { ContestParticipants } from "./ContestParticipants";
import { ContestSubmissions } from "./ContestSubmissions";
import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/services/events";

export function ContestAdmin() {
  const [activeTab, setActiveTab] = useState("overview");

  // Find the Vibe Coding Contest event
  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  const contestEvent = events?.find((e) => 
    e.title.toLowerCase().includes("vibe coding contest") || 
    e.title.toLowerCase().includes("coding contest")
  );

  if (!contestEvent) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
          <h3 className="text-lg font-semibold mb-2">No Contest Event Found</h3>
          <p className="text-muted-foreground">
            Create an event with "Vibe Coding Contest" in the title to enable contest management.
          </p>
        </CardContent>
      </Card>
    );
  }

  const eventId = contestEvent.id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Trophy className="h-8 w-8" />
          Vibe Coding Contest Administration
        </h2>
        <p className="text-muted-foreground mt-2">
          Manage participants, submissions, ratings, and contest settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Participants</span>
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Submissions</span>
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Ratings</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ContestOverview eventId={eventId} />
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <ContestParticipants eventId={eventId} />
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <ContestSubmissions eventId={eventId} />
        </TabsContent>

        <TabsContent value="ratings" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">Rating Management</h3>
              <p className="text-muted-foreground">
                Rating audit and moderation features coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                All ratings are validated at the database level with automatic aggregate updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">Leaderboard Management</h3>
              <p className="text-muted-foreground">
                Results management and publication controls coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                The leaderboard automatically updates based on ratings and is accessible to participants.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">Contest Settings</h3>
              <p className="text-muted-foreground">
                Lifecycle management and deadline controls coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Contest settings can be managed directly in the events table via Supabase.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
