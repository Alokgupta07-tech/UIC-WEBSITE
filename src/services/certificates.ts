// Supabase query helpers for certificates.
//
// Reads are RLS-gated: `getMyCertificates` can only ever return rows belonging
// to the signed-in member, and `verifyCertificate` goes through a
// SECURITY DEFINER RPC that returns the public face of a certificate only.
// Nothing here trusts certificate data supplied by the client.
import { supabase } from "@/integrations/supabase/client";
import { isMissingTableError } from "@/services/supabaseErrors";
import { SITE_URL } from "@/features/seo/seoConfig";
import type {
  Certificate,
  CertificateStatus,
  CertificateVerdict,
  CertificateVerification,
} from "@/types";

/** Path of the public verification page. Kept here so the QR payload, the
 *  share link and the router all agree on one shape. */
export const VERIFY_PATH = "/verify/certificate";

/** A verification token is 32 lowercase hex characters (128 bits). */
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

const CERTIFICATE_STATUSES: CertificateStatus[] = ["issued", "revoked", "expired"];

function toCertificateStatus(value: string | null | undefined): CertificateStatus {
  return CERTIFICATE_STATUSES.includes(value as CertificateStatus)
    ? (value as CertificateStatus)
    : "expired";
}

type CertificateRow = {
  id: string;
  certificate_number: string;
  verification_token: string;
  certificate_type: string;
  status: string;
  issue_date: string;
  recipient_name: string;
  recipient_email: string | null;
  recipient_user_id: string | null;
  organizer_name: string | null;
  organizer_organization: string;
  signer_name: string | null;
  signer_designation: string | null;
  signer_signature_url: string | null;
  certificate_file_url: string | null;
  event_id: string;
  created_at: string;
  events: {
    title: string;
    event_date: string;
    venue: string | null;
    is_online: boolean | null;
    event_categories: { name: string } | null;
  } | null;
};

const SELECT_WITH_EVENT =
  "*, events:event_id(title, event_date, venue, is_online, event_categories:category_id(name))";

function mapCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    certificateNumber: row.certificate_number,
    verificationToken: row.verification_token,
    certificateType: row.certificate_type,
    status: toCertificateStatus(row.status),
    issueDate: row.issue_date,

    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    recipientUserId: row.recipient_user_id,

    organizerName: row.organizer_name,
    organizerOrganization: row.organizer_organization,

    signerName: row.signer_name,
    signerDesignation: row.signer_designation,
    signerSignatureUrl: row.signer_signature_url,

    certificateFileUrl: row.certificate_file_url,

    eventId: row.event_id,
    eventTitle: row.events?.title ?? null,
    eventDate: row.events?.event_date ?? null,
    eventVenue: row.events?.venue ?? null,
    eventIsOnline: row.events?.is_online ?? null,
    eventCategory: row.events?.event_categories?.name ?? null,

    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// QR payload handling
// ---------------------------------------------------------------------------

/**
 * Pull a UIC verification token out of raw QR content.
 *
 * Accepts either a full verification URL (any host, so a QR printed against a
 * staging domain still resolves) or a bare token. Returns `null` for anything
 * that is not a UIC certificate QR code, which is what drives the
 * "not a valid UIC certificate QR code" state in the scanner.
 */
export function extractVerificationToken(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const direct = value.toLowerCase();
  if (TOKEN_PATTERN.test(direct)) return direct;

  // Full or partial URL — only accept our own verification path.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  // Expect .../verify/certificate/<token>
  const certificateIndex = segments.lastIndexOf("certificate");
  if (certificateIndex === -1 || segments[certificateIndex - 1] !== "verify") {
    return null;
  }

  const candidate = (segments[certificateIndex + 1] ?? "").toLowerCase();
  return TOKEN_PATTERN.test(candidate) ? candidate : null;
}

