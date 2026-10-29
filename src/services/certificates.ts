// Supabase query helpers for certificates.
//
// Reads are RLS-gated: `getMyCertificates` can only ever return rows belonging
// to the signed-in member, and `verifyCertificate` goes through a
// SECURITY DEFINER RPC that returns the public face of a certificate only.
// Nothing here trusts certificate data supplied by the client.
import { supabase } from "@/integrations/supabase/client";
import { isMissingTableError } from "@/services/supabaseErrors";
import { CERTIFICATE_SIGNATORIES, loadCertificateSignatureDataUrl } from "@/lib/certificateSignatories";
import { buildVerificationUrl } from "@/lib/certificateUrls";
import { getCertificatePdfBlob } from "@/lib/certificatePdf";
import type { TablesInsert } from "@/integrations/supabase/types";
import type {
  Certificate,
  CertificateStatus,
  CertificateEmailStatus,
  CertificateVerdict,
  CertificateVerification,
  CertificateTemplate,
  CertificateEmailLog,
  CertificateAuditLog,
} from "@/types";

/** Path of the public verification page. Kept here so the QR payload, the
 *  share link and the router all agree on one shape. */
export { VERIFY_PATH, buildVerificationUrl } from "@/lib/certificateUrls";

/** A verification token is 32 lowercase hex characters (128 bits). */
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

const CERTIFICATE_STATUSES: CertificateStatus[] = ["issued", "revoked", "expired"];

function toCertificateStatus(value: string | null | undefined): CertificateStatus {
  return CERTIFICATE_STATUSES.includes(value as CertificateStatus)
    ? (value as CertificateStatus)
    : "expired";
}

const EMAIL_STATUSES: CertificateEmailStatus[] = ["pending", "sending", "sent", "failed", "skipped"];

function toEmailStatus(value: string | null | undefined): CertificateEmailStatus {
  return EMAIL_STATUSES.includes(value as CertificateEmailStatus)
    ? (value as CertificateEmailStatus)
    : "pending";
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
  signer2_name?: string | null;
  signer2_designation?: string | null;
  signer2_signature_url?: string | null;
  certificate_file_url: string | null;
  event_id: string;
  role?: string | null;
  team?: string | null;
  contribution_summary?: string | null;
  skills?: string[] | null;
  custom_title?: string | null;
  special_recognition?: string | null;
  template_key?: string | null;
  email_status?: string | null;
  email_sent_at?: string | null;
  email_error?: string | null;
  pdf_url?: string | null;
  download_count?: number | null;
  revision_of?: string | null;
  participation_start?: string | null;
  participation_end?: string | null;
  created_at: string;
  events?: {
    title: string;
    event_date: string;
    venue: string | null;
    is_online: boolean | null;
    event_categories: { name: string } | null;
  } | null;
};

type CertificateEvent = {
  id: string;
  title: string;
  event_date: string;
  venue: string | null;
  is_online: boolean | null;
  category_id: string | null;
};

/**
 * Keep certificate reads independent of PostgREST relationship embedding.
 * Some deployed schemas/cache states reject nested embeds even though the FK
 * exists. Fetch events/categories separately so certificate operations still
 * work and the certificate itself remains usable if optional event metadata is
 * unavailable under RLS.
 */
async function mapCertificates(rows: CertificateRow[]): Promise<Certificate[]> {
  const eventIds = [...new Set(rows.map((row) => row.event_id).filter(Boolean))];
  if (eventIds.length === 0) return rows.map(mapCertificate);

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title, event_date, venue, is_online, category_id")
    .in("id", eventIds);

  const eventsById = new Map<string, CertificateEvent>();
  if (!eventsError && events) {
    for (const event of events) eventsById.set(event.id, event);
  }

  const categoryIds = [...new Set([...eventsById.values()]
    .map((event) => event.category_id)
    .filter((id): id is string => Boolean(id)))];
  const categoriesById = new Map<string, string>();

  if (categoryIds.length > 0) {
    const { data: categories, error: categoriesError } = await supabase
      .from("event_categories")
      .select("id, name")
      .in("id", categoryIds);
    if (!categoriesError && categories) {
      for (const category of categories) categoriesById.set(category.id, category.name);
    }
  }

  return rows.map((row) => {
    const event = eventsById.get(row.event_id);
    return mapCertificate({
      ...row,
      events: event
        ? {
            title: event.title,
            event_date: event.event_date,
            venue: event.venue,
            is_online: event.is_online,
            event_categories: event.category_id && categoriesById.has(event.category_id)
              ? { name: categoriesById.get(event.category_id)! }
              : null,
          }
        : null,
    });
  });
}

