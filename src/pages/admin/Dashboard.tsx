import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays,
  CalendarClock,
  Image,
  Users,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/Reveal";
import { useSettings } from "@/contexts/SettingsContext";
import { format } from "date-fns";
import { getAllEventsAdmin } from "@/services/events";
import { getGallery } from "@/services/gallery";
import { getActiveTeam } from "@/services/team";
import { isMissingTableError } from "@/services/supabaseErrors";

interface StatCard {
  label: string;
  value: string | number;
  icon: typeof CalendarDays;
  color: string;
}

export default function AdminDashboard() {
  const { settings } = useSettings();

  // Counts
  const { data: totalEvents } = useQuery({
    queryKey: ["admin-count-events"],
    queryFn: async () => (await getAllEventsAdmin()).length,
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["admin-count-upcoming"],
    queryFn: async () => {
      const events = await getAllEventsAdmin();
      return events.filter((event) => event.status === "published" && new Date(event.eventDate) >= new Date()).length;
    },
  });

  const { data: galleryCount } = useQuery({
    queryKey: ["admin-count-gallery"],
    queryFn: async () => (await getGallery()).length,
  });

  const { data: teamCount } = useQuery({
    queryKey: ["admin-count-team"],
    queryFn: async () => (await getActiveTeam()).length,
  });

  const { data: messageCount } = useQuery({
    queryKey: ["admin-count-messages"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      if (error) {
        if (isMissingTableError(error)) return 0;
        throw error;
      }
      return count ?? 0;
    },
  });

  // Recent messages
  const { data: recentMessages } = useQuery({
    queryKey: ["admin-recent-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id, name, email, subject, created_at, is_read")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const stats: StatCard[] = [
    {
      label: "Total Events",
      value: totalEvents ?? "—",
      icon: CalendarDays,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      label: "Upcoming Events",
      value: upcomingEvents ?? "—",
      icon: CalendarClock,
      color: "text-green-500 bg-green-500/10",
    },
    {
      label: "Gallery Images",
      value: galleryCount ?? "—",
      icon: Image,
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      label: "Team Members",
      value: teamCount ?? "—",
      icon: Users,
      color: "text-orange-500 bg-orange-500/10",
    },
    {
      label: "Community Members",
      value: settings.communityMemberCount > 0
        ? `${settings.communityMemberCount}+`
        : "—",
      icon: UserCheck,
      color: "text-pink-500 bg-pink-500/10",
    },
    {
      label: "Unread Messages",
      value: messageCount ?? "—",
      icon: MessageSquare,
      color: "text-yellow-500 bg-yellow-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Unstop Igniters admin panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Reveal key={stat.label} delay={i * 0.04}>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          );
        })}
      </div>

      {/* Recent Messages */}
      <Card>
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Recent Messages</h2>
          <p className="text-sm text-muted-foreground">
            Latest messages from visitors
          </p>
        </div>
        <div className="divide-y">
          {recentMessages && recentMessages.length > 0 ? (
            recentMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{msg.name}</span>
                    {!msg.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {msg.subject || "No subject"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {msg.created_at
                    ? format(new Date(msg.created_at), "MMM d")
                    : ""}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No messages yet
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
