-- ============================================================================
-- Unstop Igniters Club — Bulk Participant Attendance Codes
--
-- Adds "Method B" attendance: the admin generates a batch of N unique codes
-- (e.g. 500), prints and distributes one per participant. Each code is
-- single-use, event-bound, time-limited, and revocable.
--
--   1. attendance_code_batches       — one row per generation batch
--   2. participant_attendance_codes  — one row per printed code
--   3. RPC generate_participant_codes(event, count, hours)   [admin]
--   4. RPC get_participant_batches(event)                    [admin]
--   5. RPC get_participant_codes(batch)                      [admin, for print]
--   6. RPC revoke_participant_batch(batch)                   [admin]
--   7. mark_attendance() extended: participant codes are verified and
--      atomically claimed (single-use) in the same transaction.
--
-- Hashing note: the LIVE event code keeps bcrypt (there is only ever one row
-- to compare). Participant batches can contain 500+ rows, and comparing
-- bcrypt against all of them per submission would take tens of seconds.
-- Participant codes therefore store SHA-256(code) with a UNIQUE index —
-- constant-time indexed lookup. This is safe because the codes carry ~40
-- bits of crypto-secure entropy (2^40 space), far beyond brute-force reach
-- of the 10-attempts/15-min rate limit; the hash exists so a database leak
-- does not directly reveal the printed secrets.
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

create table if not exists public.attendance_code_batches (
    id          uuid primary key default gen_random_uuid(),
    event_id    uuid not null references public.events(id) on delete cascade,
    label       text not null,
    code_count  integer not null check (code_count between 1 and 5000),
    valid_from  timestamptz not null,
    valid_until timestamptz not null,
    created_by  uuid references auth.users(id) on delete set null,
    created_at  timestamptz not null default now(),
    revoked_at  timestamptz,
    revoked_by  uuid references auth.users(id) on delete set null
);

create index if not exists attendance_code_batches_event_idx
  on public.attendance_code_batches (event_id, created_at desc);

-- One row per printed code. code_hash is sha256 of the canonical (uppercase,
-- separators stripped) code; code_display is the printable form, visible only
-- to admins via the RPCs (RLS allows no direct member access).
create table if not exists public.participant_attendance_codes (
    id           uuid primary key default gen_random_uuid(),
    batch_id     uuid not null references public.attendance_code_batches(id) on delete cascade,
    event_id     uuid not null references public.events(id) on delete cascade,
    code_hash    text not null unique,
    code_display text not null,
    is_used      boolean not null default false,
    used_at      timestamptz,
    used_by      uuid references auth.users(id) on delete set null,
    created_at   timestamptz not null default now()
);

create index if not exists participant_codes_batch_idx on public.participant_attendance_codes (batch_id);
create index if not exists participant_codes_event_used_idx on public.participant_attendance_codes (event_id, is_used);

-- ----------------------------------------------------------------------------
-- 2. RLS — admin-only tables; members interact exclusively through the RPCs
-- ----------------------------------------------------------------------------

alter table public.attendance_code_batches enable row level security;
alter table public.participant_attendance_codes enable row level security;

drop policy if exists "Admins manage attendance_code_batches" on public.attendance_code_batches;
create policy "Admins manage attendance_code_batches" on public.attendance_code_batches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins manage participant_attendance_codes" on public.participant_attendance_codes;
create policy "Admins manage participant_attendance_codes" on public.participant_attendance_codes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No member SELECT/INSERT/UPDATE policies exist on either table, so normal
-- users cannot list, search, or consume codes outside the RPC.

-- ----------------------------------------------------------------------------
-- 3. Admin: generate a batch of N unique codes (single transactional call)
-- ----------------------------------------------------------------------------

