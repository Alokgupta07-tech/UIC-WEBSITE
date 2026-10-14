-- ============================================================================
-- Certified Students Table Migration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.certified_students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  department    TEXT,
  year          TEXT,
  achievement   TEXT NOT NULL,
  event         TEXT NOT NULL,
  position      TEXT,
  image_url     TEXT,
  linkedin_url  TEXT,
  display_order INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.certified_students ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Certified students are publicly readable if active"
    ON public.certified_students FOR SELECT
    USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can insert certified students"
    ON public.certified_students FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update certified students"
    ON public.certified_students FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete certified students"
    ON public.certified_students FOR DELETE
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed default data
INSERT INTO public.certified_students (name, department, year, achievement, event, position, image_url, linkedin_url, display_order)
VALUES
  (
    'Alok Gupta', 
    'Computer Engineering', 
    '2026', 
    'Winner', 
    'Hack-O-Utsav (36Hr Hackathon) 2024', 
    '1st Place', 
    'https://media.licdn.com/dms/image/v2/D5603AQEU5t5yR9-g_w/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1714421115372?e=1743638400&v=beta&t=o3L1JjG1kZf-w17_44sF2hPj0C6q31Q_t-5t8G0w81Y', 
    'https://linkedin.com/in/alokgupta07', 
    1
  ),
  (
    'Parag Palav', 
    'Information Technology', 
    '2026', 
    'Winner', 
    'Hack-O-Utsav (36Hr Hackathon) 2024', 
    '1st Place', 
    'https://media.licdn.com/dms/image/v2/D4D03AQGLd2U8-aXg6g/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1709477545938?e=1743638400&v=beta&t=k6z-0P-R7q6J7y-q5k91Z8c4U2-1q7K9L_1G-r8wQ4c', 
    'https://linkedin.com/in/parag-palav', 
    2
  ),
  (
    'Gaurav Sunthwal', 
    'Computer Engineering', 
    '2026', 
    'Runner Up', 
    'Ideathon 2024', 
    '2nd Place', 
    'https://media.licdn.com/dms/image/v2/D4D03AQE13WcQ4C9gRw/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1715448375522?e=1743638400&v=beta&t=A3L-y0Z9w17_44sF2hPj0C6q31Q_t-5t8G0w81Y', 
    'https://linkedin.com/in/gauravsunthwal', 
    3
  )
ON CONFLICT DO NOTHING;
