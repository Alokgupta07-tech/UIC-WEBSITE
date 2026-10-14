-- ============================================================================
-- Vibe Coding Contest — Peer Ratings Table with Anti-Fraud Triggers
-- Migration 3 of 5: Contest Ratings with Self-Rating Prevention
-- ============================================================================

-- Peer ratings (1-5 scale)
create table if not exists public.contest_ratings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  submission_id uuid not null references public.contest_submissions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Rating value
  score integer not null check (score >= 1 and score <= 5),
  
  -- Moderation
  is_valid boolean not null default true,
  moderation_reason text,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  
  created_at timestamptz not null default now()
);

-- CRITICAL: One rating per reviewer per submission (prevents duplicates at DB level)
create unique index if not exists contest_ratings_submission_reviewer_unique 
  on public.contest_ratings(submission_id, reviewer_id);

-- Indexes
create index if not exists contest_ratings_event_id_idx 
  on public.contest_ratings(event_id);

create index if not exists contest_ratings_submission_id_idx 
  on public.contest_ratings(submission_id);

create index if not exists contest_ratings_reviewer_id_idx 
  on public.contest_ratings(reviewer_id);

create index if not exists contest_ratings_submission_validity_idx 
  on public.contest_ratings(submission_id, is_valid);

create index if not exists contest_ratings_event_reviewer_idx 
  on public.contest_ratings(event_id, reviewer_id);

-- ============================================================================
-- TRIGGER 1: PREVENT SELF-RATING (Database-level enforcement)
-- ============================================================================

create or replace function public.prevent_self_rating()
returns trigger
language plpgsql
security definer
as $$
declare
  submission_owner_id uuid;
begin
  -- Get the owner of the submission being rated
  select user_id into submission_owner_id
  from public.contest_submissions
  where id = new.submission_id;
  
  -- Block if reviewer is the submission owner
  if submission_owner_id = new.reviewer_id then
    raise exception 'SELF_RATING_FORBIDDEN: Participants cannot rate their own website submission.';
  end if;
  
  return new;
end;
$$;

drop trigger if exists prevent_self_rating_trigger on public.contest_ratings;

create trigger prevent_self_rating_trigger
  before insert or update on public.contest_ratings
  for each row
  execute function public.prevent_self_rating();

-- ============================================================================
-- TRIGGER 2: RECALCULATE SUBMISSION RATING AGGREGATES
-- ============================================================================

create or replace function public.recalculate_submission_rating_stats()
returns trigger
language plpgsql
security definer
as $$
declare
  target_submission_id uuid;
  new_avg numeric(4,2);
  new_count integer;
begin
  -- Determine which submission was affected
  if tg_op = 'DELETE' then
    target_submission_id := old.submission_id;
  else
    target_submission_id := new.submission_id;
  end if;
  
  -- Calculate new aggregates from valid ratings only
  select 
    coalesce(round(avg(score)::numeric, 2), 0.00),
    coalesce(count(*)::integer, 0)
  into new_avg, new_count
  from public.contest_ratings
  where submission_id = target_submission_id
  and is_valid = true;
  
  -- Update the submission's cached aggregates
  update public.contest_submissions
  set 
    avg_rating = new_avg,
    rating_count = new_count,
    updated_at = now()
  where id = target_submission_id;
  
  return null; -- For AFTER trigger
end;
$$;

drop trigger if exists recalculate_submission_rating_stats_insert_trigger 
  on public.contest_ratings;
drop trigger if exists recalculate_submission_rating_stats_update_trigger 
  on public.contest_ratings;
drop trigger if exists recalculate_submission_rating_stats_delete_trigger 
  on public.contest_ratings;

create trigger recalculate_submission_rating_stats_insert_trigger
  after insert on public.contest_ratings
  for each row
  execute function public.recalculate_submission_rating_stats();

create trigger recalculate_submission_rating_stats_update_trigger
  after update on public.contest_ratings
  for each row
  when (old.is_valid is distinct from new.is_valid or old.score is distinct from new.score)
  execute function public.recalculate_submission_rating_stats();

create trigger recalculate_submission_rating_stats_delete_trigger
  after delete on public.contest_ratings
  for each row
  execute function public.recalculate_submission_rating_stats();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

alter table public.contest_ratings enable row level security;

-- Reviewers can view their own ratings
create policy "Users can view their own ratings"
  on public.contest_ratings
  for select
  using (auth.uid() = reviewer_id);

-- Verified participants can insert ratings (enforcement in application)
create policy "Verified participants can submit ratings"
  on public.contest_ratings
  for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.contest_participants
      where event_id = contest_ratings.event_id
      and user_id = auth.uid()
      and verification_status = 'verified'
    )
  );

-- Admins can view all ratings for moderation
create policy "Admins can view all contest ratings"
  on public.contest_ratings
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- Admins can update ratings for moderation (invalidation)
create policy "Admins can moderate contest ratings"
  on public.contest_ratings
  for update
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

comment on table public.contest_ratings is 
  'Peer ratings for contest submissions with anti-fraud database triggers';

comment on index public.contest_ratings_submission_reviewer_unique is 
  'CRITICAL: Prevents duplicate ratings even under concurrent requests';
