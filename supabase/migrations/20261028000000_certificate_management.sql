-- ============================================================================
-- Unstop Igniters Club — Certificate Management & Appreciation System
--
-- Extends the existing certificates table with role-based content fields,
-- adds certificate_templates, certificate_email_logs, and certificate_audit_log
-- tables for the full certificate management workflow.
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extend existing certificates table with role/contribution fields
-- ----------------------------------------------------------------------------

-- Role-based certificate content
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS team text;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS contribution_summary text;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS skills text[];

-- Template selection
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS template_key text DEFAULT 'royal-sapphire';

-- Email delivery tracking (inline for quick queries)
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS email_status text DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sending', 'sent', 'failed', 'skipped'));

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS email_error text;

-- PDF reference
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- Download tracking
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;

-- Revision chain: points to the certificate this one replaces
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS revision_of uuid REFERENCES public.certificates(id) ON DELETE SET NULL;

-- Participation period (for multi-day events)
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS participation_start date;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS participation_end date;

-- Second signatory
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS signer2_name text;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS signer2_designation text;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS signer2_signature_url text;

-- Custom certificate title override
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS custom_title text;

-- Special recognition line
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS special_recognition text;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS certificates_email_status_idx ON public.certificates(email_status);
CREATE INDEX IF NOT EXISTS certificates_role_idx ON public.certificates(role);
CREATE INDEX IF NOT EXISTS certificates_team_idx ON public.certificates(team);

-- ----------------------------------------------------------------------------
-- 2. Certificate Templates table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text NOT NULL DEFAULT 'general',
  theme_key   text NOT NULL DEFAULT 'royal-sapphire',
  description text,
  -- Default wording templates (JSON for flexibility)
  default_contribution_summary text,
  default_certificate_type text DEFAULT 'Certificate of Appreciation',
  -- Brand settings
  logo_url    text,
  accent_color text,
  -- Status
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can CRUD templates
DROP POLICY IF EXISTS "certificate_templates_admin_all" ON public.certificate_templates;
CREATE POLICY "certificate_templates_admin_all" ON public.certificate_templates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Anyone authenticated can read active templates (for verification page display)
DROP POLICY IF EXISTS "certificate_templates_read_active" ON public.certificate_templates;
CREATE POLICY "certificate_templates_read_active" ON public.certificate_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.touch_certificate_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_certificate_templates_updated_at ON public.certificate_templates;
CREATE TRIGGER trg_certificate_templates_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_certificate_templates_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Certificate Email Logs table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.certificate_email_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id   uuid NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  recipient_email  text NOT NULL,
  subject          text,
  provider_message_id text,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  attempt_count    integer NOT NULL DEFAULT 1,
  last_attempt_at  timestamptz NOT NULL DEFAULT now(),
  error_details    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificate_email_logs_cert_idx
  ON public.certificate_email_logs(certificate_id);
CREATE INDEX IF NOT EXISTS certificate_email_logs_status_idx
  ON public.certificate_email_logs(status);

ALTER TABLE public.certificate_email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write email logs
DROP POLICY IF EXISTS "certificate_email_logs_admin_all" ON public.certificate_email_logs;
CREATE POLICY "certificate_email_logs_admin_all" ON public.certificate_email_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Certificate Audit Log table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.certificate_audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES public.certificates(id) ON DELETE SET NULL,
  admin_id       uuid NOT NULL REFERENCES auth.users(id),
  action         text NOT NULL,
  old_status     text,
  new_status     text,
  reason         text,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificate_audit_log_cert_idx
  ON public.certificate_audit_log(certificate_id);
CREATE INDEX IF NOT EXISTS certificate_audit_log_admin_idx
  ON public.certificate_audit_log(admin_id);

