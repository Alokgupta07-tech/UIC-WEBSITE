-- ============================================================================
-- Vibe Coding Contest — Participant Verification Table
-- Migration 1 of 5: Contest Participants & Unstop Verification
-- ============================================================================

-- Contest participants verification tracking (Unstop eligibility)
create table if not exists public.contest_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  
  -- Unstop registration data
  unstop_registration_id text,
  participant_email text not null,
  participant_name text not null,
  
  -- Verification workflow
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  verification_source text not null default 'csv_import'
    check (verification_source in ('csv_import', 'admin_manual', 'user_claim')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  rejection_or_admin_note text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints
create unique index if not exists contest_participants_event_email_unique 
  on public.contest_participants(event_id, lower(trim(participant_email)));

create unique index if not exists contest_participants_event_user_unique 
  on public.contest_participants(event_id, user_id) 
  where user_id is not null;

-- Indexes for common queries
create index if not exists contest_participants_event_id_idx 
  on public.contest_participants(event_id);

create index if not exists contest_participants_user_id_idx 
  on public.contest_participants(user_id) 
  where user_id is not null;

create index if not exists contest_participants_verification_status_idx 
  on public.contest_participants(event_id, verification_status);

create index if not exists contest_participants_email_lookup_idx 
  on public.contest_participants(lower(trim(participant_email)));

-- Updated timestamp trigger
create or replace function public.update_contest_participants_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_contest_participants_updated_at_trigger 
  on public.contest_participants;

create trigger update_contest_participants_updated_at_trigger
  before update on public.contest_participants
  for each row
  execute function public.update_contest_participants_updated_at();

-- RLS Policies
alter table public.contest_participants enable row level security;

-- Participants can view their own verification record
create policy "Users can view their own contest participation"
  on public.contest_participants
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and lower(trim(email)) = lower(trim(contest_participants.participant_email))
    )
  );

-- Admins can view all participants
create policy "Admins can view all contest participants"
  on public.contest_participants
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- Admins can insert/update/delete participants
create policy "Admins can manage contest participants"
  on public.contest_participants
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- Users can insert their own verification claim
create policy "Users can submit verification claim"
  on public.contest_participants
  for insert
  with check (
    auth.uid() = user_id
    and verification_source = 'user_claim'
    and verification_status = 'pending'
  );

comment on table public.contest_participants is 
  'Tracks Unstop registration verification and links external registrations to website user accounts';
