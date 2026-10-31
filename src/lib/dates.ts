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

/**
 * Extracts a consistent calendar date string in YYYY-MM-DD format,
 * normalized against the SRM University–AP institutional timezone (Asia/Kolkata / IST UTC+5:30).
 * Prevents UTC conversion off-by-one calendar discrepancies.
 */
export function extractDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const date = toDate(trimmed);
  if (!date) return trimmed.slice(0, 10);
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

