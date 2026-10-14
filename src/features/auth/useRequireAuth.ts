import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Gate a route that requires an authenticated user.
 * Returns `{ ready, loading }` — render nothing until `ready` is true.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !userId) {
      navigate("/auth", { replace: true });
    }
  }, [userId, loading, navigate]);

  return { ready: !!userId, loading };
}
