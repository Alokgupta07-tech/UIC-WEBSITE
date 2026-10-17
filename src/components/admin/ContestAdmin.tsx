/**
 * Contest Admin - Main admin panel with tabs
 * Integrates all 6 contest management modules
 */

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Users, 
  FileCheck, 
  Star, 
  Trophy, 
  Settings,
  Calendar
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContestOverview } from "./ContestOverview";
import { ContestParticipants } from "./ContestParticipants";
import { ContestSubmissions } from "./ContestSubmissions";
import { ContestRatings } from "./ContestRatings";
import { ContestLeaderboardAdmin } from "./ContestLeaderboardAdmin";
import { ContestSettingsAdmin } from "./ContestSettingsAdmin";
import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/services/events";

export function ContestAdmin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  // Fetch all events
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  // Identify contest events or fallback
  const contestEvents = useMemo(() => {
    if (!events) return [];
    return events;
  }, [events]);

  const defaultContestEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    return (
      events.find((e) =>
        e.title.toLowerCase().includes("vibe coding contest") ||
        e.title.toLowerCase().includes("coding contest") ||
        e.title.toLowerCase().includes("contest") ||
        e.title.toLowerCase().includes("hackathon")
      ) || events[0]
    );
  }, [events]);

  const activeEvent = useMemo(() => {
    if (selectedEventId) {
      return events?.find((e) => e.id === selectedEventId) || defaultContestEvent;
    }
    return defaultContestEvent;
  }, [events, selectedEventId, defaultContestEvent]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading contest administrative console...
        </CardContent>
      </Card>
    );
  }

  if (!activeEvent) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
          <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create an event in the <strong>Add Event</strong> tab (e.g., "Vibe Coding Contest") to begin managing participants, submissions, and ratings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const eventId = activeEvent.id;

  return (
    <div className="space-y-6">
      {/* Top Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="h-7 w-7 text-amber-500" />
            Contest & Hackathon Administration
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage participants, submissions, peer reviews, anti-fraud moderation, and awards
          </p>
        </div>

        {events && events.length > 1 && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={eventId}
              onValueChange={(val) => setSelectedEventId(val)}
            >
              <SelectTrigger className="w-[240px] sm:w-[280px]">
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 py-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-1.5 py-2">
            <Users className="h-4 w-4" />
            <span>Participants</span>
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-1.5 py-2">
            <FileCheck className="h-4 w-4" />
            <span>Submissions</span>
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-1.5 py-2">
            <Star className="h-4 w-4" />
            <span>Ratings</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-1.5 py-2">
            <Trophy className="h-4 w-4" />
            <span>Leaderboard</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 py-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
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
          <ContestRatings eventId={eventId} />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <ContestLeaderboardAdmin eventId={eventId} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <ContestSettingsAdmin eventId={eventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default ContestAdmin;
