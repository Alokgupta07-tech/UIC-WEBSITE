/**
 * Super Admin Configuration
 *
 * This email is the permanent, unremovable owner of the platform.
 * Protection is enforced at every layer:
 *   - Frontend UI (buttons hidden)
 *   - Service/API layer (throws before Supabase call)
 *   - Auth layer (auto-recovery on login)
 *   - Database triggers (final authority — blocks raw SQL)
 */

export const SUPER_ADMIN_EMAIL = "agupta88094@gmail.com";

/**
 * Check whether the given email belongs to the super admin.
 * Case-insensitive, null-safe.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}
