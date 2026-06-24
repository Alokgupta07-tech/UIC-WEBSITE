type SupabaseLikeError = {
  status?: number;
  code?: string;
  message?: string;
  details?: string;
};

export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const supabaseError = error as SupabaseLikeError;
  const message = `${supabaseError.message ?? ""} ${supabaseError.details ?? ""}`.toLowerCase();

  return (
    supabaseError.status === 404 ||
    supabaseError.code === "42P01" ||
    supabaseError.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("relation")
  );
}