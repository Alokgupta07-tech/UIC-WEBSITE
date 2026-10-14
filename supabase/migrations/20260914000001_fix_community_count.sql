-- Fix zero community member count issue

UPDATE public.site_settings
SET value = '1200'
WHERE key = 'community_members' AND value = '0';
