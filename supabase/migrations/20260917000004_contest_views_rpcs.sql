-- ============================================================================
-- Vibe Coding Contest — Views and Stored Procedures
-- Migration 5 of 5: Leaderboard view and RPC functions
-- ============================================================================

-- ============================================================================
-- VIEW: Contest Leaderboard (Top 5 with ranking)
-- ============================================================================

create or replace view public.contest_leaderboard
with (security_invoker = true)
as
select 
  cs.id as submission_id,
  cs.event_id,
  cs.project_name,
  cs.project_description,
  cs.live_url,
  cs.repo_url,
  cs.avg_rating,
  cs.rating_count,
  cs.submitted_at,
  p.full_name as participant_name,
  p.email as participant_email,
  p.avatar_url as participant_avatar,
  p.unstop_profile_url,
  row_number() over (
    partition by cs.event_id 
    order by cs.avg_rating desc, cs.rating_count desc, cs.submitted_at asc
  ) as rank
from public.contest_submissions cs
join public.profiles p on cs.user_id = p.id
where 
  cs.status = 'approved'
  and cs.rating_count >= (
    select coalesce(min_ratings_for_ranking, 1)
    from public.events
    where id = cs.event_id
  );

comment on view public.contest_leaderboard is 
  'Real-time leaderboard for contest submissions ranked by average rating';

-- ============================================================================
-- RPC: Get Contest Settings
-- ============================================================================