/** Absolute link to the public verification page for a token. */
export function buildVerificationUrl(token: string): string {
  return `${SITE_URL}${VERIFY_PATH}/${token}`;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const NOT_FOUND: CertificateVerification = {
  verdict: "not_found",
  certificateNumber: null,
  certificateType: null,
  recipientName: null,
  eventTitle: null,
  eventDescription: null,
  eventDate: null,
  eventVenue: null,
  eventIsOnline: null,
  eventCategory: null,
  organizerName: null,
  organizerOrganization: null,
  signerName: null,
  signerDesignation: null,
  signerSignatureUrl: null,
  certificateFileUrl: null,
  issueDate: null,
  verifiedAt: new Date().toISOString(),
};

const VERDICTS: CertificateVerdict[] = [
  "verified",
  "revoked",
  "expired",
  "invalid",
  "not_found",
];

/**
 * True when the certificate system is not installed on this Supabase project —
 * either the table or the verification function is missing. PostgREST reports a
 * missing function as PGRST202, which `isMissingTableError` does not cover.
 */
function isCertificateSystemMissing(error: unknown): boolean {
  if (isMissingTableError(error)) return true;
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as { code?: string; message?: string };
  return (
    code === "PGRST202" ||
    (message ?? "").toLowerCase().includes("could not find the function")
  );
}

/**
 * Verify a certificate token against the backend.
 *
 * The verdict always comes from the database — the client never decides whether
 * a certificate is authentic. Throws only on transport failure so the caller
 * can distinguish "could not reach the server" from "not a real certificate".
 */
export async function verifyCertificate(token: string): Promise<CertificateVerification> {
  const clean = token.trim().toLowerCase();
  if (!TOKEN_PATTERN.test(clean)) {
    return { ...NOT_FOUND, verdict: "invalid", verifiedAt: new Date().toISOString() };
  }

  const { data, error } = await supabase.rpc("verify_certificate", { p_token: clean });

  if (error) {
    if (isCertificateSystemMissing(error)) {
      // Certificate system not installed on this Supabase project yet — report
      // "not found" rather than a scary failure.
      return { ...NOT_FOUND, verifiedAt: new Date().toISOString() };
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { ...NOT_FOUND, verifiedAt: new Date().toISOString() };
  }

  const verdict = VERDICTS.includes(row.verification_status as CertificateVerdict)
    ? (row.verification_status as CertificateVerdict)
    : "invalid";

  return {
    verdict,
    certificateNumber: row.certificate_number,
    certificateType: row.certificate_type,
    recipientName: row.recipient_name,
    eventTitle: row.event_title,
    eventDescription: row.event_description,
    eventDate: row.event_date,
    eventVenue: row.event_venue,
    eventIsOnline: row.event_is_online,
    eventCategory: row.event_category,
    organizerName: row.organizer_name,
    organizerOrganization: row.organizer_organization,
    signerName: row.signer_name,
    signerDesignation: row.signer_designation,
    signerSignatureUrl: row.signer_signature_url,
    certificateFileUrl: row.certificate_file_url,
    issueDate: row.issue_date,
    verifiedAt: row.verified_at ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Member reads
// ---------------------------------------------------------------------------

/**
 * Link any certificate issued to the member's email to their auth account.
 * Server-side function; it only ever touches rows matching the caller's own
 * verified email. Failures are non-fatal — the dashboard still works without
 * the link because RLS also matches on email.
 */
export async function claimMyCertificates(): Promise<number> {
  const { data, error } = await supabase.rpc("claim_my_certificates");
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

/** Certificates belonging to the signed-in member, newest issue date first. */
export async function getMyCertificates(): Promise<Certificate[]> {
  try {
    const { data, error } = await supabase
      .from("certificates")
      .select(SELECT_WITH_EVENT)
      .order("issue_date", { ascending: false });

    if (error) {
      if (isCertificateSystemMissing(error)) return [];
      throw error;
    }
    return (data as unknown as CertificateRow[]).map(mapCertificate);
  } catch (error) {
    if (isCertificateSystemMissing(error)) return [];
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Admin writes (also RLS-gated to admins server-side)
// ---------------------------------------------------------------------------

export type CertificateInput = {
  event_id: string;
  recipient_name: string;
  recipient_email?: string | null;
  certificate_type?: string;
  organizer_name?: string | null;
  organizer_organization?: string;
  signer_name?: string | null;
  signer_designation?: string | null;
  signer_signature_url?: string | null;
  certificate_file_url?: string | null;
  issue_date?: string | null;
};

export async function getAllCertificatesAdmin(eventId?: string): Promise<Certificate[]> {
  try {
    let query = supabase.from("certificates").select(SELECT_WITH_EVENT);
    if (eventId) query = query.eq("event_id", eventId);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      if (isCertificateSystemMissing(error)) return [];
      throw error;
    }
    return (data as unknown as CertificateRow[]).map(mapCertificate);
  } catch (error) {
    if (isCertificateSystemMissing(error)) return [];
    throw error;
  }
}

/** Issue one certificate. `certificate_number` and `verification_token` are
 *  generated by the database, never by the client. */
export async function issueCertificate(
  input: CertificateInput,
  createdBy: string | null
): Promise<Certificate> {
  const { data, error } = await supabase
    .from("certificates")
    .insert({
      event_id: input.event_id,
      recipient_name: input.recipient_name.trim(),
      recipient_email: input.recipient_email?.trim().toLowerCase() || null,
      certificate_type: input.certificate_type?.trim() || undefined,
      organizer_name: input.organizer_name?.trim() || null,
      organizer_organization: input.organizer_organization?.trim() || undefined,
      signer_name: input.signer_name?.trim() || null,
      signer_designation: input.signer_designation?.trim() || null,
      signer_signature_url: input.signer_signature_url?.trim() || null,
      certificate_file_url: input.certificate_file_url?.trim() || null,
      issue_date: input.issue_date || undefined,
      created_by: createdBy,
    })
    .select(SELECT_WITH_EVENT)
    .single();

  if (error) throw error;
  return mapCertificate(data as unknown as CertificateRow);
}

/** One recipient in a bulk issue run. */
export type CertificateRecipient = { name: string; email: string | null };

/**
 * Issue certificates for many recipients at once, sharing the same event and
 * signatory details.
 *
 * Recipients who already hold a certificate for the event are skipped so a
 * second run cannot create duplicates. Returns what was created and what was
 * skipped so the caller can report honestly.
 */
export async function issueCertificatesBulk(
  recipients: CertificateRecipient[],
  shared: Omit<CertificateInput, "recipient_name" | "recipient_email">,
  createdBy: string | null
): Promise<{ issued: Certificate[]; skipped: number }> {
  const existing = await getAllCertificatesAdmin(shared.event_id);
  const existingEmails = new Set(
    existing
      .map((certificate) => certificate.recipientEmail?.toLowerCase())
      .filter((email): email is string => Boolean(email))
  );
  const existingNames = new Set(
    existing.map((certificate) => certificate.recipientName.trim().toLowerCase())
  );

  const issued: Certificate[] = [];
  let skipped = 0;

  for (const recipient of recipients) {
    const name = recipient.name.trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const email = recipient.email?.trim().toLowerCase() || null;
    const alreadyIssued = email
      ? existingEmails.has(email)
      : existingNames.has(name.toLowerCase());

    if (alreadyIssued) {
      skipped += 1;
      continue;
    }

    const certificate = await issueCertificate(
      { ...shared, recipient_name: name, recipient_email: email },
      createdBy
    );
    issued.push(certificate);

    if (email) existingEmails.add(email);
    existingNames.add(name.toLowerCase());
  }

  return { issued, skipped };
}

export async function setCertificateStatus(
  id: string,
  status: CertificateStatus
): Promise<void> {
  const { error } = await supabase.from("certificates").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteCertificate(id: string): Promise<void> {
  const { error } = await supabase.from("certificates").delete().eq("id", id);
  if (error) throw error;
}

/** CSV export for the admin certificate table. */
export function certificatesToCSV(certificates: Certificate[]): string {
  const header =
    "Certificate Number,Recipient,Email,Event,Issue Date,Status,Verification URL\n";
  const escape = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const rows = certificates.map((certificate) =>
    [
      escape(certificate.certificateNumber),
      escape(certificate.recipientName),
      escape(certificate.recipientEmail),
      escape(certificate.eventTitle),
      escape(certificate.issueDate),
      escape(certificate.status),
      escape(buildVerificationUrl(certificate.verificationToken)),
    ].join(",")
  );
  return header + rows.join("\n");
}
