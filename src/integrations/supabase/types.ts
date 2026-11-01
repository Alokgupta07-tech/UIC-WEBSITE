export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      certificates: {
        Row: {
          certificate_file_url: string | null
          certificate_number: string
          certificate_type: string
          created_at: string
          created_by: string | null
          contribution_summary: string | null
          custom_title: string | null
          download_count: number | null
          email_error: string | null
          email_sent_at: string | null
          email_status: string | null
          event_id: string
          id: string
          issue_date: string
          organizer_name: string | null
          organizer_organization: string
          participation_end: string | null
          participation_start: string | null
          pdf_url: string | null
          recipient_email: string | null
          recipient_name: string
          recipient_category: string | null
          recipient_user_id: string | null
          revision_of: string | null
          role: string | null
          skills: string[] | null
          special_recognition: string | null
          signer_designation: string | null
          signer_name: string | null
          signer_signature_url: string | null
          signer2_designation: string | null
          signer2_name: string | null
          signer2_signature_url: string | null
          status: string
          team: string | null
          template_key: string | null
          updated_at: string
          verification_token: string
        }
        Insert: {
          certificate_file_url?: string | null
          certificate_number?: string
          certificate_type?: string
          created_at?: string
          created_by?: string | null
          contribution_summary?: string | null
          custom_title?: string | null
          download_count?: number | null
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          event_id: string
          id?: string
          issue_date?: string
          organizer_name?: string | null
          organizer_organization?: string
          participation_end?: string | null
          participation_start?: string | null
          pdf_url?: string | null
          recipient_email?: string | null
          recipient_name: string
          recipient_category?: string | null
          recipient_user_id?: string | null
          revision_of?: string | null
          role?: string | null
          skills?: string[] | null
          special_recognition?: string | null
          signer_designation?: string | null
          signer_name?: string | null
          signer_signature_url?: string | null
          signer2_designation?: string | null
          signer2_name?: string | null
          signer2_signature_url?: string | null
          status?: string
          team?: string | null
          template_key?: string | null
          updated_at?: string
          verification_token?: string
        }
        Update: {
          certificate_file_url?: string | null
          certificate_number?: string
          certificate_type?: string
          created_at?: string
          created_by?: string | null
          contribution_summary?: string | null
          custom_title?: string | null
          download_count?: number | null
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          event_id?: string
          id?: string
          issue_date?: string
          organizer_name?: string | null
          organizer_organization?: string
          participation_end?: string | null
          participation_start?: string | null
          pdf_url?: string | null
          recipient_email?: string | null
          recipient_name?: string
          recipient_category?: string | null
          recipient_user_id?: string | null
          revision_of?: string | null
          role?: string | null
          skills?: string[] | null
          special_recognition?: string | null
          signer_designation?: string | null
          signer_name?: string | null
          signer_signature_url?: string | null
          signer2_designation?: string | null
          signer2_name?: string | null
          signer2_signature_url?: string | null
          status?: string
          team?: string | null
          template_key?: string | null
          updated_at?: string
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          label: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          label?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          label?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          accent_color: string | null
          category: string
          created_at: string
          created_by: string | null
          default_certificate_type: string | null
          default_contribution_summary: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          theme_key: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          default_certificate_type?: string | null
          default_contribution_summary?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          theme_key?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          default_certificate_type?: string | null
          default_contribution_summary?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          theme_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificate_email_logs: {
        Row: {
          attachment_sha256: string | null
          attempt_count: number
          certificate_id: string
          created_at: string
          error_details: string | null
          id: string
          last_attempt_at: string
          provider_message_id: string | null
          recipient_email: string
          status: string
          subject: string | null
        }
        Insert: {
          attachment_sha256?: string | null
          attempt_count?: number
          certificate_id: string
          created_at?: string
          error_details?: string | null
          id?: string
          last_attempt_at?: string
          provider_message_id?: string | null
          recipient_email: string
          status?: string
          subject?: string | null
        }
        Update: {
          attachment_sha256?: string | null
          attempt_count?: number
          certificate_id?: string
          created_at?: string
          error_details?: string | null
          id?: string
          last_attempt_at?: string
          provider_message_id?: string | null
          recipient_email?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_email_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_audit_log: {
        Row: {
          action: string
          admin_id: string
          certificate_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_status: string | null
          old_status: string | null
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          certificate_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          certificate_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_audit_log_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          id: string
          event_id: string
          user_id: string
          code_id: string
          status: string
          marked_at: string | null | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          code_id: string
          status?: string
          marked_at?: string | null | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          code_id?: string
          status?: string
          marked_at?: string | null | null
        }
        Relationships: []
      }
      attendance_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          participant_email: string | null
          participant_name: string | null
          redeemed_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          participant_email?: string | null
          participant_name?: string | null
          redeemed_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          participant_email?: string | null
          participant_name?: string | null
          redeemed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      certified_students: {
        Row: {
          id: string
          name: string
          department: string | null | null
          year: string | null | null
          achievement: string
          event: string
          position: string | null | null
          image_url: string | null | null
          linkedin_url: string | null | null
          display_order: number | null | null
          is_active: boolean | null | null
          created_at: string | null | null
          updated_at: string | null | null
        }
        Insert: {
          id?: string
          name: string
          department?: string | null | null
          year?: string | null | null
          achievement: string
          event: string
          position?: string | null | null
          image_url?: string | null | null
          linkedin_url?: string | null | null
          display_order?: number | null | null
          is_active?: boolean | null | null
          created_at?: string | null | null
          updated_at?: string | null | null
        }
        Update: {
          id?: string
          name?: string
          department?: string | null | null
          year?: string | null | null
          achievement?: string
          event?: string
          position?: string | null | null
          image_url?: string | null | null
          linkedin_url?: string | null | null
          display_order?: number | null | null
          is_active?: boolean | null | null
          created_at?: string | null | null
          updated_at?: string | null | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      contest_moderation_logs: {
        Row: {
          id: string
          event_id: string
          admin_id: string
          target_type: string
          target_id: string
          action: string
          reason: string | null | null
          metadata: Json | null | null
          created_at: string | null | null
        }
        Insert: {
          id?: string
          event_id: string
          admin_id: string
          target_type: string
          target_id: string
          action: string
          reason?: string | null | null
          metadata?: Json | null | null
          created_at?: string | null | null
        }
        Update: {
          id?: string
          event_id?: string
          admin_id?: string
          target_type?: string
          target_id?: string
          action?: string
          reason?: string | null | null
          metadata?: Json | null | null
          created_at?: string | null | null
        }
        Relationships: []
      }
      contest_participants: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          unstop_registration_id: string | null | null
          participant_email: string
          participant_name: string
          verification_status: string
          verification_source: string
          verified_by: string | null
          verified_at: string | null | null
          rejection_or_admin_note: string | null | null
          created_at: string | null | null
          updated_at: string | null | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          unstop_registration_id?: string | null | null
          participant_email: string
          participant_name: string
          verification_status?: string
          verification_source?: string
          verified_by?: string | null
          verified_at?: string | null | null
          rejection_or_admin_note?: string | null | null
          created_at?: string | null | null
          updated_at?: string | null | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          unstop_registration_id?: string | null | null
          participant_email?: string
          participant_name?: string
          verification_status?: string
          verification_source?: string
          verified_by?: string | null
          verified_at?: string | null | null
          rejection_or_admin_note?: string | null | null
          created_at?: string | null | null
          updated_at?: string | null | null
        }
        Relationships: []
      }
      contest_ratings: {
        Row: {
          id: string
          event_id: string
          submission_id: string
          reviewer_id: string
          score: number
          is_valid: boolean
          moderation_reason: string | null | null
          moderated_by: string | null
          moderated_at: string | null | null
          created_at: string | null | null
        }
        Insert: {
          id?: string
          event_id: string
          submission_id: string
          reviewer_id: string
          score: number
          is_valid?: boolean
          moderation_reason?: string | null | null
          moderated_by?: string | null
          moderated_at?: string | null | null
          created_at?: string | null | null
        }
        Update: {
          id?: string
          event_id?: string
          submission_id?: string
          reviewer_id?: string
          score?: number
          is_valid?: boolean
          moderation_reason?: string | null | null
          moderated_by?: string | null
          moderated_at?: string | null | null
          created_at?: string | null | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_ratings_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contest_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_submissions: {
        Row: {
          id: string
          event_id: string
          user_id: string
          project_name: string
          project_description: string
          live_url: string
          repo_url: string | null | null
          status: string
          moderation_reason: string | null | null
          moderated_by: string | null
          moderated_at: string | null | null
          admin_override_edit_allowed: boolean
          avg_rating: number
          rating_count: number
          submitted_at: string | null | null
          updated_at: string | null | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          project_name: string
          project_description: string
          live_url: string
          repo_url?: string | null | null
          status?: string
          moderation_reason?: string | null | null
          moderated_by?: string | null
          moderated_at?: string | null | null
          admin_override_edit_allowed?: boolean
          avg_rating?: number
          rating_count?: number
          submitted_at?: string | null | null
          updated_at?: string | null | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          project_name?: string
          project_description?: string
          live_url?: string
          repo_url?: string | null | null
          status?: string
          moderation_reason?: string | null | null
          moderated_by?: string | null
          moderated_at?: string | null | null
          admin_override_edit_allowed?: boolean
          avg_rating?: number
          rating_count?: number
          submitted_at?: string | null | null
          updated_at?: string | null | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_submissions_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance_codes: {
        Row: {
          id: string
          event_id: string
          code_hash: string
          code_display: string | null | null
          valid_from: string | null
          valid_until: string | null
          is_active: boolean
          revoked_at: string | null | null
          revoked_by: string | null
          created_by: string | null
          created_at: string | null | null
        }
        Insert: {
          id?: string
          event_id: string
          code_hash: string
          code_display?: string | null | null
          valid_from: string | null
          valid_until: string | null
          is_active?: boolean
          revoked_at?: string | null | null
          revoked_by?: string | null
          created_by?: string | null
          created_at?: string | null | null
        }
        Update: {
          id?: string
          event_id?: string
          code_hash?: string
          code_display?: string | null | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          revoked_at?: string | null | null
          revoked_by?: string | null
          created_by?: string | null
          created_at?: string | null | null
        }
        Relationships: []
      }
      event_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          attended: boolean | null
          email: string
          event_id: string
          id: string
          name: string
          phone: string | null
          registered_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          attended?: boolean | null
          email: string
          event_id: string
          id?: string
          name: string
          phone?: string | null
          registered_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attended?: boolean | null
          email?: string
          event_id?: string
          id?: string
          name?: string
          phone?: string | null
          registered_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          banner_image: string | null
          category_id: string | null
          contest_status: string | null
          external_registration_url: string | null
          is_gallery_published: boolean | null
          is_leaderboard_published: boolean | null
          is_ratings_open: boolean | null
          is_submissions_open: boolean | null
          min_ratings_for_ranking: number | null
          rating_close_at: string | null
          rating_open_at: string | null
          submission_close_at: string | null
          submission_open_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string | null
          gallery_enabled: boolean | null
          id: string
          image_url: string | null
          is_online: boolean | null
          is_published: boolean | null
          is_upcoming: boolean | null
          location: string | null
          max_participants: number | null
          meeting_link: string | null
          registration_deadline: string | null
          short_description: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          title: string
          unstop_registration_link: string | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          banner_image?: string | null
          category_id?: string | null
          contest_status?: string | null
          external_registration_url?: string | null
          is_gallery_published?: boolean | null
          is_leaderboard_published?: boolean | null
          is_ratings_open?: boolean | null
          is_submissions_open?: boolean | null
          min_ratings_for_ranking?: number | null
          rating_close_at?: string | null
          rating_open_at?: string | null
          submission_close_at?: string | null
          submission_open_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string | null
          gallery_enabled?: boolean | null
          id?: string
          image_url?: string | null
          is_online?: boolean | null
          is_published?: boolean | null
          is_upcoming?: boolean | null
          location?: string | null
          max_participants?: number | null
          meeting_link?: string | null
          registration_deadline?: string | null
          short_description?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          title: string
          unstop_registration_link?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          banner_image?: string | null
          category_id?: string | null
          contest_status?: string | null
          external_registration_url?: string | null
          is_gallery_published?: boolean | null
          is_leaderboard_published?: boolean | null
          is_ratings_open?: boolean | null
          is_submissions_open?: boolean | null
          min_ratings_for_ranking?: number | null
          rating_close_at?: string | null
          rating_open_at?: string | null
          submission_close_at?: string | null
          submission_open_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string | null
          gallery_enabled?: boolean | null
          id?: string
          image_url?: string | null
          is_online?: boolean | null
          is_published?: boolean | null
          is_upcoming?: boolean | null
          location?: string | null
          max_participants?: number | null
          meeting_link?: string | null
          registration_deadline?: string | null
          short_description?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          title?: string
          unstop_registration_link?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      event_gallery: {
        Row: {
          album: string | null
          caption: string | null
          created_at: string | null
          event_id: string | null
          id: string
          image_url: string | null
          media_type: string | null
          media_url: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          album?: string | null
          caption?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          media_type?: string | null
          media_url: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          album?: string | null
          caption?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          media_type?: string | null
          media_url?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_gallery_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          community_member_count: number
          id: number
          instagram: string | null
          linkedin: string | null
          site_og_image: string | null
          site_url: string | null
          updated_at: string | null
          whatsapp_community: string | null
          youtube: string | null
        }
        Insert: {
          community_member_count?: number
          id?: number
          instagram?: string | null
          linkedin?: string | null
          site_og_image?: string | null
          site_url?: string | null
          updated_at?: string | null
          whatsapp_community?: string | null
          youtube?: string | null
        }
        Update: {
          community_member_count?: number
          id?: number
          instagram?: string | null
          linkedin?: string | null
          site_og_image?: string | null
          site_url?: string | null
          updated_at?: string | null
          whatsapp_community?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          subscribed_at: string | null | null
        }
        Insert: {
          id?: string
          email: string
          subscribed_at?: string | null | null
        }
        Update: {
          id?: string
          email?: string
          subscribed_at?: string | null | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          linkedin_url: string | null
          phone: string | null
          role: string | null
          skills: string[] | null
          unstop_profile_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          linkedin_url?: string | null
          phone?: string | null
          role?: string | null
          skills?: string[] | null
          unstop_profile_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          linkedin_url?: string | null
          phone?: string | null
          role?: string | null
          skills?: string[] | null
          unstop_profile_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          download_count: number | null
          external_url: string | null
          file_url: string | null
          id: string
          is_member_only: boolean | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_member_only?: boolean | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_member_only?: boolean | null
          title?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          department: string | null
          display_order: number | null
          email: string | null
          github_url: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          linkedin_url: string | null
          name: string
          role: string
          skills: string[] | null
          unstop_profile_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          display_order?: number | null
          email?: string | null
          github_url?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          linkedin_url?: string | null
          name: string
          role: string
          skills?: string[] | null
          unstop_profile_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          display_order?: number | null
          email?: string | null
          github_url?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          linkedin_url?: string | null
          name?: string
          role?: string
          skills?: string[] | null
          unstop_profile_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_event_attendance_code: {
        Args: { p_event_id: string; p_validity_hours: number }
        Returns: string
      }
      generate_participant_codes: {
        Args: { p_event_id: string; p_count: number; p_validity_hours: number }
        Returns: Json
      }
      get_contest_leaderboard: {
        Args: { p_event_id: string; p_limit: number }
        Returns: { rank: number; submission_id: string; project_name: string; participant_name: string | null; participant_id: string | null; live_url: string; repo_url: string | null; avg_rating: number; rating_count: number; submitted_at: string; is_provisional: boolean }[]
      }
      get_contest_submission_with_details: {
        Args: { p_submission_id: string }
        Returns: { id: string; event_id: string; user_id: string; project_name: string; project_description: string; live_url: string; repo_url: string | null; status: string; moderation_reason: string | null; moderated_by: string | null; moderated_at: string | null; admin_override_edit_allowed: boolean; avg_rating: number; rating_count: number; submitted_at: string; updated_at: string; participant_name: string | null; participant_email: string | null; participant_avatar: string | null; verification_status: string | null; user_has_rated: boolean }[]
      }
      get_event_attendance: {
        Args: { p_event_id: string }
        Returns: { id: string; user_id: string; code_id: string; status: string; marked_at: string; email: string | null; full_name: string | null }[]
      }
      get_participant_batches: {
        Args: { p_event_id: string }
        Returns: { id: string; label: string; code_count: number; valid_from: string; valid_until: string; created_at: string; revoked_at: string | null; used_count: number; remaining_count: number }[]
      }
      get_participant_codes: {
        Args: { p_batch_id: string }
        Returns: { serial_no: number; code: string; is_used: boolean }[]
      }
      get_user_contest_status: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: { is_verified: boolean; verification_status: string | null; has_submitted: boolean; submission_id: string | null; current_rank: number | null; total_ranked: number; websites_rated: number; eligible_to_rate: number }[]
      }
      link_contest_participant_to_user: {
        Args: { p_event_id: string; p_user_email: string }
        Returns: null
      }
      mark_attendance: {
        Args: { p_code: string }
        Returns: string
      }
      revoke_event_attendance_code: {
        Args: { p_event_id: string }
        Returns: null
      }
      revoke_participant_batch: {
        Args: { p_batch_id: string }
        Returns: null
      }
      generate_attendance_codes: {
        Args: {
          p_event_id: string
          p_count: number
        }
        Returns: {
          code: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          participant_email: string | null
          participant_name: string | null
          redeemed_at: string | null
          status: string
        }[]
      }
      verify_attendance_code: {
        Args: {
          p_event_id: string
          p_code: string
          p_name: string
          p_email: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_certificate: {
        Args: {
          p_token: string
        }
        Returns: {
          verification_status: string
          certificate_number: string | null
          certificate_type: string | null
          recipient_category: string | null
          recipient_name: string | null
          event_title: string | null
          event_description: string | null
          event_date: string | null
          event_venue: string | null
          event_is_online: boolean | null
          event_category: string | null
          organizer_name: string | null
          organizer_organization: string | null
          signer_name: string | null
          signer_designation: string | null
          signer_signature_url: string | null
          signer2_name: string | null
          signer2_designation: string | null
          signer2_signature_url: string | null
          role: string | null
          team: string | null
          contribution_summary: string | null
          custom_title: string | null
          special_recognition: string | null
          template_key: string | null
          certificate_file_url: string | null
          issue_date: string | null
          verified_at: string
        }[]
      }
      increment_certificate_download: {
        Args: { p_certificate_id: string }
        Returns: null
      }
      claim_my_certificates: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member" | "super_admin"
      event_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "member", "super_admin"],
      event_status: ["draft", "published", "archived"],
    },
  },
} as const
