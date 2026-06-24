-- ============================================================================
-- Gallery schema fix — handles both old (20260622) and new (0001) migrations
-- ============================================================================
-- Problem: if the older 20260622000000 migration ran first, the table was
-- created with `image_url`, `uploaded_at`, `event_name`, `event_date`,
-- `display_order`.  The production migration (`0001_uic_production`) used
-- `CREATE TABLE IF NOT EXISTS` so it skipped recreation, leaving the old
-- column names in place.
--
-- This migration idempotently reconciles the schema so the app code
-- (which expects `media_url`, `created_at`, `media_type`, `album`) works
-- regardless of which migration created the table.
-- ============================================================================

-- 1. Rename image_url → media_url if the old column exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'event_gallery'
      AND column_name  = 'image_url'
  ) THEN
    ALTER TABLE public.event_gallery RENAME COLUMN image_url TO media_url;
  END IF;
END $$;

-- 2. Rename uploaded_at → created_at if the old column exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'event_gallery'
      AND column_name  = 'uploaded_at'
  ) THEN
    ALTER TABLE public.event_gallery RENAME COLUMN uploaded_at TO created_at;
  END IF;
END $$;

-- 3. Add created_at if it truly doesn't exist (not renamed, never created).
ALTER TABLE public.event_gallery
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 4. Add media_url if it doesn't exist (shouldn't happen, but be safe).
ALTER TABLE public.event_gallery
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 5. Add media_type column.
ALTER TABLE public.event_gallery
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';

-- 6. Add album column.
ALTER TABLE public.event_gallery
  ADD COLUMN IF NOT EXISTS album TEXT DEFAULT 'General';

-- 7. Drop legacy columns that no longer belong (safe — only if they exist).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'event_gallery'
      AND column_name  = 'event_name'
  ) THEN
    ALTER TABLE public.event_gallery DROP COLUMN event_name;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'event_gallery'
      AND column_name  = 'event_date'
  ) THEN
    ALTER TABLE public.event_gallery DROP COLUMN event_date;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'event_gallery'
      AND column_name  = 'display_order'
  ) THEN
    ALTER TABLE public.event_gallery DROP COLUMN display_order;
  END IF;
END $$;

-- 8. Re-create the index on created_at (might fail if already correct).
DROP INDEX IF EXISTS event_gallery_created_at_idx;
CREATE INDEX event_gallery_created_at_idx ON public.event_gallery(created_at DESC);

-- 9. Album index.
CREATE INDEX IF NOT EXISTS event_gallery_album_idx ON public.event_gallery(album);
