import { Link } from "react-router-dom";
import { Award, CalendarDays, Clock, MapPin, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AttendedBadge,
  EventStateBadge,
  RegisteredBadge,
} from "@/components/dashboard/StatusBadge";
import {
  formatEventDate,
  formatEventDay,
  formatEventTime,
  formatRelative,
  toDateTimeAttr,
} from "@/lib/dates";
import type { Certificate, MemberEvent } from "@/types";

interface MemberEventCardProps {
  item: MemberEvent;
  /** Rendered for past events so the member can jump straight to a certificate. */
  onViewCertificate?: (certificate: Certificate) => void;
}

/**
 * One event on the member dashboard.
 *
 * Badges reflect stored records only: "Registered" needs a registration row and
 * "Attended" needs a real attendance record. Date and weekday are both derived
 * from the event's stored timestamp.
 */
export function MemberEventCard({ item, onViewCertificate }: MemberEventCardProps) {
  const { event, state, isRegistered, hasAttended, certificates } = item;

  const date = formatEventDate(event.eventDate);
  const day = formatEventDay(event.eventDate);
  const time = formatEventTime(event.eventDate);
  const countdown = state === "upcoming" || state === "today" ? formatRelative(event.eventDate) : null;
  const venue = event.isOnline ? "Online" : event.venue || event.location || "Venue to be announced";

  const validCertificate = certificates.find((certificate) => certificate.status === "issued");

  return (
    <article className="card-hover group flex flex-col overflow-hidden rounded-2xl border bg-card">
      <Link
        to={`/events/${event.id}`}
        className="block focus-visible:outline-none"
        aria-label={`View ${event.title}`}
      >
        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
          {event.bannerImage && (
            <img
              src={event.bannerImage}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
            />
          )}
          <div className="absolute left-3 top-3">
            <EventStateBadge state={state} />
          </div>
          {event.category && (
            <Badge
              className="absolute right-3 top-3 border-transparent"
              style={{ backgroundColor: event.category.color || undefined }}
            >
              {event.category.name}
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 line-clamp-2 font-semibold leading-snug">
          <Link
            to={`/events/${event.id}`}
            className="transition-colors hover:text-primary focus-visible:text-primary"
          >
            {event.title}
          </Link>
        </h3>

        <dl className="mb-3 space-y-1.5 text-sm text-muted-foreground">
          {date && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              <dt className="sr-only">Date</dt>
              <dd className="min-w-0 truncate">
                <time dateTime={toDateTimeAttr(event.eventDate)}>{date}</time>
                {day && <span className="text-muted-foreground/80"> · {day}</span>}
              </dd>
            </div>
          )}
          {time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              <dt className="sr-only">Time</dt>
              <dd>{time}</dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <dt className="sr-only">Venue</dt>
            <dd className="min-w-0 truncate">{venue}</dd>
          </div>
          {countdown && (
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 shrink-0" aria-hidden />
              <dt className="sr-only">Starts</dt>
              <dd>Starts {countdown}</dd>
            </div>
          )}
        </dl>

        <div className="mb-4 flex flex-wrap gap-2">
          {isRegistered && <RegisteredBadge />}
          {hasAttended && <AttendedBadge />}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Link to={`/events/${event.id}`} className="flex-1 min-w-[8rem]">
            <Button variant="outline" size="sm" className="w-full">
              View Event
            </Button>
          </Link>

          {validCertificate && onViewCertificate && (
            <Button
              size="sm"
              className="flex-1 min-w-[8rem] gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              onClick={() => onViewCertificate(validCertificate)}
            >
              <Award className="h-4 w-4" aria-hidden />
              Certificate
            </Button>
          )}
        </div>

        {state === "past" && certificates.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Certificate: not issued yet
          </p>
        )}
      </div>
    </article>
  );
}
