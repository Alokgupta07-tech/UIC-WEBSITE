-- ============================================================================
-- Unstop Igniters Club — Certificates + QR verification
--
-- Adds:
--   1. public.certificates            — issued certificate records
--   2. RLS so a member only ever reads their OWN certificates
--   3. public.verify_certificate()    — SECURITY DEFINER RPC used by the QR
--                                       scanner and the public verification
--                                       page. Returns ONLY fields that are
--                                       already printed on the physical
--                                       certificate. Never returns emails,
--                                       user ids or the verification token.
--   4. Own-row SELECT policies for attendance_codes / event_registrations so
--      the member dashboard can show real attendance instead of guesses.
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Human-facing certificate number sequence  ->  UIC-2026-00001
-- ----------------------------------------------------------------------------
create sequence if not exists public.certificate_number_seq as bigint start with 1;

create or replace function public.next_certificate_number()
returns text
language sql
volatile
set search_path = public
as $$
  select 'UIC-' || to_char(now(), 'YYYY') || '-'
         || lpad(nextval('public.certificate_number_seq')::text, 5, '0');
$$;

-- Opaque, unguessable token that goes into the QR code (32 hex chars / 128 bits).
-- Built from gen_random_uuid() so no extra Postgres extension is required.
create or replace function public.new_verification_token()
returns text
language sql
volatile
set search_path = public
as $$
  select replace(gen_random_uuid()::text, '-', '');
$$;

