-- ============================================================================
-- Unstop Igniters Club — Attendance admin listing fix
--
-- Fixes a PostgREST 400 on GET /rest/v1/attendance?select=*,auth_users(...)
-- The `auth` schema is not exposed to PostgREST, so embedding auth.users
-- through a foreign key is impossible. Attendance listing now goes through
-- this SECURITY DEFINER RPC, which joins auth.users server-side and returns
-- the display fields (email, full name) to admins only.
--
-- Also re-asserts the three attendance RPCs from 20260914000003 so running
-- this file alone brings a project fully current.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Admin: list attendance for an event (replaces the auth_users embed)
--    Non-admins get an empty result set rather than an error.
-- ----------------------------------------------------------------------------
create or replace function public.get_event_attendance(
  p_event_id uuid
)
returns table (
  id         uuid,
  user_id    uuid,
  code_id    uuid,
  status     text,
  marked_at  timestamptz,
  email      text,
  full_name  text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return;
  end if;

  return query
  select
    a.id,
    a.user_id,
    a.code_id,
    a.status,
    a.marked_at,
    u.email,
    coalesce(u.raw_user_meta_data ->> 'full_name', '')
  from public.attendance a
  left join auth.users u on u.id = a.user_id
  where a.event_id = p_event_id
  order by a.marked_at desc;
end;
$$;

revoke all on function public.get_event_attendance(uuid) from public;
grant execute on function public.get_event_attendance(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Re-assert the attendance RPCs (idempotent copy of 20260914000003)
-- ----------------------------------------------------------------------------

-- Admin: generate a new attendance code, server-time validity window
drop function if exists public.generate_event_attendance_code(uuid, timestamptz, timestamptz);

create or replace function public.generate_event_attendance_code(
  p_event_id      uuid,
  p_validity_hours integer
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid        uuid := auth.uid();
  v_raw        text := '';
  v_chars      text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_byte       integer;
  v_now        timestamptz := now();
  v_hours      integer := p_validity_hours;
  v_event_ok   boolean;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  if v_hours is null or v_hours < 1 or v_hours > 72 then
    raise exception 'invalid_window';
  end if;

  select exists (
    select 1 from public.events
    where id = p_event_id and status = 'published'
  ) into v_event_ok;
  if not v_event_ok then
    raise exception 'event_not_available';
  end if;

  update public.event_attendance_codes
     set is_active = false,
         revoked_at = coalesce(revoked_at, v_now),
         revoked_by = coalesce(revoked_by, v_uid)
   where event_id = p_event_id
     and is_active = true;

  for i in 1..8 loop
    v_byte := get_byte(gen_random_bytes(1), 0) & 31;
    v_raw := v_raw || substr(v_chars, v_byte + 1, 1);
  end loop;

  insert into public.event_attendance_codes (
    event_id, code_hash, code_display, valid_from, valid_until,
    is_active, created_by, created_at
  ) values (
    p_event_id,
    crypt(v_raw, gen_salt('bf')),
    'UIC-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4),
    v_now,
    v_now + make_interval(hours => v_hours),
    true, v_uid, v_now
  );

  return 'UIC-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
end;
$$;

revoke all on function public.generate_event_attendance_code(uuid, integer) from public;
grant execute on function public.generate_event_attendance_code(uuid, integer) to authenticated;

-- Admin: revoke the active code with audit columns
create or replace function public.revoke_event_attendance_code(
  p_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  update public.event_attendance_codes
     set is_active = false,
         revoked_at = now(),
         revoked_by = auth.uid()
   where event_id = p_event_id
     and is_active = true;
end;
$$;

revoke all on function public.revoke_event_attendance_code(uuid) from public;
grant execute on function public.revoke_event_attendance_code(uuid) to authenticated;

-- Participant: mark attendance; event derived from the matched code
drop function if exists public.mark_attendance(uuid, text);

create or replace function public.mark_attendance(
  p_code text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid        uuid := auth.uid();
  v_email      text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_canonical  text;
  v_code       record;
  v_now        timestamptz := now();
  v_failed     integer;
begin
  if v_uid is null then
    return 'unauthorized';
  end if;

  select count(*) into v_failed
    from public.attendance_attempt_log
   where user_id = v_uid
     and success = false
     and attempted_at > v_now - interval '15 minutes';
  if v_failed >= 10 then
    return 'rate_limited';
  end if;

  delete from public.attendance_attempt_log where attempted_at < v_now - interval '1 day';

  v_canonical := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_canonical) <> 8 then
    insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
    return 'invalid_code';
  end if;

  for v_code in
    select c.*
      from public.event_attendance_codes c
     where c.is_active = true
  loop
    if v_code.code_hash = crypt(v_canonical, v_code.code_hash) then
      if v_now < v_code.valid_from then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'too_early';
      end if;
      if v_now > v_code.valid_until then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'too_late';
      end if;

      if not exists (
        select 1 from public.events e
         where e.id = v_code.event_id
           and e.status = 'published'
      ) then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'event_not_available';
      end if;

      if not exists (
        select 1 from public.event_registrations r
         where r.event_id = v_code.event_id
           and (r.user_id = v_uid
                or (v_email <> '' and lower(r.email) = v_email))
      ) then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'not_registered';
      end if;

      if exists (
        select 1 from public.attendance
         where event_id = v_code.event_id and user_id = v_uid
      ) then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'already_attended';
      end if;

      begin
        insert into public.attendance (event_id, user_id, code_id, status)
        values (v_code.event_id, v_uid, v_code.id, 'verified');
      exception when unique_violation then
        return 'already_attended';
      end;

      insert into public.attendance_attempt_log (user_id, success) values (v_uid, true);
      return 'success';
    end if;
  end loop;

  insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
  return 'invalid_code';
end;
$$;

revoke all on function public.mark_attendance(text) from public;
grant execute on function public.mark_attendance(text) to authenticated;
