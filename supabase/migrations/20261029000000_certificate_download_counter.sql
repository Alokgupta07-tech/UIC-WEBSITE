-- Make certificate download counting a single authorized database operation.
CREATE OR REPLACE FUNCTION public.increment_certificate_download(p_certificate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin() AND NOT EXISTS (
    SELECT 1
      FROM public.certificates c
     WHERE c.id = p_certificate_id
       AND c.status = 'issued'
       AND (
         c.recipient_user_id = auth.uid()
         OR (
           c.recipient_email IS NOT NULL
           AND lower(c.recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
         )
       )
  ) THEN
    RAISE EXCEPTION 'Certificate is not available to this user' USING ERRCODE = '42501';
  END IF;

  UPDATE public.certificates
     SET download_count = coalesce(download_count, 0) + 1
   WHERE id = p_certificate_id
     AND status = 'issued';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Issued certificate not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_certificate_download(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_certificate_download(uuid) TO authenticated;
