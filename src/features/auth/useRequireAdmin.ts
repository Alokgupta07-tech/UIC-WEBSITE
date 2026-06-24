import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdmin } from "@/config/superAdmin";

/**
 * Gate a route that requires an admin user.
 * Redirects signed-out users to /auth and non-admins to /.
 * Accepts both "admin" and "super_admin" roles.
 * Auto-recovers the super_admin role if it is ever missing.
 */
export function useRequireAdmin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const verifyAdmin = async () => {
      if (loading) {
        return;
      }

      if (!user) {
        if (active) {
          setIsAdmin(false);
          setRoleLoading(false);
          navigate("/auth", { replace: true });
        }
        return;
      }

      if (active) {
        setRoleLoading(true);
      }

      try {
        // Check for admin OR super_admin role
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "super_admin"])
          .limit(1);

        if (error) throw error;

        const hasRole = data && data.length > 0;

        // Auto-recovery: if this is the super admin email but role is missing, restore it
        if (!hasRole && isSuperAdmin(user.email)) {
          await supabase
            .from("user_roles")
            .upsert(
              { user_id: user.id, role: "super_admin" },
              { onConflict: "user_id,role", ignoreDuplicates: true }
            );

          if (active) {
            setIsAdmin(true);
            setRoleLoading(false);
          }
          return;
        }

        if (!active) {
          return;
        }

        if (hasRole) {
          setIsAdmin(true);
          setRoleLoading(false);
        } else {
          setIsAdmin(false);
          setRoleLoading(false);
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Supabase error:", JSON.stringify(error));
        if (active) {
          setIsAdmin(false);
          setRoleLoading(false);
          navigate("/", { replace: true });
        }
      }
    };

    void verifyAdmin();

    return () => {
      active = false;
    };
  }, [user, loading, navigate]);

  return { ready: !!user && isAdmin, loading: loading || roleLoading };
}

