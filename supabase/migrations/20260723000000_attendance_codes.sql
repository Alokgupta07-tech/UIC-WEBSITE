CREATE TABLE IF NOT EXISTS public.attendance_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    code text NOT NULL,
    status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used')),
    participant_name text,
    participant_email text,
    redeemed_at timestamptz,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, code)
);

ALTER TABLE public.attendance_codes ENABLE ROW LEVEL SECURITY;

-- Admins can read all attendance codes
CREATE POLICY "Admins can view attendance codes" ON public.attendance_codes
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Admins can insert/update/delete attendance codes
CREATE POLICY "Admins can manage attendance codes" ON public.attendance_codes
    FOR ALL
    TO authenticated
    USING (public.is_admin());

-- RPC to generate attendance codes
CREATE OR REPLACE FUNCTION public.generate_attendance_codes(p_event_id uuid, p_count integer)
RETURNS SETOF public.attendance_codes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code text;
    v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- excludes 0, O, 1, I, L
    v_inserted_count integer := 0;
    v_row public.attendance_codes;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can generate attendance codes';
    END IF;

    WHILE v_inserted_count < p_count LOOP
        -- Generate a random 6-character code
        SELECT string_agg(substr(v_chars, (random() * length(v_chars) + 1)::integer, 1), '')
        INTO v_code
        FROM generate_series(1, 6);
        
        BEGIN
            INSERT INTO public.attendance_codes (event_id, code, created_by)
            VALUES (p_event_id, v_code, auth.uid())
            RETURNING * INTO v_row;
            
            RETURN NEXT v_row;
            v_inserted_count := v_inserted_count + 1;
        EXCEPTION WHEN unique_violation THEN
            -- Ignore duplicate code and try again
        END;
    END LOOP;
    
    RETURN;
END;
$$;

-- RPC to verify attendance code (public)
CREATE OR REPLACE FUNCTION public.verify_attendance_code(p_event_id uuid, p_code text, p_name text, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id uuid;
BEGIN
    UPDATE public.attendance_codes
    SET status = 'used',
        participant_name = p_name,
        participant_email = p_email,
        redeemed_at = now()
    WHERE event_id = p_event_id
      AND code = p_code
      AND status = 'unused'
    RETURNING id INTO v_id;

    IF v_id IS NOT NULL THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$;
