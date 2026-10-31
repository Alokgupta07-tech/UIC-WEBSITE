-- ============================================================================
-- Unstop Igniters Club — Certificate Date Validation & Admin Override Tracking
--
-- Adds date override metadata columns to the public.certificates table.
-- Allows authorized administrators to record an audited exception reason when
-- issuing advance recognition certificates or resolving date discrepancies.
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS date_override_reason text,
  ADD COLUMN IF NOT EXISTS date_override_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_override_at timestamptz;

-- Optional index for auditing certificates issued via date overrides
CREATE INDEX IF NOT EXISTS certificates_date_override_idx
  ON public.certificates(date_override_at)
  WHERE date_override_at IS NOT NULL;