-- ----------------------------------------------------------------------------
-- 2. certificates
--    Event details are NOT duplicated here — they are joined from
--    public.events via event_id (single source of truth, and the event "day"
--    is always derived from event_date rather than typed by hand).
-- ----------------------------------------------------------------------------
create table if not exists public.certificates (
  id                     uuid primary key default gen_random_uuid(),
  certificate_number     text not null unique default public.next_certificate_number(),
  verification_token     text not null unique default public.new_verification_token(),

  event_id               uuid not null references public.events(id) on delete cascade,

  -- Recipient. recipient_user_id is filled in when the certificate is matched
  -- to a signed-in account; recipient_email keeps it claimable before that.
  recipient_user_id      uuid references auth.users(id) on delete set null,
  recipient_name         text not null,
  recipient_email        text,

  certificate_type       text not null default 'Certificate of Participation',

  organizer_name         text,
  organizer_organization text not null default 'Unstop Igniters Club',

  signer_name            text,
  signer_designation     text,
  signer_signature_url   text,

  certificate_file_url   text,

  issue_date             date not null default current_date,
  status                 text not null default 'issued'
                           check (status in ('issued', 'revoked', 'expired')),

  created_by             uuid references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists certificates_event_id_idx           on public.certificates(event_id);
create index if not exists certificates_recipient_user_id_idx  on public.certificates(recipient_user_id);
create index if not exists certificates_recipient_email_idx    on public.certificates(lower(recipient_email));
create unique index if not exists certificates_token_idx       on public.certificates(verification_token);

create or replace function public.touch_certificates_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_certificates_updated_at on public.certificates;
create trigger trg_certificates_updated_at
  before update on public.certificates
  for each row execute function public.touch_certificates_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS — data ownership
-- ----------------------------------------------------------------------------
alter table public.certificates enable row level security;

-- A member can read a certificate only when it is theirs: either it is linked
-- to their auth user id, or it was issued to their verified account email.
-- There is deliberately NO anon/public SELECT policy — public verification
-- goes exclusively through verify_certificate() below.
drop policy if exists "certificates_select_own" on public.certificates;
create policy "certificates_select_own" on public.certificates
  for select
  to authenticated
  using (
    recipient_user_id = auth.uid()
    or (
      recipient_email is not null
      and lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "certificates_admin_all" on public.certificates;
create policy "certificates_admin_all" on public.certificates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Claim helper — links certificates issued to an email to the auth user
--    the first time that user signs in and opens their dashboard.
--    Only ever touches rows matching the caller's own verified email.
-- ----------------------------------------------------------------------------
create or replace function public.claim_my_certificates()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_uid   uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null or v_email = '' then
    return 0;
  end if;

  update public.certificates
     set recipient_user_id = v_uid
   where recipient_user_id is null
     and recipient_email is not null
     and lower(recipient_email) = v_email;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.claim_my_certificates() from public;
grant execute on function public.claim_my_certificates() to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Public verification RPC
--
--    Takes the opaque token from the QR code and returns a single row with a
--    verification verdict plus the public face of the certificate. Callable by
--    anon so a verification link works without signing in.
--
--    Deliberately NOT returned: recipient_email, recipient_user_id,
--    created_by, verification_token, internal row id.
-- ----------------------------------------------------------------------------
drop function if exists public.verify_certificate(text);
create or replace function public.verify_certificate(p_token text)
returns table (
  verification_status    text,
  certificate_number     text,
  certificate_type       text,
  recipient_name         text,
  event_title            text,
  event_description      text,
  event_date             timestamptz,
  event_venue            text,
  event_is_online        boolean,
  event_category         text,
  organizer_name         text,
  organizer_organization text,
  signer_name            text,
  signer_designation     text,
  signer_signature_url   text,
  certificate_file_url   text,
  issue_date             date,
  verified_at            timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_token text := btrim(coalesce(p_token, ''));
begin
  -- Cheap shape check first so junk QR codes never touch the table.
  if v_token = '' or v_token !~ '^[0-9a-fA-F]{32}$' then
    return query select
      'not_found'::text, null::text, null::text, null::text, null::text,
      null::text, null::timestamptz, null::text, null::boolean, null::text,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::date, now();
    return;
  end if;

  return query
  select
    case c.status
      when 'issued'  then 'verified'
      when 'revoked' then 'revoked'
      when 'expired' then 'expired'
      else 'invalid'
    end::text                          as verification_status,
    c.certificate_number,
    c.certificate_type,
    c.recipient_name,
    e.title                            as event_title,
    coalesce(e.short_description, e.description) as event_description,
    e.event_date,
    case when coalesce(e.is_online, false) then null else e.venue end as event_venue,
    coalesce(e.is_online, false)       as event_is_online,
    cat.name                           as event_category,
    c.organizer_name,
    c.organizer_organization,
    c.signer_name,
    c.signer_designation,
    c.signer_signature_url,
    -- Only expose the downloadable file for a certificate that is still valid.
    case when c.status = 'issued' then c.certificate_file_url else null end as certificate_file_url,
    c.issue_date,
    now()                              as verified_at
  from public.certificates c
  join public.events e on e.id = c.event_id
  left join public.event_categories cat on cat.id = e.category_id
  where c.verification_token = lower(v_token);

  -- No row matched -> explicit "not found" verdict.
  if not found then
    return query select
      'not_found'::text, null::text, null::text, null::text, null::text,
      null::text, null::timestamptz, null::text, null::boolean, null::text,
      null::text, null::text, null::text, null::text, null::text, null::text,
      null::date, now();
  end if;
end;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Let members read their OWN attendance + registration rows.
--    Without these the dashboard cannot show real attendance, and inventing it
--    is not an option.
-- ----------------------------------------------------------------------------

-- Attendance codes are redeemed with a name + email at the event desk, so a
-- member's attendance is the set of used codes carrying their account email.
drop policy if exists "attendance_codes_select_own" on public.attendance_codes;
create policy "attendance_codes_select_own" on public.attendance_codes
  for select
  to authenticated
  using (
    status = 'used'
    and participant_email is not null
    and lower(participant_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- event_registrations already has a "view their own registrations" policy keyed
-- on user_id. Rows created from a public form have a null user_id, so also
-- allow a match on the caller's verified email.
drop policy if exists "event_registrations_select_own_email" on public.event_registrations;
create policy "event_registrations_select_own_email" on public.event_registrations
  for select
  to authenticated
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- ============================================================================
-- Done.
--
-- Issuing a certificate (admin only — the app's Admin -> Certificates tab does
-- this for you). certificate_number and verification_token are generated by the
-- column defaults:
--
--   insert into public.certificates
--     (event_id, recipient_name, recipient_email, organizer_name,
--      signer_name, signer_designation)
--   values
--     ('<event-uuid>', 'Full Name', 'person@example.com', 'UIC Core Team',
--      'Signatory Name', 'Faculty Coordinator');
--
-- The QR code printed on the certificate should encode:
--   https://<your-site>/verify/certificate/<verification_token>
-- ============================================================================