create or replace function public.generate_participant_codes(
    p_event_id       uuid,
    p_count          integer,
    p_validity_hours integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid     uuid := auth.uid();
  v_now     timestamptz := now();
  v_hours   integer := p_validity_hours;
  v_count   integer := p_count;
  v_chars   text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 symbols, no O/I/0/1
  v_batch   uuid;
  v_label   text;
  v_batch_no integer;
  v_raw     text;
  v_byte    integer;
  v_inserted integer;
  v_attempt integer;
  v_generated integer := 0;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  if v_count is null or v_count < 1 or v_count > 5000 then
    raise exception 'invalid_count';
  end if;
  if v_hours is null or v_hours < 1 or v_hours > 72 then
    raise exception 'invalid_window';
  end if;

  if not exists (select 1 from public.events where id = p_event_id and status = 'published') then
    raise exception 'event_not_available';
  end if;

  -- Human-readable batch label: BATCH-20260914-001 (per event)
  select count(*) + 1 into v_batch_no
    from public.attendance_code_batches
   where event_id = p_event_id;
  v_label := 'BATCH-' || to_char(v_now, 'YYYYMMDD') || '-' || lpad(v_batch_no::text, 3, '0');

  insert into public.attendance_code_batches (
    event_id, label, code_count, valid_from, valid_until, created_by, created_at
  ) values (
    p_event_id, v_label, v_count,
    v_now, v_now + make_interval(hours => v_hours), v_uid, v_now
  )
  returning id into v_batch;

  -- Generate and insert `v_count` unique codes. The whole function runs in a
  -- single transaction: any unhandled failure rolls the batch back entirely.
  for i in 1..v_count loop
    v_attempt := 0;
    loop
      v_attempt := v_attempt + 1;
      v_raw := '';
      for j in 1..8 loop
        v_byte := get_byte(gen_random_bytes(1), 0) & 31;
        v_raw := v_raw || substr(v_chars, v_byte + 1, 1);
      end loop;

      insert into public.participant_attendance_codes (
        batch_id, event_id, code_hash, code_display
      ) values (
        v_batch,
        p_event_id,
        encode(digest(v_raw, 'sha256'), 'hex'),
        'UIC-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4)
      )
      on conflict (code_hash) do nothing;

      if found then
        v_generated := v_generated + 1;
        exit;
      end if;

      -- Astronomically unlikely (2^40 space) but never fail the batch on a
      -- single collision — regenerate and retry, up to a hard stop.
      if v_attempt >= 10 then
        raise exception 'code_generation_failed';
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'batch_id', v_batch,
    'label', v_label,
    'event_id', p_event_id,
    'requested_count', v_count,
    'generated_count', v_generated,
    'valid_from', v_now,
    'valid_until', v_now + make_interval(hours => v_hours)
  );
end;
$$;

