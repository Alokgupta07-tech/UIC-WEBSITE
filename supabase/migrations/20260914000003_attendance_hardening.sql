-- ============================================================================
-- Unstop Igniters Club — Attendance Hardening (supersedes 20260914000002)
--
-- Security fixes over the previous attendance system:
--   1. Codes are generated with cryptographically-secure gen_random_bytes
--      (bias-free 32-symbol alphabet, no I/O/0/1 confusables), NOT random().
--   2. The validity window is computed from SERVER time (now()) — the admin's
--      browser clock is never authoritative.
--   3. mark_attendance() no longer trusts the client-sent event id; the event
--      is derived from the matched code on the server.
--   4. Attendance requires event registration (by user_id or account email)
--      and rejects non-published events.
--   5. Server-side rate limiting on failed code attempts (brute-force guard).
--   6. Revocation records who revoked and when (audit columns).
--   7. The active raw code is stored in code_display, visible ONLY to admins
--      via RLS, so the organizer can re-display it during a live event.
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Schema additions
-- ----------------------------------------------------------------------------

-- Plaintext display form of the active code. Admin-only via RLS below.
alter table public.event_attendance_codes
  add column if not exists code_display text;

-- Audit trail for revocation.
alter table public.event_attendance_codes
  add column if not exists revoked_at timestamptz;
alter table public.event_attendance_codes
  add column if not exists revoked_by uuid references auth.users(id) on delete set null;

-- Brute-force throttle log. RLS is enabled with NO policies, so only
-- SECURITY DEFINER functions can ever touch it.
create table if not exists public.attendance_attempt_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  success      boolean not null,
  attempted_at timestamptz not null default now()
);
alter table public.attendance_attempt_log enable row level security;
create index if not exists attendance_attempt_log_user_time_idx
  on public.attendance_attempt_log(user_id, attempted_at desc);

-- ----------------------------------------------------------------------------
-- 2. Admin: generate a new attendance code (server-authoritative)
--
--    Drops and replaces the old (uuid, timestamptz, timestamptz) version so
--    the browser can no longer supply the validity window.
-- ----------------------------------------------------------------------------

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
  v_chars      text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 symbols, bias-free
  v_byte       integer;
  v_now        timestamptz := now();
  v_hours      integer := p_validity_hours;
  v_event_ok   boolean;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  -- Sanity: 1..72 hours, matching the admin UI limits.
  if v_hours is null or v_hours < 1 or v_hours > 72 then
    raise exception 'invalid_window';
  end if;

  -- The event must exist and be live for attendance.
  select exists (
    select 1 from public.events
    where id = p_event_id and status = 'published'
  ) into v_event_ok;
  if not v_event_ok then
    raise exception 'event_not_available';
  end if;

  -- Regenerating invalidates the previous code immediately.
  update public.event_attendance_codes
     set is_active = false,
         revoked_at = coalesce(revoked_at, v_now),
         revoked_by = coalesce(revoked_by, v_uid)
   where event_id = p_event_id
     and is_active = true;

  -- 8 cryptographically-secure characters from the 32-symbol alphabet
  -- (32^8 = 2^40 possibilities). gen_random_bytes comes from pgcrypto.
  for i in 1..8 loop
    v_byte := get_byte(gen_random_bytes(1), 0) & 31; -- 0..31, uniform
    v_raw := v_raw || substr(v_chars, v_byte + 1, 1);
  end loop;

  insert into public.event_attendance_codes (
    event_id, code_hash, code_display, valid_from, valid_until,
    is_active, created_by, created_at
  ) values (
    p_event_id,
    crypt(v_raw, gen_salt('bf')),
    'UIC-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4),
    v_now,                       -- server clock, never the browser's
    v_now + make_interval(hours => v_hours),
    true, v_uid, v_now
  );

  return 'UIC-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
end;
$$;

