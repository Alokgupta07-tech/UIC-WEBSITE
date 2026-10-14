-- ============================================================================
-- Unstop Igniters Club — ensure events.status exists
--
-- Databases created from the earlier events schema have `is_published`
-- (boolean) but lack the `status` enum column that 0001_uic_production.sql
-- defines. The attendance functions require `status = 'published'`, so on
-- such databases every attendance RPC fails with 42703 ("column status does
-- not exist"), surfaced by PostgREST as HTTP 400.
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

do $$
begin
  create type public.event_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

alter table public.events
  add column if not exists status public.event_status default 'draft';

-- Backfill from the legacy flag: published events keep their visibility.
update public.events
   set status = 'published'
 where status is null
   and coalesce(is_published, false) = true;

update public.events
   set status = 'draft'
 where status is null;
