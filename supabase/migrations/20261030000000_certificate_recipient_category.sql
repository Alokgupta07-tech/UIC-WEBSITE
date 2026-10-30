-- Store the admin-reviewed recipient category used to select a certificate family.
-- Existing records remain NULL for admin review; no category is inferred from role text.
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS recipient_category text;

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_recipient_category_check;

ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_recipient_category_check CHECK (
    recipient_category IS NULL OR recipient_category IN (
      'participant', 'winner', 'organizer', 'volunteer', 'team_member',
      'faculty_coordinator', 'mentor', 'speaker', 'judge', 'other'
    )
  );

ALTER TABLE public.certificate_email_logs
  ADD COLUMN IF NOT EXISTS attachment_sha256 text;

DROP FUNCTION IF EXISTS public.verify_certificate(text);
CREATE FUNCTION public.verify_certificate(p_token text)
RETURNS TABLE (
  verification_status text,
  certificate_number text,
  certificate_type text,
  recipient_category text,
  recipient_name text,
  event_title text,
  event_description text,
  event_date timestamptz,
  event_venue text,
  event_is_online boolean,
  event_category text,
  organizer_name text,
  organizer_organization text,
  signer_name text,
  signer_designation text,
  signer_signature_url text,
  signer2_name text,
  signer2_designation text,
  signer2_signature_url text,
  certificate_file_url text,
  issue_date date,
  verified_at timestamptz,
  role text,
  team text,
  contribution_summary text,
  custom_title text,
  special_recognition text,
  template_key text
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
      'not_found'::text,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::timestamptz, null::text, null::boolean, null::text, null::text,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::text, null::text, null::date, now(), null::text, null::text,
      null::text, null::text, null::text, null::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    CASE c.status
      WHEN 'issued' THEN 'verified'
      WHEN 'revoked' THEN 'revoked'
      WHEN 'expired' THEN 'expired'
      ELSE 'invalid'
    END::text,
    c.certificate_number,
    c.certificate_type,
    c.recipient_category,
    c.recipient_name,
    e.title,
    coalesce(e.short_description, e.description),
    e.event_date,
    CASE WHEN coalesce(e.is_online, false) THEN null ELSE e.venue END,
    coalesce(e.is_online, false),
    cat.name,
    c.organizer_name,
    c.organizer_organization,
    c.signer_name,
    c.signer_designation,
    c.signer_signature_url,
    c.signer2_name,
    c.signer2_designation,
    c.signer2_signature_url,
    CASE WHEN c.status = 'issued' THEN c.certificate_file_url ELSE null END,
    c.issue_date,
    now(),
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
      'not_found'::text,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::timestamptz, null::text, null::boolean, null::text, null::text,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::text, null::text, null::date, now(), null::text, null::text,
      null::text, null::text, null::text, null::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
