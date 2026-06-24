-- Gallery album + media_type columns
-- Adds album grouping and explicit media type to the gallery table.
-- NOTE: media_url + created_at + media_type are already defined in
-- 0001_uic_production.sql; these statements are idempotent additions.

-- Album / category grouping for gallery items (e.g. "Orientation 2025").
alter table public.event_gallery
  add column if not exists album text default 'General';

-- Explicit media type, in case the column is missing on older projects.
alter table public.event_gallery
  add column if not exists media_type text default 'image';

create index if not exists event_gallery_album_idx
  on public.event_gallery(album);
