// Date/day formatting for events and certificates.
//
// Weekday names are always derived from the stored timestamp with date-fns —
// never typed by hand and never stored alongside the date. Timestamps come back
// from Supabase as ISO strings with an offset, so `new Date(iso)` renders in the
// viewer's local zone, matching how the rest of the site already formats dates.
import { format, formatDistanceToNowStrict, isValid } from "date-fns";

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date : null;
}

/** `12 September 2026` */
export function formatEventDate(value: string | null | undefined): string | null {
  const date = toDate(value);
  return date ? format(date, "d MMMM yyyy") : null;
}

/** `12 Sep 2026` — for tighter card layouts. */
export function formatShortDate(value: string | null | undefined): string | null {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy") : null;
}

/** `Saturday` — always calculated from the date itself. */
export function formatEventDay(value: string | null | undefined): string | null {
  const date = toDate(value);
  return date ? format(date, "EEEE") : null;
}

/** `6:30 PM` */
export function formatEventTime(value: string | null | undefined): string | null {
  const date = toDate(value);
  return date ? format(date, "h:mm a") : null;
}

/** `in 3 days` / `2 months ago` — for countdowns on event cards. */
export function formatRelative(value: string | null | undefined): string | null {
  const date = toDate(value);
  if (!date) return null;
  const distance = formatDistanceToNowStrict(date);
  return date.getTime() > Date.now() ? `in ${distance}` : `${distance} ago`;
}

/** ISO date for `<time dateTime>` attributes. */
export function toDateTimeAttr(value: string | null | undefined): string | undefined {
  const date = toDate(value);
  return date ? date.toISOString() : undefined;
}
