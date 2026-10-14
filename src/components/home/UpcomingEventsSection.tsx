import { Link } from "react-router-dom";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getPublishedEvents } from "@/services/events";
import { format } from "date-fns";
import type { ClubEvent } from "@/types";

export function UpcomingEventsSection() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["upcoming-events-home"],
    queryFn: getPublishedEvents,
  });

  const upcomingEvents = (events ?? []).filter(
    (e: ClubEvent) => e.isUpcoming
  ).slice(0, 6);

  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="mb-2 text-3xl font-bold md:text-4xl">Upcoming Events</h2>
            <p className="text-muted-foreground">Don't miss out on these exciting opportunities</p>
          </div>
          <Link to="/events">
            <Button variant="outline" className="gap-2">
              View All Events
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="group overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
              >
                {/* Event Image */}
                <div className="relative h-40 bg-gradient-to-br from-primary/20 to-secondary/20">
                  {event.bannerImage && (
                    <img
                      src={event.bannerImage}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {event.category && (
                    <Badge
                      className="absolute right-3 top-3"
                      style={{ backgroundColor: event.category.color ?? undefined }}
                    >
                      {event.category.name}
                    </Badge>
                  )}
                </div>

                {/* Event Details */}
                <div className="p-5">
                  <h3 className="mb-2 text-lg font-semibold line-clamp-1 group-hover:text-primary">
                    {event.title}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                    {event.shortDescription || event.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(event.eventDate), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{event.isOnline ? "Online" : event.venue || "TBA"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Upcoming Events</h3>
            <p className="mb-4 text-muted-foreground">
              Stay tuned! New events are being planned.
            </p>
            <Link to="/events">
              <Button>Explore Events</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
