import "server-only";

/** Supabase user ids allowed into the admin pages, from the ADMIN_USER_IDS setting (comma separated). */
const ADMIN_IDS = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export function isAdmin(userId: string | undefined): boolean {
  return !!userId && ADMIN_IDS.has(userId);
}
