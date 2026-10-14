import { ReactNode } from "react";
import { useRequireAdmin } from "./useRequireAdmin";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { ready, loading } = useRequireAdmin();

  if (loading) {
    return <Spinner />;
  }

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
