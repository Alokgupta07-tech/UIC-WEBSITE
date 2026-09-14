// Domain types — UI-friendly, decoupled from the raw Supabase row shapes.
// The services layer maps DB rows into these.

export type EventStatus = "draft" | "published";

export type AttendanceCodeStatus = "unused" | "used";

export interface AttendanceCode {
  id: string;
  eventId: string;
  codeHash: string;
  /** Plaintext display form of the code — only returned to admins via RLS. */
  codeDisplay?: string | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  revokedAt?: string | null;
  revokedBy?: string | null;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  userId: string;
  codeId: string;
  status: "verified" | "revoked";
  markedAt: string;
}

export type MediaType = "image" | "video";

export interface EventCategory {
  id: string;
  name: string;
  color: string | null;
  description?: string | null;
}

export interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  bannerImage: string | null;
  eventDate: string;
  endDate: string | null;
  venue: string | null;
  location: string | null;
  isOnline: boolean | null;
  meetingLink: string | null;
  maxParticipants: number | null;
  registrationDeadline: string | null;
  isPublished: boolean | null;
  isUpcoming: boolean | null;
  status: "published" | "draft";
  unstopRegistrationLink: string | null;
  category: { id: string; name: string; color: string | null } | null;
  createdAt: string | null;
}

export interface EventGalleryItem {
  id: string;
  eventId: string | null;
  eventTitle: string | null;
  mediaUrl: string;
  mediaType: MediaType;
  album: string;
  caption: string | null;
  createdAt: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  bio: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  unstopProfileUrl: string | null;
  skills: string[] | null;
  isActive: boolean | null;
  isVerified: boolean | null;
  displayOrder: number | null;
}

export interface SocialLinks {
  instagram: string | null;
  linkedin: string | null;
}

export interface SiteSettings {
  communityMemberCount: number;
  social: SocialLinks;
  siteUrl: string | null;
  siteOgImage: string | null;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  isRead: boolean | null;
  createdAt: string | null;
}
export interface CertifiedStudent {
  id: string;
  name: string;
  department: string | null;
  year: string | null;
  achievement: string;
  event: string;
  position: string | null;
  imageUrl: string | null;
  linkedInUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
  bio?: string | null;
  skills?: string[] | null;
  createdAt: string | null;
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

/** Lifecycle of an issued certificate, as stored in `certificates.status`. */
export type CertificateStatus = "issued" | "revoked" | "expired";

/**
 * A certificate owned by the signed-in member. Read through RLS, so the
 * client can only ever hold rows that belong to the current user (or every
 * row, when the current user is an admin).
 *
 * Event fields are joined from `events` rather than duplicated on the
 * certificate row — `eventDate` is the single source of truth and the weekday
 * is always derived from it.
 */
export interface Certificate {
  id: string;
  certificateNumber: string;
  /** Opaque token that the printed QR code encodes. */
  verificationToken: string;
  certificateType: string;
  status: CertificateStatus;
  issueDate: string;

  recipientName: string;
  recipientEmail: string | null;
  recipientUserId: string | null;

  organizerName: string | null;
  organizerOrganization: string;

  signerName: string | null;
  signerDesignation: string | null;
  signerSignatureUrl: string | null;

  certificateFileUrl: string | null;

  eventId: string;
  eventTitle: string | null;
  eventDate: string | null;
  eventVenue: string | null;
  eventIsOnline: boolean | null;
  eventCategory: string | null;

  createdAt: string;
}

/** Verdict returned by the `verify_certificate` RPC. */
export type CertificateVerdict =
  | "verified"
  | "revoked"
  | "expired"
  | "invalid"
  | "not_found";

/**
 * The public face of a certificate — exactly what the `verify_certificate`
 * RPC returns. Contains no email, no account id and no verification token, so
 * it is safe to render on the unauthenticated verification page.
 */
export interface CertificateVerification {
  verdict: CertificateVerdict;
  certificateNumber: string | null;
  certificateType: string | null;
  recipientName: string | null;

  eventTitle: string | null;
  eventDescription: string | null;
  eventDate: string | null;
  eventVenue: string | null;
  eventIsOnline: boolean | null;
  eventCategory: string | null;

  organizerName: string | null;
  organizerOrganization: string | null;

  signerName: string | null;
  signerDesignation: string | null;
  signerSignatureUrl: string | null;

  certificateFileUrl: string | null;
  issueDate: string | null;
  verifiedAt: string;
}

// ---------------------------------------------------------------------------
// Member dashboard activity
// ---------------------------------------------------------------------------

/** Where the dashboard learned that the member took part in an event. */
export type ParticipationSource = "registration" | "attendance-code";

/** Timeline bucket for an event the member is involved with. */
export type MemberEventState = "upcoming" | "today" | "live" | "past";

/**
 * One event on the member's dashboard, combining the published event record
 * with whatever the backend can reliably say about this member's involvement.
 */
export interface MemberEvent {
  event: ClubEvent;
  state: MemberEventState;
  /** True only when an `event_registrations` row exists for this member. */
  isRegistered: boolean;
  /**
   * True only when attendance is actually recorded — either a redeemed
   * attendance code carrying this member's email, or `attended = true` on
   * their registration. Never inferred from the date having passed.
   */
  hasAttended: boolean;
  attendedAt: string | null;
  sources: ParticipationSource[];
  /** Certificates issued to this member for this event. */
  certificates: Certificate[];
}

/** Dynamically computed counters shown in the dashboard stat cards. */
export interface MemberStats {
  totalCertificates: number;
  validCertificates: number;
  eventsAttended: number;
  upcomingEvents: number;
  completedEvents: number;
  registeredEvents: number;
}

/** Result of the documented UIC progress formula. See `services/dashboard.ts`. */
export interface MemberProgress {
  percent: number;
  label: string;
  milestones: { label: string; reached: boolean; hint: string }[];
}

/** Everything the dashboard needs, resolved in one place. */
export interface MemberActivity {
  events: MemberEvent[];
  upcoming: MemberEvent[];
  past: MemberEvent[];
  attended: MemberEvent[];
  certificates: Certificate[];
  stats: MemberStats;
  progress: MemberProgress;
  /** True when no registration/attendance/certificate record exists at all. */
  isEmpty: boolean;
}
