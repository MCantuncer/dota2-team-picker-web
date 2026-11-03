"use client";

import { useEffect, useMemo, useState } from "react";
import { gamesByHero, type MatchupAnswer, type MatchupGames, type MatchupRequest, worthRetrying } from "@/lib/matchup-games";
import { createClient } from "@/lib/supabase/client";

/** Wait this long after the draft last changed before asking, so position fixes don't each cost a lookup. */
export const SETTLE_MS = 1500;
/** Wait before asking again for games a teammate's browser is fetching (its STRATZ budget is 8 s). */
export const RETRY_MS = 10000;

/** The HTTP status of a failed invoke, when Supabase gives one. */
const statusOf = (error: unknown) =>
  error && typeof error === "object" && "context" in error && error.context instanceof Response ? error.context.status : 0;

async function lookup(request: MatchupRequest, isLive: () => boolean): Promise<MatchupGames> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error("Session check failed", authError);
    return null;
  }
  if (!auth.session) return "sign-in";
  const ask = () => supabase.functions.invoke<MatchupAnswer>("matchup-builds", { body: request });
  let { data, error } = await ask();
  if (!error && data && worthRetrying(data)) {
    await new Promise((done) => setTimeout(done, RETRY_MS));
    if (!isLive()) return null;
    ({ data, error } = await ask());
  }
  if (error) {
    const status = statusOf(error);
    if (status === 401) return "sign-in";
    // 429 is the hourly limit: expected, so not logged as a fault.
    if (status !== 429) console.error("matchup-builds failed", error);
    return null;
  }
  return data && Array.isArray(data.slices) ? gamesByHero(request, data) : null;
}

/**
 * Asks matchup-builds once the draft has settled, and again when the viewer signs in or out.
 * Undefined while waiting, then the games by hero (see MatchupGames).
 */
export function useMatchupGames(request: MatchupRequest | null): MatchupGames | undefined {
  const key = request ? JSON.stringify(request) : null;
  // The request for this key; a new object with the same content keeps the same request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => request, [key]);
  // Undefined until the first auth event, so the page load asks once, as the right viewer.
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [answer, setAnswer] = useState<{ key: string; games: MatchupGames } | null>(null);

  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_, session) => setUser(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const fullKey = key && user !== undefined ? `${user ?? ""}|${key}` : null;
  useEffect(() => {
    if (!fullKey || !stable) return;
    let live = true;
    const timer = setTimeout(() => {
      lookup(stable, () => live)
        .catch((err: unknown) => {
          console.error("matchup-builds failed", err);
          return null;
        })
        .then((games) => {
          if (live) setAnswer({ key: fullKey, games });
        });
    }, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [fullKey, stable]);

  if (!key) return null;
  if (!fullKey) return undefined;
  return answer?.key === fullKey ? answer.games : undefined;
}
