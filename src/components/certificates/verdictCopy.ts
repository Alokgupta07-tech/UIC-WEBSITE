import { AlertTriangle, BadgeCheck, HelpCircle, XCircle, type LucideIcon } from "lucide-react";
import type { CertificateVerdict } from "@/types";

export interface VerdictPresentation {
  icon: LucideIcon;
  heading: string;
  detail: string;
  /** Classes for the banner wrapper. */
  wrapper: string;
  /** Classes for the leading icon. */
  iconClass: string;
}

/**
 * User-facing copy for each verification verdict.
 *
 * Deliberately plain language: the member never sees an internal error code, a
 * database message or an API URL.
 */
export const VERDICT_PRESENTATION: Record<CertificateVerdict, VerdictPresentation> = {
  verified: {
    icon: BadgeCheck,
    heading: "Certificate Verified",
    detail: "This certificate is authentic and was issued by the Unstop Igniters Club.",
    wrapper: "border-success/40 bg-success/10",
    iconClass: "text-success",
  },
  revoked: {
    icon: AlertTriangle,
    heading: "Certificate revoked",
    detail:
      "This certificate was issued but has since been revoked, so it is no longer valid.",
    wrapper: "border-warning/40 bg-warning/10",
    iconClass: "text-warning",
  },
  expired: {
    icon: AlertTriangle,
    heading: "Certificate unavailable",
    detail: "This certificate is no longer available for verification.",
    wrapper: "border-warning/40 bg-warning/10",
    iconClass: "text-warning",
  },
  invalid: {
    icon: XCircle,
    heading: "Invalid Certificate",
    detail: "This code is not a valid UIC certificate.",
    wrapper: "border-destructive/40 bg-destructive/10",
    iconClass: "text-destructive",
  },
  not_found: {
    icon: HelpCircle,
    heading: "Certificate not found",
    detail:
      "We could not find a UIC certificate for this code. Check that you scanned the QR code on an official UIC certificate.",
    wrapper: "border-destructive/40 bg-destructive/10",
    iconClass: "text-destructive",
  },
};

export function verdictHeading(verdict: CertificateVerdict): string {
  return VERDICT_PRESENTATION[verdict].heading;
}