async function mapSingleCertificate(row: CertificateRow): Promise<Certificate> {
  const [certificate] = await mapCertificates([row]);
  return certificate;
}

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

    signerName: CERTIFICATE_SIGNATORIES.facultyCoordinator.printedName,
    signerDesignation: CERTIFICATE_SIGNATORIES.facultyCoordinator.designation,
    signerSignatureUrl: CERTIFICATE_SIGNATORIES.facultyCoordinator.signaturePath,

    signer2Name: CERTIFICATE_SIGNATORIES.president.printedName,
    signer2Designation: CERTIFICATE_SIGNATORIES.president.designation,
    signer2SignatureUrl: CERTIFICATE_SIGNATORIES.president.signaturePath,

    certificateFileUrl: row.certificate_file_url,

    role: row.role ?? null,
    team: row.team ?? null,
    contributionSummary: row.contribution_summary ?? null,
    skills: row.skills ?? null,
    customTitle: row.custom_title ?? null,
    specialRecognition: row.special_recognition ?? null,

    templateKey: row.template_key ?? "royal-sapphire",

    emailStatus: toEmailStatus(row.email_status),
    emailSentAt: row.email_sent_at ?? null,
    emailError: row.email_error ?? null,

    pdfUrl: row.pdf_url ?? null,
    downloadCount: row.download_count ?? 0,
    revisionOf: row.revision_of ?? null,
    participationStart: row.participation_start ?? null,
    participationEnd: row.participation_end ?? null,

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
  role: null,
  team: null,
  contributionSummary: null,
  customTitle: null,
  specialRecognition: null,
  templateKey: null,
};

const VERDICTS: CertificateVerdict[] = [
  "verified",
  "revoked",
  "expired",
  "invalid",
  "not_found",
];

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
 */
