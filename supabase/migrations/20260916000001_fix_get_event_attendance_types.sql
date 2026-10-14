-- ============================================================================
-- Unstop Igniters Club — fix get_event_attendance return type
--
-- auth.users.email is character varying(255); the function declared the
-- return column as text, which Postgres rejects at runtime (42804:
-- "Returned type character varying(255) does not match expected type text").
-- Casts the join output to text explicitly.
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

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
    a.id::uuid,
    a.user_id::uuid,
    a.code_id::uuid,
    a.status::text,
    a.marked_at::timestamptz,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'full_name', '')::text
  from public.attendance a
  left join auth.users u on u.id = a.user_id
  where a.event_id = p_event_id
  order by a.marked_at desc;
end;
$$;

revoke all on function public.get_event_attendance(uuid) from public;
grant execute on function public.get_event_attendance(uuid) to authenticated;