revoke all on function public.generate_participant_codes(uuid, integer, integer) from public;
grant execute on function public.generate_participant_codes(uuid, integer, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Admin: batch list with live usage statistics (database is the source)
-- ----------------------------------------------------------------------------

create or replace function public.get_participant_batches(
    p_event_id uuid
)
returns table (
    id         uuid,
    label      text,
    code_count integer,
    valid_from timestamptz,
    valid_until timestamptz,
    created_at timestamptz,
    revoked_at timestamptz,
    used_count bigint,
    remaining_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.id,
    b.label,
    b.code_count,
    b.valid_from,
    b.valid_until,
    b.created_at,
    b.revoked_at,
    coalesce(s.used_count, 0::bigint) as used_count,
    b.code_count - coalesce(s.used_count, 0::bigint) as remaining_count
  from public.attendance_code_batches b
  left join (
    select batch_id, count(*) as used_count
      from public.participant_attendance_codes
     where is_used = true
     group by batch_id
  ) s on s.batch_id = b.id
  where b.event_id = p_event_id
    and public.is_admin()
  order by b.created_at desc;
$$;

revoke all on function public.get_participant_batches(uuid) from public;
grant execute on function public.get_participant_batches(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Admin: the printable codes of one batch (never exposed to members)
-- ----------------------------------------------------------------------------

create or replace function public.get_participant_codes(
    p_batch_id uuid
)
returns table (
    serial_no   bigint,
    code        text,
    is_used     boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    row_number() over (order by c.created_at, c.id),
    c.code_display,
    c.is_used
  from public.participant_attendance_codes c
  join public.attendance_code_batches b on b.id = c.batch_id
  where c.batch_id = p_batch_id
    and public.is_admin()
  order by c.created_at, c.id;
$$;

revoke all on function public.get_participant_codes(uuid) from public;
grant execute on function public.get_participant_codes(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Admin: revoke an entire batch. Unused codes become unusable; existing
--    attendance records are never touched.
-- ----------------------------------------------------------------------------

create or replace function public.revoke_participant_batch(
    p_batch_id uuid
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

  update public.attendance_code_batches
     set revoked_at = now(),
         revoked_by = auth.uid()
   where id = p_batch_id
     and revoked_at is null;
end;
$$;

revoke all on function public.revoke_participant_batch(uuid) from public;
grant execute on function public.revoke_participant_batch(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. mark_attendance — extended to also verify batch participant codes.
--    Replaces the previous definition; the live-code (Method A) flow is
--    unchanged and tried first.
-- ----------------------------------------------------------------------------

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
  v_hash       text;
  v_code       record;
  v_pcode      record;
  v_claimed    uuid;
  v_now        timestamptz := now();
  v_failed     integer;
begin
  if v_uid is null then
    return 'unauthorized';
  end if;

  -- Brute-force throttle: 10 failed attempts / 15 minutes.
  select count(*) into v_failed
    from public.attendance_attempt_log
   where user_id = v_uid
     and success = false
     and attempted_at > v_now - interval '15 minutes';
  if v_failed >= 10 then
    return 'rate_limited';
  end if;

  delete from public.attendance_attempt_log where attempted_at < v_now - interval '1 day';

  -- Normalize: trim, uppercase, strip separators. " uic-7k9x-4m2p " -> "UIC7K9X4M2P"
  v_canonical := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_canonical) <> 8 then
    insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
    return 'invalid_code';
  end if;
  v_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  -- ============================================================
  -- Method A: the LIVE event code (bcrypt, one active row/event)
  -- ============================================================
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
         where e.id = v_code.event_id and e.status = 'published'
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

  -- ============================================================
  -- Method B: batch participant codes (sha256, indexed lookup).
  -- The event comes from the code row — never from the caller.
  -- ============================================================
  select pc.id, pc.event_id, pc.is_used,
         b.valid_from, b.valid_until, b.revoked_at
    into v_pcode
    from public.participant_attendance_codes pc
    join public.attendance_code_batches b on b.id = pc.batch_id
   where pc.code_hash = v_hash
   limit 1;

  if found then
    if v_pcode.is_used then
      insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
      return 'code_already_used';
    end if;
    if v_pcode.revoked_at is not null then
      insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
      return 'invalid_code';
    end if;
    if v_now < v_pcode.valid_from then
      insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
      return 'too_early';
    end if;
    if v_now > v_pcode.valid_until then
      insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
      return 'too_late';
    end if;

    if not exists (
      select 1 from public.events e
       where e.id = v_pcode.event_id and e.status = 'published'
    ) then
      insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
      return 'event_not_available';
    end if;

    if not exists (
      select 1 from public.event_registrations r
       where r.event_id = v_pcode.event_id
         and (r.user_id = v_uid
              or (v_email <> '' and lower(r.email) = v_email))
    ) then
      insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
      return 'not_registered';
    end if;

    if exists (
      select 1 from public.attendance
       where event_id = v_pcode.event_id and user_id = v_uid
    ) then
      insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
      return 'already_attended';
    end if;

    -- Atomic claim: the WHERE is_used = false guard plus the function's
    -- transaction guarantee that two concurrent submissions of the same code
    -- cannot both claim it. code_id column is NOT NULL and references the
    -- live-code table, so batch attendance stores NULL code_id via a
    -- dedicated insert without code_id — see attendance table change below.
    update public.participant_attendance_codes
       set is_used = true,
           used_at = v_now,
           used_by = v_uid
     where id = v_pcode.id
       and is_used = false
    returning id into v_claimed;

    if v_claimed is null then
      insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
      return 'code_already_used';
    end if;

    begin
      insert into public.attendance (event_id, user_id, code_id, participant_code_id, status)
      values (v_pcode.event_id, v_uid, null, v_pcode.id, 'verified');
    exception when unique_violation then
      return 'already_attended';
    end;

    insert into public.attendance_attempt_log (user_id, success) values (v_uid, true);
    return 'success';
  end if;

  -- No code matched anywhere.
  insert into public.attendance_attempt_log (user_id, success) values (v_uid, false);
  return 'invalid_code';
end;
$$;

revoke all on function public.mark_attendance(text) from public;
grant execute on function public.mark_attendance(text) to authenticated;

-- attendance.code_id references the LIVE code table and stays intact for
-- Method A. Batch attendance (Method B) is linked through a new nullable
-- participant_code_id column with its own FK — full referential integrity
-- for both methods, no data changes for existing rows.
alter table public.attendance
  alter column code_id drop not null;
alter table public.attendance
  add column if not exists participant_code_id uuid
    references public.participant_attendance_codes(id) on delete set null;
create index if not exists attendance_participant_code_idx
  on public.attendance (participant_code_id);
comment on index public.attendance_event_user_unique is
  'One attendance record per user per event across both code methods';

-- ============================================================================
-- Done. New statuses returned by mark_attendance:
--   code_already_used — the batch code was claimed by someone else (single-use)
-- Existing statuses unchanged: success | unauthorized | rate_limited |
--   invalid_code | too_early | too_late | event_not_available |
--   not_registered | already_attended
-- ============================================================================