export async function verifyCertificate(token: string): Promise<CertificateVerification> {
  const clean = token.trim().toLowerCase();
  if (!TOKEN_PATTERN.test(clean)) {
    return { ...NOT_FOUND, verdict: "invalid", verifiedAt: new Date().toISOString() };
  }

  const { data, error } = await supabase.rpc("verify_certificate", { p_token: clean });

  if (error) {
    if (isCertificateSystemMissing(error)) {
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
    certificateNumber: row.certificate_number ?? null,
    certificateType: row.certificate_type ?? null,
    recipientName: row.recipient_name ?? null,
    eventTitle: row.event_title ?? null,
    eventDescription: row.event_description ?? null,
    eventDate: row.event_date ?? null,
    eventVenue: row.event_venue ?? null,
    eventIsOnline: row.event_is_online ?? null,
    eventCategory: row.event_category ?? null,
    organizerName: row.organizer_name ?? null,
    organizerOrganization: row.organizer_organization ?? null,
    signerName: CERTIFICATE_SIGNATORIES.facultyCoordinator.printedName,
    signerDesignation: CERTIFICATE_SIGNATORIES.facultyCoordinator.designation,
    signerSignatureUrl: CERTIFICATE_SIGNATORIES.facultyCoordinator.signaturePath,
    signer2Name: CERTIFICATE_SIGNATORIES.president.printedName,
    signer2Designation: CERTIFICATE_SIGNATORIES.president.designation,
    signer2SignatureUrl: CERTIFICATE_SIGNATORIES.president.signaturePath,
    certificateFileUrl: row.certificate_file_url ?? null,
    issueDate: row.issue_date ?? null,
    verifiedAt: row.verified_at ?? new Date().toISOString(),
    role: row.role ?? null,
    team: row.team ?? null,
    contributionSummary: row.contribution_summary ?? null,
    customTitle: row.custom_title ?? null,
    specialRecognition: row.special_recognition ?? null,
    templateKey: row.template_key ?? null,
  };
}

// ---------------------------------------------------------------------------
// Member reads
// ---------------------------------------------------------------------------

export async function claimMyCertificates(): Promise<number> {
  const { data, error } = await supabase.rpc("claim_my_certificates");
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

export async function getMyCertificates(): Promise<Certificate[]> {
  try {
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .order("issue_date", { ascending: false });

    if (error) {
      if (isCertificateSystemMissing(error)) return [];
      throw error;
    }
    return mapCertificates(data as unknown as CertificateRow[]);
  } catch (error) {
    if (isCertificateSystemMissing(error)) return [];
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Admin writes & Extended operations
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
  signer2_name?: string | null;
  signer2_designation?: string | null;
  signer2_signature_url?: string | null;
  certificate_file_url?: string | null;
  issue_date?: string | null;

  // Extended role-based fields
  role?: string | null;
  team?: string | null;
  contribution_summary?: string | null;
  skills?: string[] | null;
  custom_title?: string | null;
  special_recognition?: string | null;
  template_key?: string | null;
  participation_start?: string | null;
  participation_end?: string | null;
  revision_of?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function certificateIssueError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  const code = error.code ?? "";
  const messages: Record<string, string> = {
    "23503": "The selected event or revision certificate no longer exists. Refresh the page and try again.",
    "23505": "A certificate with this unique identifier already exists. Refresh the certificate list before retrying.",
    "23514": "One or more certificate values are not allowed by the database. Check the selected values and try again.",
    "42501": "Your account is not authorized to issue certificates. Sign in with an administrator account.",
    "22P02": "An identifier or date has an invalid format. Check the form and try again.",
    "PGRST204": "The certificate database is missing fields required by this form. An administrator must apply the certificate management migration.",
    "PGRST205": "The certificates table is not available in the database. An administrator must apply the certificate migrations.",
    "42P01": "The certificates table is missing. An administrator must apply the certificate migrations.",
    "42703": "The certificate database schema is out of date. An administrator must apply the certificate management migration.",
  };
  const friendly = messages[code] ?? "Certificate issuance failed. Check your access and the certificate details, then try again.";
  if (import.meta.env.DEV) console.error("Certificate issuance failed", { code: code || "unknown" });
  return new Error(friendly);
}

export async function getAllCertificatesAdmin(eventId?: string): Promise<Certificate[]> {
  try {
    let query = supabase.from("certificates").select("*");
    if (eventId && UUID_PATTERN.test(eventId.trim())) {
      query = query.eq("event_id", eventId.trim());
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      if (isCertificateSystemMissing(error)) return [];
      throw error;
    }
    return mapCertificates(data as unknown as CertificateRow[]);
  } catch (error) {
    if (isCertificateSystemMissing(error)) return [];
    throw error;
  }
}

/** Issue one certificate. */
export async function issueCertificate(
  input: CertificateInput,
  createdBy: string | null
): Promise<Certificate> {
  if (!UUID_PATTERN.test(input.event_id.trim())) {
    throw new Error("Select a valid event before issuing the certificate.");
  }
  if (!input.recipient_name.trim()) throw new Error("Enter the recipient's name.");
  if (input.recipient_email?.trim() && !EMAIL_PATTERN.test(input.recipient_email.trim())) {
    throw new Error("Enter a valid recipient email address.");
  }
  for (const date of [input.issue_date, input.participation_start, input.participation_end]) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Enter dates in YYYY-MM-DD format.");
    }
  }
  await Promise.all([
    loadCertificateSignatureDataUrl("facultyCoordinator"),
    loadCertificateSignatureDataUrl("president"),
  ]);

  const insertPayload: TablesInsert<"certificates"> = {
    event_id: input.event_id,
    recipient_name: input.recipient_name.trim(),
    recipient_email: input.recipient_email?.trim().toLowerCase() || null,
    certificate_type: input.certificate_type?.trim() || undefined,
    organizer_name: input.organizer_name?.trim() || null,
    organizer_organization: input.organizer_organization?.trim() || undefined,
    signer_name: CERTIFICATE_SIGNATORIES.facultyCoordinator.printedName,
    signer_designation: CERTIFICATE_SIGNATORIES.facultyCoordinator.designation,
    signer_signature_url: CERTIFICATE_SIGNATORIES.facultyCoordinator.signaturePath,
    signer2_name: CERTIFICATE_SIGNATORIES.president.printedName,
    signer2_designation: CERTIFICATE_SIGNATORIES.president.designation,
    signer2_signature_url: CERTIFICATE_SIGNATORIES.president.signaturePath,
    certificate_file_url: input.certificate_file_url?.trim() || null,
    issue_date: input.issue_date || undefined,
    role: input.role?.trim() || null,
    team: input.team?.trim() || null,
    contribution_summary: input.contribution_summary?.trim() || null,
    skills: input.skills && input.skills.length > 0 ? input.skills : null,
    custom_title: input.custom_title?.trim() || null,
    special_recognition: input.special_recognition?.trim() || null,
    template_key: input.template_key?.trim() || "royal-sapphire",
    participation_start: input.participation_start || null,
    participation_end: input.participation_end || null,
    revision_of: input.revision_of || null,
    created_by: createdBy,
  };

  const { data, error } = await supabase
    .from("certificates")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw certificateIssueError(error);
  const created = await mapSingleCertificate(data as unknown as CertificateRow);

  // Log to audit log if available
  if (createdBy) {
    try {
      await supabase.from("certificate_audit_log").insert({
        certificate_id: created.id,
        admin_id: createdBy,
        action: input.revision_of ? "reissue" : "issue",
        new_status: "issued",
        metadata: {
          recipientName: created.recipientName,
          recipientEmail: created.recipientEmail,
          role: created.role,
          team: created.team,
        },
      });
    } catch {
      // Non-fatal
    }
  }

  return created;
}

export type CertificateRecipient = {
  name: string;
  email: string | null;
  role?: string | null;
  team?: string | null;
  contributionSummary?: string | null;
  skills?: string[] | null;
  customTitle?: string | null;
  certificateType?: string | null;
};

/**
 * Issue certificates for many recipients at once.
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
      {
        ...shared,
        recipient_name: name,
        recipient_email: email,
        role: recipient.role ?? shared.role,
        team: recipient.team ?? shared.team,
        contribution_summary: recipient.contributionSummary ?? shared.contribution_summary,
        skills: recipient.skills ?? shared.skills,
        custom_title: recipient.customTitle ?? shared.custom_title,
        certificate_type: recipient.certificateType ?? shared.certificate_type,
      },
      createdBy
    );
    issued.push(certificate);

    if (email) existingEmails.add(email);
    existingNames.add(name.toLowerCase());
  }

  return { issued, skipped };
}

/** Update an existing certificate's attributes */
export async function updateCertificate(
  id: string,
  updates: Partial<CertificateInput>
): Promise<Certificate> {
  const payload: Record<string, unknown> = {};
  if (updates.recipient_name !== undefined) payload.recipient_name = updates.recipient_name.trim();
  if (updates.recipient_email !== undefined) payload.recipient_email = updates.recipient_email?.trim().toLowerCase() || null;
  if (updates.certificate_type !== undefined) payload.certificate_type = updates.certificate_type.trim();
  if (updates.role !== undefined) payload.role = updates.role?.trim() || null;
  if (updates.team !== undefined) payload.team = updates.team?.trim() || null;
  if (updates.contribution_summary !== undefined) payload.contribution_summary = updates.contribution_summary?.trim() || null;
  if (updates.custom_title !== undefined) payload.custom_title = updates.custom_title?.trim() || null;
  if (updates.special_recognition !== undefined) payload.special_recognition = updates.special_recognition?.trim() || null;
  if (updates.template_key !== undefined) payload.template_key = updates.template_key.trim();
  const { data, error } = await supabase
    .from("certificates")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapSingleCertificate(data as unknown as CertificateRow);
}

/** Set status (issued, revoked, expired) with audit log */
export async function setCertificateStatus(
  id: string,
  status: CertificateStatus,
  reason?: string,
  adminId?: string | null
): Promise<void> {
  const { error } = await supabase.from("certificates").update({ status }).eq("id", id);
  if (error) throw error;

  if (adminId) {
    try {
      await supabase.from("certificate_audit_log").insert({
        certificate_id: id,
        admin_id: adminId,
        action: status === "revoked" ? "revoke" : "status_change",
        new_status: status,
        reason: reason || null,
      });
    } catch {
      // Non-fatal
    }
  }
}

/** Revoke a certificate with an explicit reason */
export async function revokeCertificate(
  id: string,
  reason: string,
  adminId: string | null
): Promise<void> {
  await setCertificateStatus(id, "revoked", reason, adminId);
}

/** Reissue a certificate, marking the old one revoked and linking the new one */
export async function reissueCertificate(
  oldCertId: string,
  updates: Partial<CertificateInput>,
  reason: string,
  adminId: string | null
): Promise<Certificate> {
  // 1. Fetch old certificate
  const { data: oldRow, error: fetchErr } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", oldCertId)
    .single();
  if (fetchErr || !oldRow) throw new Error("Could not find certificate to reissue");

  // 2. Mark old certificate as revoked
  await revokeCertificate(oldCertId, `Reissued: ${reason}`, adminId);

  // 3. Issue new certificate with revision_of pointing to old
  const input: CertificateInput = {
    event_id: updates.event_id || oldRow.event_id,
    recipient_name: updates.recipient_name || oldRow.recipient_name,
    recipient_email: updates.recipient_email ?? oldRow.recipient_email,
    certificate_type: updates.certificate_type || oldRow.certificate_type,
    organizer_name: updates.organizer_name ?? oldRow.organizer_name,
    organizer_organization: updates.organizer_organization ?? oldRow.organizer_organization,
    signer_name: updates.signer_name ?? oldRow.signer_name,
    signer_designation: updates.signer_designation ?? oldRow.signer_designation,
    signer2_name: updates.signer2_name ?? oldRow.signer2_name,
    signer2_designation: updates.signer2_designation ?? oldRow.signer2_designation,
    role: updates.role ?? oldRow.role,
    team: updates.team ?? oldRow.team,
    contribution_summary: updates.contribution_summary ?? oldRow.contribution_summary,
    custom_title: updates.custom_title ?? oldRow.custom_title,
    special_recognition: updates.special_recognition ?? oldRow.special_recognition,
    template_key: updates.template_key ?? oldRow.template_key,
    revision_of: oldCertId,
  };

  return issueCertificate(input, adminId);
}

export async function deleteCertificate(id: string): Promise<void> {
  const { error } = await supabase.from("certificates").delete().eq("id", id);
  if (error) throw error;
}

/** Increment certificate download count */
export async function incrementDownloadCount(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("increment_certificate_download", { p_certificate_id: id });
    if (!error) return;
  } catch {
    // Continue to the RLS-checked fallback for installations without the RPC.
  }
  try {
    const { data } = await supabase.from("certificates").select("download_count").eq("id", id).single();
    const current = data?.download_count ?? 0;
    await supabase.from("certificates").update({ download_count: current + 1 }).eq("id", id);
  } catch {
    // Non-fatal: the file download must still succeed if optional analytics fail.
  }
}