create or replace function public.get_contest_settings(p_event_id uuid)
returns table (
  contest_status text,
  is_submissions_open boolean,
  is_ratings_open boolean,
  is_gallery_published boolean,
  is_leaderboard_published boolean,
  submission_open_at timestamptz,
  submission_close_at timestamptz,
  rating_open_at timestamptz,
  rating_close_at timestamptz,
  min_ratings_for_ranking integer,
  external_registration_url text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select 
    e.contest_status,
    e.is_submissions_open,
    e.is_ratings_open,
    e.is_gallery_published,
    e.is_leaderboard_published,
    e.submission_open_at,
    e.submission_close_at,
    e.rating_open_at,
    e.rating_close_at,
    e.min_ratings_for_ranking,
    e.external_registration_url
  from public.events e
  where e.id = p_event_id;
end;
$$;

comment on function public.get_contest_settings(uuid) is 
  'Fetch all contest settings for an event';

-- ============================================================================
-- RPC: Update Contest Settings (Admin only)
-- ============================================================================

create or replace function public.update_contest_settings(
  p_event_id uuid,
  p_contest_status text default null,
  p_is_submissions_open boolean default null,
  p_is_ratings_open boolean default null,
  p_is_gallery_published boolean default null,
  p_is_leaderboard_published boolean default null,
  p_submission_open_at timestamptz default null,
  p_submission_close_at timestamptz default null,
  p_rating_open_at timestamptz default null,
  p_rating_close_at timestamptz default null,
  p_min_ratings_for_ranking integer default null,
  p_external_registration_url text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  -- Verify admin privileges
  if not exists (
    select 1 from public.user_roles
    where user_id = v_admin_id
    and role in ('admin', 'super_admin')
  ) then
    raise exception 'PERMISSION_DENIED: Only admins can update contest settings';
  end if;
  
  -- Update only provided fields
  update public.events
  set 
    contest_status = coalesce(p_contest_status, contest_status),
    is_submissions_open = coalesce(p_is_submissions_open, is_submissions_open),
    is_ratings_open = coalesce(p_is_ratings_open, is_ratings_open),
    is_gallery_published = coalesce(p_is_gallery_published, is_gallery_published),
    is_leaderboard_published = coalesce(p_is_leaderboard_published, is_leaderboard_published),
    submission_open_at = coalesce(p_submission_open_at, submission_open_at),
    submission_close_at = coalesce(p_submission_close_at, submission_close_at),
    rating_open_at = coalesce(p_rating_open_at, rating_open_at),
    rating_close_at = coalesce(p_rating_close_at, rating_close_at),
    min_ratings_for_ranking = coalesce(p_min_ratings_for_ranking, min_ratings_for_ranking),
    external_registration_url = coalesce(p_external_registration_url, external_registration_url),
    updated_at = now()
  where id = p_event_id;
  
  -- Log the moderation action
  insert into public.contest_moderation_logs (
    event_id,
    admin_id,
    target_type,
    target_id,
    action,
    reason,
    metadata
  ) values (
    p_event_id,
    v_admin_id,
    'settings',
    p_event_id,
    'update_contest_settings',
    'Admin updated contest settings',
    jsonb_build_object(
      'contest_status', p_contest_status,
      'is_submissions_open', p_is_submissions_open,
      'is_ratings_open', p_is_ratings_open,
      'is_gallery_published', p_is_gallery_published,
      'is_leaderboard_published', p_is_leaderboard_published
    )
  );
end;
$$;

comment on function public.update_contest_settings is 
  'Update contest settings (admin only) with audit logging';

-- ============================================================================
-- RPC: Bulk Verify Participants (CSV Import)
-- ============================================================================

create or replace function public.bulk_verify_participants(
  p_event_id uuid,
  p_participants jsonb
)
returns table (
  imported_count integer,
  updated_count integer,
  failed_count integer,
  errors jsonb
)
language plpgsql
security definer
as $$
declare
  v_admin_id uuid := auth.uid();
  v_imported integer := 0;
  v_updated integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_participant jsonb;
  v_email text;
  v_full_name text;
  v_unstop_url text;
begin
  -- Verify admin privileges
  if not exists (
    select 1 from public.user_roles
    where user_id = v_admin_id
    and role in ('admin', 'super_admin')
  ) then
    raise exception 'PERMISSION_DENIED: Only admins can bulk verify participants';
  end if;
  
  -- Process each participant
  for v_participant in select * from jsonb_array_elements(p_participants)
  loop
    begin
      v_email := lower(trim(v_participant->>'email'));
      v_full_name := trim(v_participant->>'full_name');
      v_unstop_url := nullif(trim(v_participant->>'unstop_profile_url'), '');
      
      -- Validate email
      if v_email is null or v_email = '' or v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' then
        v_errors := v_errors || jsonb_build_object(
          'email', v_email,
          'error', 'Invalid email format'
        );
        v_failed := v_failed + 1;
        continue;
      end if;
      
      -- Insert or update participant
      insert into public.contest_participants (
        event_id,
        email,
        full_name,
        unstop_profile_url,
        verification_status
      ) values (
        p_event_id,
        v_email,
        v_full_name,
        v_unstop_url,
        'verified'
      )
      on conflict (event_id, email) 
      do update set
        full_name = excluded.full_name,
        unstop_profile_url = excluded.unstop_profile_url,
        verification_status = 'verified',
        updated_at = now();
      
      if found then
        v_updated := v_updated + 1;
      else
        v_imported := v_imported + 1;
      end if;
      
    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'email', v_email,
        'error', SQLERRM
      );
      v_failed := v_failed + 1;
    end;
  end loop;
  
  -- Log the bulk action
  insert into public.contest_moderation_logs (
    event_id,
    admin_id,
    target_type,
    target_id,
    action,
    reason,
    metadata
  ) values (
    p_event_id,
    v_admin_id,
    'participant',
    p_event_id,
    'bulk_verify_participants',
    'Bulk participant import via CSV',
    jsonb_build_object(
      'imported_count', v_imported,
      'updated_count', v_updated,
      'failed_count', v_failed,
      'total_processed', jsonb_array_length(p_participants)
    )
  );
  
  return query select v_imported, v_updated, v_failed, v_errors;
end;
$$;

comment on function public.bulk_verify_participants is 
  'Bulk import and verify participants from CSV (admin only)';

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

grant select on public.contest_leaderboard to authenticated;
grant execute on function public.get_contest_settings(uuid) to authenticated;
grant execute on function public.update_contest_settings to authenticated;
grant execute on function public.bulk_verify_participants to authenticated;
