-- ============================================================
-- MIGRATION: UIC Website Phase 1–3 Updates
-- ============================================================

-- 1. Add Unstop event URL to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS unstop_event_url TEXT;

-- 2. Create event_gallery table (replaces resources concept)
CREATE TABLE IF NOT EXISTS public.event_gallery (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID REFERENCES public.events(id) ON DELETE SET NULL,
  event_name     TEXT NOT NULL,          -- display name, denormalised
  event_date     DATE,                   -- for grouping by event
  image_url      TEXT NOT NULL,
  caption        TEXT,
  display_order  INTEGER DEFAULT 0,
  uploaded_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_gallery ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Gallery images are publicly visible"
    ON public.event_gallery FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can insert gallery images"
    ON public.event_gallery FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update gallery images"
    ON public.event_gallery FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete gallery images"
    ON public.event_gallery FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Create site_settings table (for member count & contact info)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  label      TEXT,                       -- human-readable label for admin UI
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Settings are publicly readable"
    ON public.site_settings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update settings"
    ON public.site_settings FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can insert settings"
    ON public.site_settings FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Seed default site_settings
-- !! UPDATE THESE VALUES WITH YOUR REAL INFO BEFORE DEPLOYING !!
INSERT INTO public.site_settings (key, value, label) VALUES
  ('community_members', '120',                                       'WhatsApp Community Members (number only)'),
  ('events_hosted',     '25+',                                       'Events Hosted (e.g. 25+)'),
  ('competitions_won',  '15+',                                       'Competitions Won (e.g. 15+)'),
  ('contact_email',     'igniters@youruniversity.edu',               'Club Email'),
  ('contact_phone',     '+91 XXXXXXXXXX',                           'Club Phone'),
  ('contact_address',   'Your College, Building Name, Room 101, City', 'Club Address'),
  ('instagram_url',     'https://instagram.com/YOUR_HANDLE',         'Instagram URL'),
  ('linkedin_url',      'https://linkedin.com/company/YOUR_HANDLE',  'LinkedIn URL'),
  ('twitter_url',       'https://twitter.com/YOUR_HANDLE',           'Twitter / X URL'),
  ('youtube_url',       'https://youtube.com/@YOUR_HANDLE',          'YouTube URL'),
  ('whatsapp_url',      'https://chat.whatsapp.com/YOUR_INVITE_LINK','WhatsApp Community Link')
ON CONFLICT (key) DO NOTHING;

-- 5. Create newsletter_subscribers table (wire up the footer form)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can subscribe"
    ON public.newsletter_subscribers FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view subscribers"
    ON public.newsletter_subscribers FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Update handle_new_user function to handle Google OAuth metadata
-- Google provides 'full_name' or 'name' in raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