/** Get audit logs for certificates */
export async function getCertificateAuditLogs(certificateId?: string): Promise<CertificateAuditLog[]> {
  try {
    let query = supabase.from("certificate_audit_log").select("*").order("created_at", { ascending: false });
    if (certificateId) query = query.eq("certificate_id", certificateId);

    const { data, error } = await query.limit(50);
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      certificateId: row.certificate_id,
      adminId: row.admin_id,
      action: row.action,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      reason: row.reason,
      metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown>
        : null,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/** Get email logs for a certificate */
export async function getCertificateEmailLogs(certificateId?: string): Promise<CertificateEmailLog[]> {
  try {
    let query = supabase.from("certificate_email_logs").select("*").order("created_at", { ascending: false });
    if (certificateId) query = query.eq("certificate_id", certificateId);

    const { data, error } = await query.limit(50);
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      certificateId: row.certificate_id,
      recipientEmail: row.recipient_email,
      subject: row.subject,
      providerMessageId: row.provider_message_id,
      status: ["pending", "sent", "delivered", "failed", "bounced"].includes(row.status)
        ? row.status as CertificateEmailLog["status"]
        : "failed",
      attemptCount: row.attempt_count ?? 1,
      lastAttemptAt: row.last_attempt_at,
      errorDetails: row.error_details,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Send or re-send certificate via Email.
 * Attempts Supabase Edge Function `send-certificate-email`.
 * Missing email infrastructure is a failure; never report simulated delivery as sent.
 */
export async function sendCertificateEmail(
  certificate: Certificate,
  options: { testRecipientEmail?: string } = {}
): Promise<{ success: boolean; message: string }> {
  if (!certificate.recipientEmail) {
    throw new Error("Recipient does not have an email address specified.");
  }

  const testRecipientEmail = options.testRecipientEmail?.trim().toLowerCase();
  if (testRecipientEmail && !EMAIL_PATTERN.test(testRecipientEmail)) {
    throw new Error("Enter a valid test recipient email address.");
  }

  let pdfBlob: Blob;
  try {
    pdfBlob = await getCertificatePdfBlob({
      certificateNumber: certificate.certificateNumber,
      verificationToken: certificate.verificationToken,
      recipientName: certificate.recipientName,
      eventTitle: certificate.eventTitle || "UIC Event",
      eventDate: certificate.eventDate,
      eventVenue: certificate.eventVenue,
      eventIsOnline: certificate.eventIsOnline,
      certificateType: certificate.certificateType,
      customTitle: certificate.customTitle,
      role: certificate.role,
      team: certificate.team,
      contributionSummary: certificate.contributionSummary,
      specialRecognition: certificate.specialRecognition,
      organizerOrganization: certificate.organizerOrganization,
      issueDate: certificate.issueDate,
      themeKey: certificate.templateKey,
    });
  } catch (error) {
    if (import.meta.env.DEV) console.error("Signed certificate PDF generation failed", error);
    throw new Error("The signed certificate PDF could not be generated. No email was sent.");
  }

  try {
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
    let pdfBinary = "";
    for (let offset = 0; offset < pdfBytes.length; offset += 0x8000) {
      pdfBinary += String.fromCharCode(...pdfBytes.subarray(offset, offset + 0x8000));
    }
    const pdfBase64 = btoa(pdfBinary);

    const { data, error } = await supabase.functions.invoke("send-certificate-email", {
      body: {
        certificateId: certificate.id,
        recipientEmail: certificate.recipientEmail,
        recipientName: certificate.recipientName,
        eventTitle: certificate.eventTitle,
        certificateNumber: certificate.certificateNumber,
        verifyUrl: buildVerificationUrl(certificate.verificationToken),
        role: certificate.role,
        team: certificate.team,
        customTitle: certificate.customTitle,
        attachment: {
          filename: `${certificate.certificateNumber}.pdf`,
          content: pdfBase64,
        },
        testRecipientEmail: testRecipientEmail || null,
      },
    });

    if (error) throw error;
    if (data?.success !== true || !data?.messageId) {
      throw new Error("The email provider did not accept the message.");
    }
    return {
      success: true,
      message: testRecipientEmail
        ? `Test email accepted by provider for ${testRecipientEmail}`
        : data?.message || `Email accepted by provider for ${certificate.recipientEmail}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Edge function unavailable";
    throw new Error(`Email delivery failed: ${errorMsg}`);
  }
}

/** CSV export for the admin certificate table with role and team data. */
export function certificatesToCSV(certificates: Certificate[]): string {
  const header =
    "Certificate Number,Recipient,Email,Event,Role,Team,Certificate Type,Issue Date,Status,Email Status,Verification URL\n";
  const escape = (value: string | null | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const rows = certificates.map((certificate) =>
    [
      escape(certificate.certificateNumber),
      escape(certificate.recipientName),
      escape(certificate.recipientEmail),
      escape(certificate.eventTitle),
      escape(certificate.role),
      escape(certificate.team),
      escape(certificate.certificateType),
      escape(certificate.issueDate),
      escape(certificate.status),
      escape(certificate.emailStatus),
      escape(buildVerificationUrl(certificate.verificationToken)),
    ].join(",")
  );
  return header + rows.join("\n");
}

/**
 * CSV parser for recipient bulk imports.
 * Accepts flexible header column names (e.g. "Name", "Full Name", "Email", "Role", "Team", "Contribution").
 */
export function parseRecipientsCSV(csvText: string): CertificateRecipient[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const nameIdx = headers.findIndex((h) => h.includes("name") || h === "recipient");
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
  const roleIdx = headers.findIndex((h) => h.includes("role") || h.includes("position") || h.includes("designation"));
  const teamIdx = headers.findIndex((h) => h.includes("team") || h.includes("department"));
  const contribIdx = headers.findIndex((h) => h.includes("contrib") || h.includes("summary") || h.includes("reason"));
  const titleIdx = headers.findIndex((h) => h.includes("title") || h.includes("certtype"));

  if (nameIdx === -1) {
    throw new Error("CSV must include a 'Name' or 'Recipient' column.");
  }

  const recipients: CertificateRecipient[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const name = cols[nameIdx] || "";
    if (!name.trim()) continue;

    recipients.push({
      name: name.trim(),
      email: emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx].trim().toLowerCase() : null,
      role: roleIdx !== -1 && cols[roleIdx] ? cols[roleIdx].trim() : null,
      team: teamIdx !== -1 && cols[teamIdx] ? cols[teamIdx].trim() : null,
      contributionSummary: contribIdx !== -1 && cols[contribIdx] ? cols[contribIdx].trim() : null,
      customTitle: titleIdx !== -1 && cols[titleIdx] ? cols[titleIdx].trim() : null,
    });
  }

  return recipients;
}
