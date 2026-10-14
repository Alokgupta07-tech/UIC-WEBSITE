-- ============================================================================
-- Vibe Coding Contest — Contest Settings Extension & Moderation Log
-- Migration 4 of 5: Extend events table and add moderation audit log
-- ============================================================================

-- Extend events table for contest-specific settings
alter table public.events
  add column if not exists contest_status text default 'draft' 
    check (contest_status in (
      'draft', 'published', 'verification_open', 'submissions_open', 
      'submissions_closed', 'ratings_open', 'ratings_closed', 
      'results_published', 'completed'
    )),
  add column if not exists is_submissions_open boolean default false,
  add column if not exists is_ratings_open boolean default false,
  add column if not exists is_gallery_published boolean default true,
  add column if not exists is_leaderboard_published boolean default false,
  add column if not exists submission_open_at timestamptz,
  add column if not exists submission_close_at timestamptz,
  add column if not exists rating_open_at timestamptz,
  add column if not exists rating_close_at timestamptz,
  add column if not exists min_ratings_for_ranking integer default 1 check (min_ratings_for_ranking >= 0),
  add column if not exists external_registration_url text;

-- Create index for contest status queries
create index if not exists events_contest_status_idx 
  on public.events(contest_status) 
  where contest_status is not null;

-- ============================================================================
-- MODERATION AUDIT LOG
-- ============================================================================

create table if not exists public.contest_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  
  -- What was moderated
  target_type text not null check (target_type in ('participant', 'submission', 'rating', 'settings')),
  target_id uuid not null,
  action text not null,
  reason text,
  metadata jsonb,
  
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists contest_moderation_logs_event_id_idx 
  on public.contest_moderation_logs(event_id);

create index if not exists contest_moderation_logs_admin_id_idx 
  on public.contest_moderation_logs(admin_id);

create index if not exists contest_moderation_logs_target_idx 
  on public.contest_moderation_logs(target_type, target_id);

create index if not exists contest_moderation_logs_created_at_idx 
  on public.contest_moderation_logs(created_at desc);

-- RLS
alter table public.contest_moderation_logs enable row level security;

-- Only admins can view and insert moderation logs
create policy "Admins can view moderation logs"
  on public.contest_moderation_logs
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can insert moderation logs"
  on public.contest_moderation_logs
  for insert
  with check (
    auth.uid() = admin_id
    and exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

comment on table public.contest_moderation_logs is 
  'Audit log for all admin moderation actions on contest data';

-- ============================================================================
-- SEED: Create the Vibe Coding Contest Event
-- ============================================================================

-- Insert or update the Vibe Coding Contest event
insert into public.events (
  title,
  description,
  short_description,
  status,
  is_published,
  contest_status,
  is_submissions_open,
  is_ratings_open,
  is_gallery_published,
  is_leaderboard_published,
  min_ratings_for_ranking,
  event_date,
  created_at
) values (
  'Vibe Coding Contest',
  'Submit your best website project and compete with fellow developers. Build, rate, and win!',
  'A competitive website showcase with peer ratings and leaderboard',
  'published',
  true,
  'published',
  false,
  false,
  true,
  false,
  1,
  now() + interval '30 days', -- Default event date 30 days from now
  now()
)
on conflict do nothing;

comment on column public.events.contest_status is 
  'Contest lifecycle state for Vibe Coding Contest';

comment on column public.events.min_ratings_for_ranking is 
  'Minimum ratings required before a submission is eligible for official ranking (default: 1)';
