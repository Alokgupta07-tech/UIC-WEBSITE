import { SITE_URL } from "@/features/seo/seoConfig";

export const VERIFY_PATH = "/verify/certificate";

/** Absolute link to the public verification page for an opaque certificate token. */
export function buildVerificationUrl(token: string): string {
  return `${SITE_URL}${VERIFY_PATH}/${token}`;
}
