-- ============================================================================
-- Unstop Igniters Club — Secure Attendance System
--
-- Adds:
--   1. public.event_attendance_codes - Stores the active attendance code for an event.
--   2. public.attendance             - Stores verified user attendance records.
--   3. RPC generate_event_attendance_code - Admin generates a time-bound code.
--   4. RPC mark_attendance           - Secure SECURITY DEFINER function for users.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

-- A single active attendance code per event
CREATE TABLE IF NOT EXISTS public.event_attendance_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    code_hash text NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_until timestamptz NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Workaround for partial unique index in Supabase standard UI, we'll use a unique index explicitly
DROP INDEX IF EXISTS unique_active_code_per_event;
CREATE UNIQUE INDEX unique_active_code_per_event ON public.event_attendance_codes (event_id) WHERE (is_active = true);


-- Verified attendance records
CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_id uuid NOT NULL REFERENCES public.event_attendance_codes(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'revoked')),
    marked_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id) -- Only one attendance record per user per event
);

-- ----------------------------------------------------------------------------
-- 2. RLS Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.event_attendance_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Admins can manage event_attendance_codes
DROP POLICY IF EXISTS "Admins can manage event_attendance_codes" ON public.event_attendance_codes;
CREATE POLICY "Admins can manage event_attendance_codes" ON public.event_attendance_codes
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users cannot SELECT event_attendance_codes directly (they use the RPC)

-- Admins can manage attendance
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance;
CREATE POLICY "Admins can manage attendance" ON public.attendance
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users can SELECT their own attendance
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
CREATE POLICY "Users can view their own attendance" ON public.attendance
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 3. RPC Functions
-- ----------------------------------------------------------------------------

-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admin: Generate a new attendance code for an event
-- This function deactivates any existing code and creates a new one,
-- returning the raw code ONCE to the admin.
CREATE OR REPLACE FUNCTION public.generate_event_attendance_code(
    p_event_id uuid,
    p_valid_from timestamptz,
    p_valid_until timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_raw_code text;
    v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    IF p_valid_from >= p_valid_until THEN
        RAISE EXCEPTION 'invalid_window';
    END IF;

    -- Deactivate current active code if exists
    UPDATE public.event_attendance_codes
    SET is_active = false
    WHERE event_id = p_event_id AND is_active = true;

    -- Generate a 6-character code
    SELECT string_agg(substr(v_chars, (random() * length(v_chars) + 1)::integer, 1), '')
    INTO v_raw_code
    FROM generate_series(1, 6);

    -- Insert hash
    INSERT INTO public.event_attendance_codes (
        event_id, code_hash, valid_from, valid_until, is_active, created_by
    ) VALUES (
        p_event_id,
        crypt(v_raw_code, gen_salt('bf')),
        p_valid_from,
        p_valid_until,
        true,
        auth.uid()
    );

    -- Return raw code to the admin
    RETURN v_raw_code;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_event_attendance_code(uuid, timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_event_attendance_code(uuid, timestamptz, timestamptz) TO authenticated;


-- User: Mark attendance
-- Validates everything securely on the backend
CREATE OR REPLACE FUNCTION public.mark_attendance(
    p_event_id uuid,
    p_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_code_record RECORD;
    v_now timestamptz := now();
BEGIN
    -- 1. Check Auth
    IF v_uid IS NULL THEN
        RETURN 'unauthorized';
    END IF;

    -- 2. Find active code for event
    SELECT * INTO v_code_record
    FROM public.event_attendance_codes
    WHERE event_id = p_event_id AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN 'no_active_code';
    END IF;

    -- 3. Verify Code
    IF v_code_record.code_hash != crypt(p_code, v_code_record.code_hash) THEN
        RETURN 'invalid_code';
    END IF;

    -- 4. Check time window
    IF v_now < v_code_record.valid_from THEN
        RETURN 'too_early';
    END IF;

    IF v_now > v_code_record.valid_until THEN
        RETURN 'too_late';
    END IF;

    -- 5. Check if already attended
    IF EXISTS (SELECT 1 FROM public.attendance WHERE event_id = p_event_id AND user_id = v_uid) THEN
        RETURN 'already_attended';
    END IF;

    -- 6. Insert attendance
    INSERT INTO public.attendance (
        event_id, user_id, code_id, status
    ) VALUES (
        p_event_id, v_uid, v_code_record.id, 'verified'
    );

    RETURN 'success';
END;
$$;
REVOKE ALL ON FUNCTION public.mark_attendance(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_attendance(uuid, text) TO anon, authenticated;


-- Admin: Revoke attendance code
CREATE OR REPLACE FUNCTION public.revoke_event_attendance_code(
    p_event_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    UPDATE public.event_attendance_codes
    SET is_active = false
    WHERE event_id = p_event_id AND is_active = true;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_event_attendance_code(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.revoke_event_attendance_code(uuid) TO authenticated;
