import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Search, Filter, Clock, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublishedEvents } from "@/services/events";
import { getCategories as getCategoriesRaw } from "@/services/categories";
import { Seo } from "@/components/seo/Seo";
import { Reveal } from "@/components/shared/Reveal";
import { seoForPath } from "@/features/seo/seoConfig";
import { isPast, format } from "date-fns";
import { Helmet } from "react-helmet-async";
import type { ClubEvent, EventCategory } from "@/types";

type EventFilter = "all" | "upcoming" | "past";

const Events = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EventFilter>("upcoming");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ["events", filter],
    queryFn: getPublishedEvents,
  });

  console.log("Events:", events, error);

  if (error) {
    console.error("Events Error:", error.message);
  }

  const { data: categories } = useQuery({
    queryKey: ["event-categories"],
    queryFn: getCategoriesRaw,
  });

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !selectedCategory || event.category?.id === selectedCategory;

      const isEventPast = isPast(new Date(event.eventDate));
      const matchesFilter =
        filter === "all" ||
        (filter === "upcoming" && !isEventPast) ||
        (filter === "past" && isEventPast);

      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [events, search, selectedCategory, filter]);

  return (
    <Layout>
      <Helmet>
        <title>Events — Unstop Igniters Club</title>
        <meta name="description" content="Workshops, hackathons, seminars" />
      </Helmet>
      <Seo {...seoForPath("/events")} />

      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Events
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Discover workshops, hackathons, and networking opportunities
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-background py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search events"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as EventFilter)}>
                <TabsList>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                  className={selectedCategory === null ? "bg-gradient-to-r from-primary to-secondary" : ""}
                >
                  All
                </Button>
                {categories?.map((cat) => (
                  <Button
                    key={cat.id}
                    size="sm"
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border bg-card p-12 text-center text-red-500">
              <p>Failed to load events: {error.message}</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event, index) => {
                const isEventPast = isPast(new Date(event.eventDate));
                return (
                  <Reveal key={event.id} delay={index * 0.05}>
                    <div className="group overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
                      {/* Event Image */}
                      <Link to={`/events/${event.id}`} className="block">
                        <div className="relative h-44 bg-gradient-to-br from-primary/20 to-secondary/20">
                          {event.bannerImage && (
                            <img
                              src={event.bannerImage}
                              alt={event.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute right-3 top-3 flex gap-2">
                            {event.category && (
                              <Badge
                                style={{ backgroundColor: event.category.color || undefined }}
                              >
                                {event.category.name}
                              </Badge>
                            )}
                            {isEventPast && <Badge variant="secondary">Past Event</Badge>}
                          </div>
                          {event.isOnline && (
                            <Badge className="absolute left-3 top-3 bg-secondary">Online</Badge>
                          )}
                        </div>
                      </Link>

                      {/* Event Details */}
                      <div className="p-5">
                        <Link to={`/events/${event.id}`}>
                          <h3 className="mb-2 text-lg font-semibold line-clamp-1 group-hover:text-primary">
                            {event.title}
                          </h3>
                        </Link>
                        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                          {event.shortDescription || event.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" aria-hidden />
                            <span>{format(new Date(event.eventDate), "MMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" aria-hidden />
                            <span>{format(new Date(event.eventDate), "h:mm a")}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" aria-hidden />
                            <span>{event.isOnline ? "Online" : event.venue || "TBA"}</span>
                          </div>
                        </div>

                        {event.unstopRegistrationLink && (
                          <div className="mt-3 pt-3 border-t">
                            <span className="text-xs text-primary font-medium flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              Registration via Unstop
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Filter className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Events Found</h3>
              <p className="mb-4 text-muted-foreground">
                {search || selectedCategory
                  ? "Try adjusting your filters"
                  : "Stay tuned for upcoming events!"}
              </p>
              {(search || selectedCategory) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Events;
