import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The signed-in user from the session cookie, or null. `getClaims()` checks the token's signature on this server
 * with the project's public signing keys (fetched once and cached for 10 minutes), so a page no longer waits for a
 * round trip to Supabase Auth on every request the way `getUser()` did. It refreshes an expired token first, and
 * falls back to asking Supabase when a token is signed with the old shared secret. Any error counts as signed out.
 * A session signed out elsewhere stays valid here until its token expires (about an hour); every database read
 * still goes through row level security with the same token.
 */
export async function signedInUser(supabase: Pick<SupabaseClient, "auth">): Promise<{ id: string } | null> {
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  return error || !id ? null : { id };
}
