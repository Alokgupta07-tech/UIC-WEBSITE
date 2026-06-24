import { SITE_NAME, SITE_URL } from "@/features/seo/seoConfig";
import { useSettings } from "@/contexts/SettingsContext";
import type { ClubEvent } from "@/types";
import type { SocialLinks } from "@/types";

function absolute(pathOrUrl: string | null | undefined, siteUrl: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Organization JSON-LD — render once on public pages. */
export function organizationJsonLd() {
  const siteUrl = SITE_URL;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    description:
      "Official Unstop Igniters Club at SRM University AP — events, workshops, competitions, and community activities.",
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    sameAs: [] as string[],
  };
}

/** Organization JSON-LD enriched with social links from settings. */
export function useOrganizationJsonLd() {
  const { settings } = useSettings();
  const siteUrl = settings.siteUrl?.replace(/\/$/, "") || SITE_URL;
  const social: SocialLinks = settings.social;
  const sameAs = [
    social.instagram,
    social.linkedin,
    social.youtube,
    social.whatsappCommunity,
  ].filter((u): u is string => !!u);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    description:
      "Official Unstop Igniters Club at SRM University AP — events, workshops, competitions, and community activities.",
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    sameAs,
  };
}

/** Breadcrumb JSON-LD from a list of { name, path } segments. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const siteUrl = SITE_URL;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path.startsWith("/") ? "" : "/"}${item.path}`,
    })),
  };
}

/** Event JSON-LD for an event detail page. */
export function eventJsonLd(event: ClubEvent) {
  const startISO = new Date(event.eventDate).toISOString();
  const endISO = event.endDate ? new Date(event.endDate).toISOString() : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.shortDescription || event.description || undefined,
    startDate: startISO,
    ...(endISO ? { endDate: endISO } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: event.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    ...(event.bannerImage ? { image: [absolute(event.bannerImage, SITE_URL)] } : {}),
    ...(event.venue || event.isOnline
      ? {
          location: {
            "@type": event.isOnline ? "VirtualLocation" : "Place",
            ...(event.isOnline
              ? { url: event.unstopRegistrationLink || undefined }
              : { name: event.venue || "TBA" }),
          },
        }
      : {}),
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    ...(event.unstopRegistrationLink
      ? { url: event.unstopRegistrationLink }
      : {}),
  };
}
