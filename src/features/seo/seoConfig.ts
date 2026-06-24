// Centralized SEO configuration + per-route metadata.
// Drives the <Seo /> component via React Helmet Async.

export const SITE_NAME = "Unstop Igniters Club";

/** Base site URL — from VITE_SITE_URL env, falls back to current origin. */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  (typeof window !== "undefined" ? window.location.origin : "https://uic.example.com");

export const DEFAULT_TITLE = "Unstop Igniters Club | SRM University AP";

export const DEFAULT_DESCRIPTION =
  "Official website of Unstop Igniters Club at SRM University AP. Explore events, workshops, competitions, and community activities.";

export const DEFAULT_KEYWORDS = [
  "Unstop Club",
  "SRM AP",
  "Igniters Club",
  "SRM University AP",
  "Student Club",
  "Hackathons",
  "Competitions",
  "Workshops",
].join(", ");

export const DEFAULT_OG_IMAGE = "/og-image.jpg";

export interface PageSeo {
  /** Full page title (already includes the suffix where appropriate). */
  title: string;
  description: string;
  /** Path relative to the site root, e.g. "/events". */
  path: string;
  /** og:type — "website" for most pages, "article" for event detail. */
  type?: "website" | "article";
  /** Override OG image (absolute or root-relative). */
  image?: string;
  /** Set false to skip indexing (e.g. admin pages). */
  indexable?: boolean;
}

/** Build a title with the site suffix. */
export function withSuffix(page: string): string {
  return `${page} | ${SITE_NAME}`;
}

/** Per-route SEO defaults. Event/team detail pages build their own dynamically. */
export const ROUTE_SEO: Record<string, Omit<PageSeo, "path">> = {
  "/": {
    title: "Unstop Igniters Club | SRM AP",
    description: DEFAULT_DESCRIPTION,
  },
  "/events": {
    title: withSuffix("Events"),
    description:
      "Browse upcoming and past events, workshops, hackathons, and competitions hosted by the Unstop Igniters Club at SRM University AP.",
  },
  "/gallery": {
    title: withSuffix("Event Gallery"),
    description:
      "Photos and videos from past Unstop Igniters Club events at SRM University AP — hackathons, workshops, and community activities.",
  },
  "/team": {
    title: withSuffix("Meet Our Team"),
    description:
      "Meet the passionate students driving the Unstop Igniters Club at SRM University AP.",
  },
  "/about": {
    title: withSuffix("About Us"),
    description:
      "Learn about the Unstop Igniters Club at SRM University AP — our mission, vision, and journey as an official Unstop campus chapter.",
  },
  "/contact": {
    title: withSuffix("Contact Us"),
    description:
      "Get in touch with the Unstop Igniters Club at SRM University AP for collaborations, queries, and partnerships.",
  },
  "/auth": {
    title: withSuffix("Sign In"),
    description: "Sign in to the Unstop Igniters Club with Google.",
    indexable: false,
  },
  "/profile": {
    title: withSuffix("Profile"),
    description: "Your Unstop Igniters Club profile.",
    indexable: false,
  },
};

/** Resolve the SEO config for a pathname; falls back to defaults. */
export function seoForPath(path: string): PageSeo {
  const entry = ROUTE_SEO[path];
  if (entry) return { ...entry, path };
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path,
  };
}
