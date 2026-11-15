import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { signedInUser } from "./claims";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Supabase client for Server Components, Server Actions and Route Handlers, signed in from the request cookies. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** The signed-in user's id, or null, checked without a round trip to Supabase Auth (see claims.ts). */
export async function getUser() {
  return signedInUser(await createClient());
}
