-- ============================================================================
-- Fix missing contest RPCs + super_admin role value
--
-- The application service layer (src/services/contest.ts) and the admin auth
-- flow (src/features/auth/useRequireAdmin.ts) call four database functions
-- that were never captured in a migration, and reference a 'super_admin'
-- app_role value that the app_role enum does not contain. Without this
-- migration those calls fail at runtime (PGRST202 / invalid input value).
-- ============================================================================

-- 1. super_admin role value (additive; matches application expectations)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' AFTER 'member';

-- 2. Link a claimed participant record to the signed-in profile with a
--    matching email address.
CREATE OR REPLACE FUNCTION public.link_contest_participant_to_user(
  p_event_id uuid,
  p_user_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT id INTO v_user_id
    FROM public.profiles
   WHERE lower(email) = lower(p_user_email)
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  UPDATE public.contest_participants
     SET user_id = v_user_id,
         verification_status = 'verified',
         verification_source = 'user_claim',
         updated_at = now()
   WHERE event_id = p_event_id
     AND lower(participant_email) = lower(p_user_email)
     AND user_id IS NULL;
END;
$$;

-- 3. One submission with participant details (own submission, any admin,
--    or any approved submission for signed-in viewers).
CREATE OR REPLACE FUNCTION public.get_contest_submission_with_details(
  p_submission_id uuid
)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  user_id uuid,
  project_name text,
  project_description text,
  live_url text,
  repo_url text,
  status text,
  moderation_reason text,
  moderated_by uuid,
  moderated_at timestamptz,
  admin_override_edit_allowed boolean,
  avg_rating numeric,
  rating_count integer,
  submitted_at timestamptz,
  updated_at timestamptz,
  participant_name text,
  participant_email text,
  participant_avatar text,
  verification_status text,
  user_has_rated boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.event_id, s.user_id,
    s.project_name, s.project_description, s.live_url, s.repo_url,
    s.status, s.moderation_reason, s.moderated_by, s.moderated_at,
    s.admin_override_edit_allowed, s.avg_rating, s.rating_count,
    s.submitted_at, s.updated_at,
    cp.participant_name,
    cp.participant_email,
    pr.avatar_url AS participant_avatar,
    cp.verification_status,
    EXISTS (
      SELECT 1 FROM public.contest_ratings r
       WHERE r.submission_id = s.id
         AND r.reviewer_id = auth.uid()
         AND r.is_valid
    ) AS user_has_rated
  FROM public.contest_submissions s
  LEFT JOIN public.contest_participants cp
         ON cp.event_id = s.event_id AND cp.user_id = s.user_id
  LEFT JOIN public.profiles pr
         ON pr.id = s.user_id
  WHERE s.id = p_submission_id
    AND (
      s.status = 'approved'
      OR s.user_id = auth.uid()
      OR public.is_admin()
    );
$$;

-- 4. Leaderboard: approved submissions ranked by average rating, tie-broken
--    by rating count then submission time. Visible when the event's
--    leaderboard is published or to admins. Provisional entries have fewer
--    ratings than the event's min_ratings_for_ranking threshold.
CREATE OR REPLACE FUNCTION public.get_contest_leaderboard(
  p_event_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  rank bigint,
  submission_id uuid,
  project_name text,
  participant_name text,
  participant_id uuid,
  live_url text,
  repo_url text,
  avg_rating numeric,
  rating_count integer,
  submitted_at timestamptz,
  is_provisional boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      s.id AS submission_id,
      s.project_name,
      s.live_url,
      s.repo_url,
      s.avg_rating,
      s.rating_count,
      s.submitted_at,
      cp.participant_name,
      cp.user_id AS participant_id,
      row_number() OVER (
        ORDER BY s.avg_rating DESC, s.rating_count DESC, s.submitted_at ASC
      ) AS rnk
    FROM public.contest_submissions s
    LEFT JOIN public.contest_participants cp
           ON cp.event_id = s.event_id AND cp.user_id = s.user_id
    WHERE s.event_id = p_event_id
      AND s.status = 'approved'
      AND (
        (SELECT e.is_leaderboard_published FROM public.events e WHERE e.id = p_event_id)
        OR public.is_admin()
      )
  )
  SELECT
    rnk,
    submission_id,
    project_name,
    participant_name,
    participant_id,
    live_url,
    repo_url,
    avg_rating,
    rating_count,
    submitted_at,
    rating_count < (SELECT COALESCE(e.min_ratings_for_ranking, 1)
                      FROM public.events e WHERE e.id = p_event_id) AS is_provisional
  FROM ranked
  ORDER BY rnk
  LIMIT GREATEST(COALESCE(p_limit, 5), 1);
$$;

-- 5. Per-user contest status for the dashboard.
CREATE OR REPLACE FUNCTION public.get_user_contest_status(
  p_event_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  is_verified boolean,
  verification_status text,
  has_submitted boolean,
  submission_id uuid,
  current_rank bigint,
  total_ranked bigint,
  websites_rated bigint,
  eligible_to_rate bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission public.contest_submissions%ROWTYPE;
  v_min_ratings integer;
  v_total_ranked bigint;
BEGIN
  IF p_user_id <> auth.uid() AND NOT public.is_admin() THEN
    RETURN;
  END IF;

  SELECT * INTO v_submission
    FROM public.contest_submissions
   WHERE event_id = p_event_id
     AND user_id = p_user_id
   LIMIT 1;

  SELECT COALESCE(min_ratings_for_ranking, 1) INTO v_min_ratings
    FROM public.events
   WHERE id = p_event_id;

  SELECT COUNT(*) INTO v_total_ranked
    FROM public.contest_submissions
   WHERE event_id = p_event_id
     AND status = 'approved'
     AND rating_count >= v_min_ratings;

  RETURN QUERY
  SELECT
    (p.verification_status = 'verified'),
    p.verification_status,
    (v_submission.id IS NOT NULL),
    v_submission.id,
    (
      SELECT rr.rnk
        FROM (
          SELECT s.id,
                 row_number() OVER (
                   ORDER BY s.avg_rating DESC, s.rating_count DESC, s.submitted_at ASC
                 ) AS rnk
            FROM public.contest_submissions s
           WHERE s.event_id = p_event_id
             AND s.status = 'approved'
             AND s.rating_count >= v_min_ratings
        ) rr
       WHERE rr.id = v_submission.id
    ),
    v_total_ranked,
    (
      SELECT COUNT(*) FROM public.contest_ratings r
       WHERE r.reviewer_id = p_user_id
         AND r.event_id = p_event_id
         AND r.is_valid
    ),
    (
      SELECT COUNT(*) FROM public.contest_submissions s2
       WHERE s2.event_id = p_event_id
         AND s2.status = 'approved'
         AND s2.user_id <> p_user_id
         AND NOT EXISTS (
           SELECT 1 FROM public.contest_ratings r2
            WHERE r2.submission_id = s2.id
              AND r2.reviewer_id = p_user_id
              AND r2.is_valid
         )
    )
  FROM (SELECT 1) AS seed
  LEFT JOIN public.contest_participants p
         ON p.event_id = p_event_id AND p.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_contest_participant_to_user(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.link_contest_participant_to_user(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_contest_submission_with_details(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_contest_submission_with_details(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_contest_leaderboard(uuid, integer) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_user_contest_status(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_user_contest_status(uuid, uuid) TO authenticated;
