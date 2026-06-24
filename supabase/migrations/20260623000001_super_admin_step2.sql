-- ============================================================
-- STEP 2: Super Admin Protection (triggers + seed)
-- Run this AFTER step 1 has been committed.
-- ============================================================

-- 1. Trigger on user_roles: prevent DELETE or role change for super admin
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_email TEXT;
BEGIN
  -- Look up the email for the affected user_id
  SELECT email INTO target_email
    FROM auth.users
    WHERE id = COALESCE(OLD.user_id, NEW.user_id);

  IF target_email = 'agupta88094@gmail.com' THEN
    -- Block DELETE of super admin role
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Super Admin account cannot be modified or removed.';
    END IF;

    -- Block UPDATE that changes the role away from super_admin
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM 'super_admin' THEN
      RAISE EXCEPTION 'Super Admin role cannot be changed.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_protect_super_admin_role ON public.user_roles;

CREATE TRIGGER trg_protect_super_admin_role
  BEFORE DELETE OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_super_admin_role();


-- 2. Trigger on profiles: prevent DELETE or email change for super admin
CREATE OR REPLACE FUNCTION public.protect_super_admin_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Block DELETE of super admin profile
  IF TG_OP = 'DELETE' AND OLD.email = 'agupta88094@gmail.com' THEN
    RAISE EXCEPTION 'Super Admin profile cannot be deleted.';
  END IF;

  -- Block changing the super admin's email
  IF TG_OP = 'UPDATE'
     AND OLD.email = 'agupta88094@gmail.com'
     AND NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Super Admin email cannot be changed.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_super_admin_profile ON public.profiles;

CREATE TRIGGER trg_protect_super_admin_profile
  BEFORE DELETE OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_super_admin_profile();


-- 3. Seed the super_admin role for the super admin user (if they have signed in)
DO $$
DECLARE
  sa_user_id UUID;
BEGIN
  SELECT id INTO sa_user_id
    FROM auth.users
    WHERE email = 'agupta88094@gmail.com'
    LIMIT 1;

  IF sa_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (sa_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;
