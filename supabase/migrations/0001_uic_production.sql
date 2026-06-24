-- ============================================================================
-- Unstop Igniters Club — Production schema migration
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Enums
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type public.event_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

-- Extend the existing app_role enum if needed (already admin/moderator/member)
-- No-op if the values already exist.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'member'
  ) then
    alter type public.app_role add value 'member';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. profiles — reconcile with spec (id = auth.uid, role default 'member')
--    Add missing columns only; do not drop existing data.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists full_name text,
  add column if not exists role text default 'member',
  add column if not exists created_at timestamptz default now();

-- Make id refer to the auth user when it doesn't already.
-- (profiles already has an `id uuid` primary key in the existing schema.)

-- ----------------------------------------------------------------------------
-- 2. handle_new_user() — auto-create profile on Google OAuth signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role, user_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    'member',
    new.id
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. events — add production columns (Unstop redirect flow)
-- ----------------------------------------------------------------------------
alter table public.events
  add column if not exists banner_image text,
  add column if not exists event_type text,
  add column if not exists is_upcoming boolean default true,
  add column if not exists gallery_enabled boolean default false,
  add column if not exists unstop_registration_link text,
  add column if not exists status public.event_status default 'draft';

-- Backfill status from legacy is_published flag for rows that already exist.
update public.events
  set status = 'published'
  where status is null and coalesce(is_published, false) = true;

update public.events
  set status = 'draft'
  where status is null;

-- ----------------------------------------------------------------------------
-- 4. event_categories — already exists. Ensure a couple of sensible defaults.
--    (No-op if they already exist by name.)
-- ----------------------------------------------------------------------------
insert into public.event_categories (name, description, color)
select * from (values
  ('Hackathon',  'Hackathons & coding sprints',   '#7c3aed'),
  ('Workshop',   'Hands-on learning sessions',    '#3b82f6'),
  ('Competition','Contests & challenges',         '#f59e0b'),
  ('Talk',       'Guest talks & panels',          '#10b981'),
  ('Networking', 'Meetups & networking',          '#ec4899')
) as v(name, description, color)
where not exists (
  select 1 from public.event_categories ec where ec.name = v.name
);

-- ----------------------------------------------------------------------------
-- 5. event_gallery — photos/videos from events
-- ----------------------------------------------------------------------------
create table if not exists public.event_gallery (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references public.events(id) on delete cascade,
  media_url   text not null,
  media_type  text not null default 'image', -- 'image' | 'video'
  caption     text,
  uploaded_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index if not exists event_gallery_event_id_idx on public.event_gallery(event_id);
create index if not exists event_gallery_created_at_idx on public.event_gallery(created_at desc);

-- ----------------------------------------------------------------------------
-- 6. settings — singleton (id = 1) for community count + social links
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  id                      int primary key default 1,
  community_member_count  int not null default 0,
  instagram               text,
  linkedin                text,
  youtube                 text,
  whatsapp_community      text,
  site_og_image           text,
  site_url                text,
  updated_at              timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into public.settings (id, community_member_count)
values (1, 0)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 7. team_members — add github_url column (spec)
-- ----------------------------------------------------------------------------
alter table public.team_members
  add column if not exists github_url text;

-- ----------------------------------------------------------------------------
-- 8. Row Level Security
-- ----------------------------------------------------------------------------

-- Helper: is the current user an admin?
-- Uses the existing public.has_role(_role, _user_id) function.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select coalesce(public.has_role('admin', auth.uid()), false);
$$;

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (
    auth.uid() = id or public.is_admin()
  );
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- events: public reads published, admin does everything
alter table public.events enable row level security;
drop policy if exists "events_public_read_published" on public.events;
create policy "events_public_read_published" on public.events
  for select using (
    status = 'published' or public.is_admin()
  );
drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- event_categories: public read
alter table public.event_categories enable row level security;
drop policy if exists "categories_public_read" on public.event_categories;
create policy "categories_public_read" on public.event_categories
  for select using (true);
drop policy if exists "categories_admin_all" on public.event_categories;
create policy "categories_admin_all" on public.event_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- event_gallery: public read, admin write
alter table public.event_gallery enable row level security;
drop policy if exists "gallery_public_read" on public.event_gallery;
create policy "gallery_public_read" on public.event_gallery
  for select using (true);
drop policy if exists "gallery_admin_all" on public.event_gallery;
create policy "gallery_admin_all" on public.event_gallery
  for all using (public.is_admin()) with check (public.is_admin());

-- team_members: public read (active), admin write
alter table public.team_members enable row level security;
drop policy if exists "team_public_read" on public.team_members;
create policy "team_public_read" on public.team_members
  for select using (true);
drop policy if exists "team_admin_all" on public.team_members;
create policy "team_admin_all" on public.team_members
  for all using (public.is_admin()) with check (public.is_admin());

-- settings: public read, admin write
alter table public.settings enable row level security;
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select using (true);
drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- contact_messages: public can insert, only admin can read/delete
alter table public.contact_messages enable row level security;
drop policy if exists "messages_public_insert" on public.contact_messages;
create policy "messages_public_insert" on public.contact_messages
  for insert with check (true);
drop policy if exists "messages_admin_all" on public.contact_messages;
create policy "messages_admin_all" on public.contact_messages
  for select using (public.is_admin());
drop policy if exists "messages_admin_update" on public.contact_messages;
create policy "messages_admin_update" on public.contact_messages
  for update using (public.is_admin());
drop policy if exists "messages_admin_delete" on public.contact_messages;
create policy "messages_admin_delete" on public.contact_messages
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. Storage bucket for event/team/gallery media (public read, admin write)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;

-- Public read policy
drop policy if exists "event_media_public_read" on storage.objects;
create policy "event_media_public_read" on storage.objects
  for select using (bucket_id = 'event-media');

-- Admin upload/update/delete
drop policy if exists "event_media_admin_insert" on storage.objects;
create policy "event_media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'event-media' and public.is_admin());

drop policy if exists "event_media_admin_update" on storage.objects;
create policy "event_media_admin_update" on storage.objects
  for update using (bucket_id = 'event-media' and public.is_admin());

drop policy if exists "event_media_admin_delete" on storage.objects;
create policy "event_media_admin_delete" on storage.objects
  for delete using (bucket_id = 'event-media' and public.is_admin());

-- ============================================================================
-- Done. Post-install checklist:
--  1. Supabase Dashboard -> Authentication -> Providers -> enable Google.
--  2. Add your site URL to Auth -> URL Configuration -> Site URL & Redirects.
--  3. Promote your account:  update public.profiles set role='admin' where email='you@gmail.com';
-- ============================================================================
