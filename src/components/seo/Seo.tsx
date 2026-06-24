import { Helmet } from "react-helmet-async";
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  type PageSeo,
} from "@/features/seo/seoConfig";
import { useSettings } from "@/contexts/SettingsContext";

interface SeoProps extends PageSeo {
  /** Optional JSON-LD object(s) to inject. */
  jsonLd?: object | object[];
}

function absoluteUrl(pathOrUrl: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Page-level SEO: title, description, canonical, OG, Twitter, optional JSON-LD. */
export function Seo({ title, description, path, type = "website", image, indexable = true, jsonLd }: SeoProps) {
  const { settings } = useSettings();

  // Prefer the admin-configured site URL, fall back to the compiled-in one.
  const siteUrl = settings.siteUrl?.replace(/\/$/, "") || SITE_URL;
  const canonical = absoluteUrl(path, siteUrl);

  const ogImageInput = image || settings.siteOgImage || DEFAULT_OG_IMAGE;
  const ogImage = absoluteUrl(ogImageInput, siteUrl);

  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={DEFAULT_KEYWORDS} />
      {indexable ? (
        <meta name="robots" content="index, follow" />
      ) : (
        <meta name="robots" content="noindex, nofollow" />
      )}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdArray.map((obj, i) => (
        <script type="application/ld+json" key={i}>
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}
