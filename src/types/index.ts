// Domain types — UI-friendly, decoupled from the raw Supabase row shapes.
// The services layer maps DB rows into these.

export type EventStatus = "draft" | "published";

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
  youtube: string | null;
  whatsappCommunity: string | null;
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