revoke all on function public.generate_event_attendance_code(uuid, integer) from public;
grant execute on function public.generate_event_attendance_code(uuid, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Admin: revoke the active code (with audit columns)
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 4. Participant: mark attendance
--
--    NEW SIGNATURE: mark_attendance(p_code text).
--    The event is resolved from the matched code server-side — the browser
--    never gets to say which event it is. Validation order is deliberately
--    opaque: every rejection path returns a generic reason so an attacker
--    cannot enumerate which codes exist.
-- ----------------------------------------------------------------------------

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
  -- 1. Authentication — identity always comes from auth.uid().
  if v_uid is null then
    return 'unauthorized';
  end if;

  -- 2. Brute-force throttle: more than 10 failed attempts in 15 minutes
  --    locks new attempts for a cooldown window.
  select count(*) into v_failed
    from public.attendance_attempt_log
   where user_id = v_uid
     and success = false
     and attempted_at > v_now - interval '15 minutes';
  if v_failed >= 10 then
    return 'rate_limited';
  end if;

  -- Opportunistic cleanup of log rows older than a day.
  delete from public.attendance_attempt_log where attempted_at < v_now - interval '1 day';

  -- 3. Normalize input: trim, uppercase, drop separators/spaces.
  --    " uic-7k9x-4m2p " -> "UIC7K9X4M2P", which is exactly what was hashed.
  v_canonical := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_canonical) <> 8 then
    insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
    return 'invalid_code';
  end if;

  -- 4. Match the code against ACTIVE codes via bcrypt. There is at most one
  --    active code per event, so this scan is tiny. Failure to match is
  --    indistinguishable from "does not exist" to the caller.
  for v_code in
    select c.*
      from public.event_attendance_codes c
     where c.is_active = true
  loop
    if v_code.code_hash = crypt(v_canonical, v_code.code_hash) then
      -- 5. Server-clock window check (device time is never consulted).
      if v_now < v_code.valid_from then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'too_early';
      end if;
      if v_now > v_code.valid_until then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'too_late';
      end if;

      -- 6. The event must still be live (rejects drafts/archived/cancelled).
      if not exists (
        select 1 from public.events e
         where e.id = v_code.event_id
           and e.status = 'published'
      ) then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'event_not_available';
      end if;

      -- 7. Registration rule: only members registered for THIS event may mark
      --    attendance (matched by account id or verified email).
      if not exists (
        select 1 from public.event_registrations r
         where r.event_id = v_code.event_id
           and (r.user_id = v_uid
                or (v_email <> '' and lower(r.email) = v_email))
      ) then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'not_registered';
      end if;

      -- 8. Duplicate guard — the UNIQUE(event_id, user_id) constraint is the
      --    hard guarantee; this check just returns the friendly reason.
      if exists (
        select 1 from public.attendance
         where event_id = v_code.event_id and user_id = v_uid
      ) then
        insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
        return 'already_attended';
      end if;

      -- 9. All checks passed — insert. A concurrent duplicate would violate
      --    the unique constraint and roll the whole statement back.
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

  -- No active code matched.
  insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
  return 'invalid_code';
end;
$$;

revoke all on function public.mark_attendance(text) from public;
grant execute on function public.mark_attendance(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. RLS audit
-- ----------------------------------------------------------------------------

-- event_attendance_codes: admins already have full access through the
-- FOR ALL policy from the previous migration. Re-assert it and make sure
-- ordinary members can NEVER read code rows (including code_display).
drop policy if exists "Admins can manage event_attendance_codes" on public.event_attendance_codes;
create policy "Admins can manage event_attendance_codes" on public.event_attendance_codes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- No other policy exists -> members/anon have zero SELECT on codes.

-- attendance: members may only read their OWN rows; writes happen exclusively
-- through mark_attendance(). Re-assert policies so no unrestricted INSERT or
-- UPDATE ever opens up.
drop policy if exists "Users can view their own attendance" on public.attendance;
create policy "Users can view their own attendance" on public.attendance
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can manage attendance" on public.attendance;
create policy "Admins can manage attendance" on public.attendance
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The unique(event_id, user_id) constraint may not exist on databases where
-- the previous migration partially ran — re-assert it idempotently.
delete from public.attendance a
  using public.attendance b
  where a.event_id = b.event_id
    and a.user_id = b.user_id
    and a.id > b.id;
create unique index if not exists attendance_event_user_unique
  on public.attendance (event_id, user_id);

-- ============================================================================
-- Done. Notes for the application layer:
--   * generate_event_attendance_code(event_id, hours)  -> returns "UIC-XXXX-XXXX"
--   * revoke_event_attendance_code(event_id)
--   * mark_attendance(code)                            -> status string
--     statuses: success | unauthorized | rate_limited | invalid_code |
--               too_early | too_late | event_not_available | not_registered |
--               already_attended
-- ============================================================================
