import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, MapPin, Clock, ArrowLeft, Globe, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getEvent } from "@/services/events";
import { Seo } from "@/components/seo/Seo";
import { Reveal } from "@/components/shared/Reveal";
import { useOrganizationJsonLd, eventJsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, withSuffix } from "@/features/seo/seoConfig";
import { isPast, format } from "date-fns";
import { Helmet } from "react-helmet-async";

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
  });

  const orgJsonLd = useOrganizationJsonLd();

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-4xl animate-pulse space-y-8">
            <div className="h-8 w-32 rounded bg-muted" />
            <div className="h-64 rounded-2xl bg-muted" />
            <div className="space-y-4">
              <div className="h-10 w-3/4 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <Seo title="Event Not Found | Unstop Igniters Club" description="The event you're looking for doesn't exist." path="/events" />
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-2xl font-bold">Event Not Found</h1>
            <p className="mb-6 text-muted-foreground">The event you're looking for doesn't exist.</p>
            <Link to="/events">
              <Button>View All Events</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const isEventPast = isPast(new Date(event.eventDate));

  // Registration is considered closed only once the deadline day has fully
  // elapsed in the viewer's local timezone. A date-only string like
  // "2026-06-25" parses as midnight UTC, which (in UTC+ timezones) is "before"
  // the same local day — so we normalize to end-of-day before comparing.
  const isRegistrationClosed = event.registrationDeadline
    ? (() => {
        const deadline = new Date(event.registrationDeadline);
        deadline.setHours(23, 59, 59, 999); // end of deadline day (local time)
        return deadline < new Date();
      })()
    : !event.isUpcoming;

  // Prefer the Unstop registration link, fall back to the meeting link.
  const registrationLink = event.unstopRegistrationLink ?? event.meetingLink ?? null;

  const siteUrl = SITE_URL;
  const seoTitle = withSuffix(event.title);

  return (
    <Layout>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={event.shortDescription || event.description || `Details for ${event.title}`} />
      </Helmet>
      <Seo
        title={seoTitle}
        description={event.shortDescription || event.description || `Details for ${event.title}`}
        path={`/events/${event.id}`}
        type="article"
        image={event.bannerImage || undefined}
        jsonLd={[orgJsonLd, eventJsonLd(event), breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Events", path: "/events" },
          { name: event.title, path: `/events/${event.id}` },
        ])]}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Back Button */}
          <Link
            to="/events"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Link>

          {/* Event Image */}
          <Reveal>
            <div className="relative mb-8 h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 md:h-80">
              {event.bannerImage && (
                <img
                  src={event.bannerImage}
                  alt={event.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute left-4 top-4 flex gap-2">
                {event.category && (
                  <Badge
                    className="text-sm"
                    style={{ backgroundColor: event.category.color || undefined }}
                  >
                    {event.category.name}
                  </Badge>
                )}
                {isEventPast && <Badge variant="secondary">Past Event</Badge>}
                {event.isOnline && <Badge className="bg-secondary">Online</Badge>}
              </div>
            </div>
          </Reveal>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Reveal>
                <h1 className="mb-4 text-3xl font-bold md:text-4xl">{event.title}</h1>

                {event.shortDescription && (
                  <p className="mb-6 text-lg text-muted-foreground">{event.shortDescription}</p>
                )}

                <div className="prose prose-neutral max-w-none dark:prose-invert">
                  <h3>About This Event</h3>
                  <p>{event.description || "Details coming soon..."}</p>
                </div>
              </Reveal>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Reveal delay={0.1}>
                <div className="rounded-2xl border bg-card p-6">
                  <h3 className="mb-4 font-semibold">Event Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary" aria-hidden />
                      <div>
                        <p className="font-medium">
                          {format(new Date(event.eventDate), "EEEE, MMMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.eventDate), "h:mm a")}
                          {event.endDate && ` – ${format(new Date(event.endDate), "h:mm a")}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      {event.isOnline ? (
                        <Globe className="h-5 w-5 text-primary" aria-hidden />
                      ) : (
                        <MapPin className="h-5 w-5 text-primary" aria-hidden />
                      )}
                      <div>
                        <p className="font-medium">
                          {event.isOnline ? "Online Event" : event.venue || "Venue TBA"}
                        </p>
                        {event.location && (
                          <p className="text-sm text-muted-foreground">{event.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/*
                Register / Registration Closed / Event Ended
                - Event already over → "Event Has Ended"
                - Deadline (or upcoming status) passed → "Registration Closed"
                - Open with a link → "Register Now"
                - Open but no link yet → "Register Now" disabled w/ tooltip
              */}
              <Reveal delay={0.15}>
                {isEventPast ? (
                  <Button size="lg" className="w-full" disabled>
                    Event Has Ended
                  </Button>
                ) : isRegistrationClosed ? (
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    disabled
                  >
                    Registration Closed
                  </Button>
                ) : registrationLink ? (
                  <a
                    href={registrationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      size="lg"
                      className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Register Now
                    </Button>
                  </a>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* Wrapper span so hover still fires while the button is disabled */}
                        <span className="block w-full">
                          <Button
                            size="lg"
                            className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                            disabled
                          >
                            Register Now
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Registration link coming soon</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Mark My Attendance Button */}
                <Link to={`/attendance?event=${event.id}`} className="block mt-4">
                  <Button variant="outline" size="lg" className="w-full">
                    Mark My Attendance
                  </Button>
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventDetail;
