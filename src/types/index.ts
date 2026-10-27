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
  /** Populated for admin views via get_event_attendance. */
  userEmail?: string;
  userName?: string;
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
  // Contest-specific fields
  contestStatus?: ContestStatus | null;
  isSubmissionsOpen?: boolean | null;
  isRatingsOpen?: boolean | null;
  isGalleryPublished?: boolean | null;
  isLeaderboardPublished?: boolean | null;
  submissionOpenAt?: string | null;
  submissionCloseAt?: string | null;
  ratingOpenAt?: string | null;
  ratingCloseAt?: string | null;
  minRatingsForRanking?: number | null;
  externalRegistrationUrl?: string | null;
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
// Vibe Coding Contest
// ---------------------------------------------------------------------------

export type ContestStatus = 
  | 'draft' 
  | 'published' 
  | 'verification_open' 
  | 'submissions_open' 
  | 'submissions_closed' 
  | 'ratings_open' 
  | 'ratings_closed' 
  | 'results_published' 
  | 'completed';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type VerificationSource = 'csv_import' | 'admin_manual' | 'user_claim';

export type SubmissionStatus = 'approved' | 'pending_moderation' | 'rejected' | 'hidden';

export interface ContestParticipant {
  id: string;
  eventId: string;
  userId: string | null;
  unstopRegistrationId: string | null;
  participantEmail: string;
  participantName: string;
  verificationStatus: VerificationStatus;
  verificationSource: VerificationSource;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionOrAdminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContestSubmission {
  id: string;
  eventId: string;
  userId: string;
  projectName: string;
  projectDescription: string;
  liveUrl: string;
  repoUrl: string | null;
  status: SubmissionStatus;
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  adminOverrideEditAllowed: boolean;
  avgRating: number;
  ratingCount: number;
  submittedAt: string;
  updatedAt: string;
}

export interface ContestSubmissionWithDetails extends ContestSubmission {
  participantName: string;
  participantEmail: string | null;
  participantAvatar: string | null;
  verificationStatus: VerificationStatus | null;
  userHasRated: boolean;
}

export interface ContestRating {
  id: string;
  eventId: string;
  submissionId: string;
  reviewerId: string;
  score: number;
  isValid: boolean;
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
}

export interface ContestLeaderboardEntry {
  rank: number;
  submissionId: string;
  projectName: string;
  participantName: string;
  participantId: string;
  liveUrl: string;
  repoUrl: string | null;
  avgRating: number;
  ratingCount: number;
  submittedAt: string;
  isProvisional: boolean;
}

export interface UserContestStatus {
  isVerified: boolean;
  verificationStatus: VerificationStatus | null;
  hasSubmitted: boolean;
  submissionId: string | null;
  currentRank: number | null;
  totalRanked: number;
  websitesRated: number;
  eligibleToRate: number;
}

export interface ContestModerationLog {
  id: string;
  eventId: string;
  adminId: string;
  targetType: 'participant' | 'submission' | 'rating' | 'settings';
  targetId: string;
  action: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ContestSettings {
  contestStatus: ContestStatus | null;
  isSubmissionsOpen: boolean | null;
  isRatingsOpen: boolean | null;
  isGalleryPublished: boolean | null;
  isLeaderboardPublished: boolean | null;
  submissionOpenAt: string | null;
  submissionCloseAt: string | null;
  ratingOpenAt: string | null;
  ratingCloseAt: string | null;
  minRatingsForRanking: number | null;
  externalRegistrationUrl: string | null;
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

/** Lifecycle of an issued certificate, as stored in `certificates.status`. */
export type CertificateStatus = "issued" | "revoked" | "expired";

/** Email delivery status for a certificate. */
export type CertificateEmailStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

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

  /** Second signatory */
  signer2Name: string | null;
  signer2Designation: string | null;
  signer2SignatureUrl: string | null;

  certificateFileUrl: string | null;

  /** Role-based content fields */
  role: string | null;
  team: string | null;
  contributionSummary: string | null;
  skills: string[] | null;
  customTitle: string | null;
  specialRecognition: string | null;

  /** Template selection */
  templateKey: string | null;

  /** Email delivery status */
  emailStatus: CertificateEmailStatus;
  emailSentAt: string | null;
  emailError: string | null;

  /** PDF reference */
  pdfUrl: string | null;

  /** Download count */
  downloadCount: number;

  /** Revision chain */
  revisionOf: string | null;

  /** Participation period */
  participationStart: string | null;
  participationEnd: string | null;

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

  /** Second signatory */
  signer2Name?: string | null;
  signer2Designation?: string | null;
  signer2SignatureUrl?: string | null;

  certificateFileUrl: string | null;
  issueDate: string | null;
  verifiedAt: string;

  /** Extended fields from the updated RPC */
  role: string | null;
  team: string | null;
  contributionSummary: string | null;
  customTitle: string | null;
  specialRecognition: string | null;
  templateKey: string | null;
}

/** Certificate template configuration. */
export interface CertificateTemplate {
  id: string;
  name: string;
  category: string;
  themeKey: string;
  description: string | null;
  defaultContributionSummary: string | null;
  defaultCertificateType: string;
  logoUrl: string | null;
  accentColor: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Certificate email delivery log entry. */
export interface CertificateEmailLog {
  id: string;
  certificateId: string;
  recipientEmail: string;
  subject: string | null;
  providerMessageId: string | null;
  status: "pending" | "sent" | "delivered" | "failed" | "bounced";
  attemptCount: number;
  lastAttemptAt: string;
  errorDetails: string | null;
  createdAt: string;
}

/** Certificate audit log entry. */
export interface CertificateAuditLog {
  id: string;
  certificateId: string | null;
  adminId: string;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
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
