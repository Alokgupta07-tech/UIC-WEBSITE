// Re-export auth hooks so callers can import from the feature layer.
export { AuthProvider, useAuth } from "@/hooks/useAuth";
export { useRequireAuth } from "./useRequireAuth";
export { useRequireAdmin } from "./useRequireAdmin";
export { ProtectedAdminRoute } from "./ProtectedAdminRoute";