ALTER TABLE public.certificate_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write audit log
DROP POLICY IF EXISTS "certificate_audit_log_admin_all" ON public.certificate_audit_log;
CREATE POLICY "certificate_audit_log_admin_all" ON public.certificate_audit_log
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Update verify_certificate() RPC to include new fields
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.verify_certificate(text);
CREATE OR REPLACE FUNCTION public.verify_certificate(p_token text)
RETURNS TABLE (
  verification_status    text,
  certificate_number     text,
  certificate_type       text,
  recipient_name         text,
  event_title            text,
  event_description      text,
  event_date             timestamptz,
  event_venue            text,
  event_is_online        boolean,
  event_category         text,
  organizer_name         text,
  organizer_organization text,
  signer_name            text,
  signer_designation     text,
  signer_signature_url   text,
  certificate_file_url   text,
  issue_date             date,
  verified_at            timestamptz,
  -- New fields
  role                   text,
  team                   text,
  contribution_summary   text,
  custom_title           text,
  special_recognition    text,
  template_key           text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_token text := btrim(coalesce(p_token, ''));
BEGIN
  IF v_token = '' OR v_token !~ '^[0-9a-fA-F]{32}$' THEN
    RETURN QUERY SELECT
      'not_found'::text, null::text, null::text, null::text, null::text,
      null::text, null::timestamptz, null::text, null::boolean, null::text,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::date, now(),
      null::text, null::text, null::text, null::text, null::text, null::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    CASE c.status
      WHEN 'issued'  THEN 'verified'
      WHEN 'revoked' THEN 'revoked'
      WHEN 'expired' THEN 'expired'
      ELSE 'invalid'
    END::text                          AS verification_status,
    c.certificate_number,
    c.certificate_type,
    c.recipient_name,
    e.title                            AS event_title,
    coalesce(e.short_description, e.description) AS event_description,
    e.event_date,
    CASE WHEN coalesce(e.is_online, false) THEN null ELSE e.venue END AS event_venue,
    coalesce(e.is_online, false)       AS event_is_online,
    cat.name                           AS event_category,
    c.organizer_name,
    c.organizer_organization,
    c.signer_name,
    c.signer_designation,
    c.signer_signature_url,
    CASE WHEN c.status = 'issued' THEN c.certificate_file_url ELSE null END AS certificate_file_url,
    c.issue_date,
    now()                              AS verified_at,
    -- New fields
    c.role,
    c.team,
    c.contribution_summary,
    c.custom_title,
    c.special_recognition,
    c.template_key
  FROM public.certificates c
  JOIN public.events e ON e.id = c.event_id
  LEFT JOIN public.event_categories cat ON cat.id = e.category_id
  WHERE c.verification_token = lower(v_token);

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'not_found'::text, null::text, null::text, null::text, null::text,
      null::text, null::timestamptz, null::text, null::boolean, null::text,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::date, now(),
      null::text, null::text, null::text, null::text, null::text, null::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Seed default certificate templates
-- ----------------------------------------------------------------------------

INSERT INTO public.certificate_templates (name, category, theme_key, default_certificate_type, default_contribution_summary, description)
VALUES
  ('Classic Appreciation', 'appreciation', 'amethyst-prestige', 'Certificate of Appreciation',
   'Presented in appreciation of the valuable contribution, dedication, and commitment demonstrated in organizing and supporting this event.',
   'For organizers, volunteers, and contributors who helped make the event successful.'),
  ('Technical Contribution', 'contribution', 'cyber-emerald', 'Certificate of Contribution',
   'Presented in recognition of the technical expertise, problem-solving abilities, and dedicated efforts contributed to the successful execution of this event.',
   'For technical team members who contributed their skills.'),
  ('Leadership Recognition', 'recognition', 'royal-sapphire', 'Certificate of Recognition',
   'Presented in recognition of the outstanding leadership, initiative, and commitment demonstrated during this event.',
   'For individuals whose contributions deserve special recognition.'),
  ('Participation', 'participation', 'cyber-emerald', 'Certificate of Participation',
   'Presented for active participation and demonstrating enthusiasm and collaborative spirit during this event.',
   'For eligible participants who attended or participated.'),
  ('Mentorship', 'mentorship', 'imperial-ruby', 'Certificate of Mentorship',
   'Presented in appreciation of the valuable guidance, knowledge, and mentorship shared with participants during this event.',
   'For mentors, speakers, and instructors.'),
  ('Achievement', 'achievement', 'grand-monarch', 'Certificate of Achievement',
   'Presented in recognition of the exceptional achievement and outstanding performance demonstrated during this event.',
   'For verified winners and achievers.'),
  ('Volunteer Service', 'appreciation', 'amethyst-prestige', 'Certificate of Appreciation',
   'Presented in recognition of the time, commitment, and support contributed towards the successful execution of this event.',
   'For volunteers who dedicated their time.'),
  ('Marketing Excellence', 'contribution', 'royal-sapphire', 'Certificate of Contribution',
   'Presented in recognition of the creativity, communication skills, and promotional efforts that helped increase awareness and engagement for this event.',
   'For marketing team members.')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Done.
-- ============================================================================
