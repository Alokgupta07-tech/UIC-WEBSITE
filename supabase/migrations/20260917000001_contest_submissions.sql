-- ============================================================================
-- Vibe Coding Contest — Website Submissions Table
-- Migration 2 of 5: Contest Submissions with Rating Aggregates
-- ============================================================================

-- Website submissions for the contest
create table if not exists public.contest_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Project details
  project_name text not null check (char_length(trim(project_name)) >= 2 and char_length(trim(project_name)) <= 120),
  project_description text not null check (char_length(trim(project_description)) >= 10 and char_length(trim(project_description)) <= 1000),
  live_url text not null check (live_url ~* '^https?://'),
  repo_url text check (repo_url is null or repo_url ~* '^https?://'),
  
  -- Moderation
  status text not null default 'approved' 
    check (status in ('approved', 'pending_moderation', 'rejected', 'hidden')),
  moderation_reason text,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  admin_override_edit_allowed boolean not null default false,
  
  -- Rating aggregates (maintained by triggers)
  avg_rating numeric(4,2) not null default 0.00 check (avg_rating >= 0 and avg_rating <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  
  -- Timestamps
  submitted_at timestamptz not null default now(), -- IMMUTABLE tie-breaker
  updated_at timestamptz not null default now()
);

-- One submission per user per event
create unique index if not exists contest_submissions_event_user_unique 
  on public.contest_submissions(event_id, user_id);

-- Indexes for gallery and leaderboard queries
create index if not exists contest_submissions_event_id_idx 
  on public.contest_submissions(event_id);

create index if not exists contest_submissions_user_id_idx 
  on public.contest_submissions(user_id);

create index if not exists contest_submissions_status_idx 
  on public.contest_submissions(event_id, status);

-- Critical composite index for leaderboard ranking
create index if not exists contest_submissions_leaderboard_idx 
  on public.contest_submissions(event_id, status, avg_rating desc, rating_count desc, submitted_at asc)
  where status = 'approved';

-- Search index for project names
create index if not exists contest_submissions_project_name_search_idx 
  on public.contest_submissions using gin(to_tsvector('english', project_name));

-- Protect submitted_at from accidental updates (tie-breaker immutability)
create or replace function public.protect_contest_submission_submitted_at()
returns trigger
language plpgsql
as $$
begin
  -- Force submitted_at to remain unchanged
  new.submitted_at = old.submitted_at;
  -- Update the updated_at timestamp
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_contest_submission_submitted_at_trigger 
  on public.contest_submissions;

create trigger protect_contest_submission_submitted_at_trigger
  before update on public.contest_submissions
  for each row
  execute function public.protect_contest_submission_submitted_at();

-- RLS Policies
alter table public.contest_submissions enable row level security;

-- Public can view approved submissions when gallery is published
create policy "Public can view approved contest submissions"
  on public.contest_submissions
  for select
  using (
    status = 'approved'
    and exists (
      select 1 from public.events
      where id = event_id
      and (status = 'published' or is_published = true)
    )
  );

-- Users can view their own submissions regardless of status
create policy "Users can view their own submissions"
  on public.contest_submissions
  for select
  using (auth.uid() = user_id);

-- Verified participants can insert their submission
create policy "Verified participants can submit websites"
  on public.contest_submissions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.contest_participants
      where event_id = contest_submissions.event_id
      and user_id = auth.uid()
      and verification_status = 'verified'
    )
  );

-- Users can update their own submission (deadline enforcement in application layer)
create policy "Users can update their own submissions"
  on public.contest_submissions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins can view all submissions
create policy "Admins can view all contest submissions"
  on public.contest_submissions
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- Admins can update/delete submissions for moderation
create policy "Admins can moderate contest submissions"
  on public.contest_submissions
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

comment on table public.contest_submissions is 
  'Website submissions for the Vibe Coding Contest with automatic rating aggregates';

comment on column public.contest_submissions.submitted_at is 
  'Immutable initial submission timestamp used as tie-breaker #3 in leaderboard';

comment on column public.contest_submissions.avg_rating is 
  'Automatically maintained by triggers from valid ratings';

comment on column public.contest_submissions.rating_count is 
  'Automatically maintained by triggers from valid ratings';
