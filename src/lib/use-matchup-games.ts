"use client";

import { useEffect, useMemo, useState } from "react";
import {
  busyRetryIn,
  gamesByHero,
  type MatchupAnswer,
  type MatchupGames,
  type MatchupRequest,
  worthRetrying,
} from "@/lib/matchup-games";
import { createClient } from "@/lib/supabase/client";

/** Wait this long after the draft last changed before asking, so position fixes don't each cost a lookup. */
export const SETTLE_MS = 1500;
/** Wait before asking again for games a teammate's browser is fetching (its STRATZ budget is 8 s). */
export const RETRY_MS = 10000;
/** Times to ask again after STRATZ was busy, for one draft on one open page. */
export const BUSY_RETRIES = 3;

/** The HTTP status of a failed invoke, when Supabase gives one. */
const statusOf = (error: unknown) =>
  error && typeof error === "object" && "context" in error && error.context instanceof Response ? error.context.status : 0;

/** The games, and when STRATZ was busy, how long to wait before asking again. */
interface Lookup {
  games: MatchupGames;
  retryIn: number | null;
}

async function lookup(request: MatchupRequest, isLive: () => boolean): Promise<Lookup> {
  const games = (g: MatchupGames): Lookup => ({ games: g, retryIn: null });
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error("Session check failed", authError);
    return games(null);
  }
  if (!auth.session) return games("sign-in");
  const ask = () => supabase.functions.invoke<MatchupAnswer>("matchup-builds", { body: request });
  let { data, error } = await ask();
  if (!error && data && worthRetrying(data)) {
    await new Promise((done) => setTimeout(done, RETRY_MS));
    if (!isLive()) return games(null);
    ({ data, error } = await ask());
  }
  if (error) {
    const status = statusOf(error);
    if (status === 401) return games("sign-in");
    // 429 is the hourly limit: expected, so not logged as a fault.
    if (status !== 429) console.error("matchup-builds failed", error);
    return games(null);
  }
  if (!data || !Array.isArray(data.slices)) return games(null);
  return { games: gamesByHero(request, data), retryIn: busyRetryIn(data, Date.now()) };
}

/**
 * Asks matchup-builds once the draft has settled, and again when the viewer signs in or out. When
 * STRATZ was busy, the games so far show and it asks again at the time the answer gives (up to
 * BUSY_RETRIES times). Undefined while waiting, then the games by hero (see MatchupGames).
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
    let retries = 0;
    const ask = () => {
      lookup(stable, () => live)
        .catch((err: unknown): Lookup => {
          console.error("matchup-builds failed", err);
          return { games: null, retryIn: null };
        })
        .then(({ games, retryIn }) => {
          if (!live) return;
          setAnswer({ key: fullKey, games });
          if (retryIn !== null && retries < BUSY_RETRIES) {
            retries++;
            timer = setTimeout(ask, retryIn);
          }
        });
    };
    let timer = setTimeout(ask, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [fullKey, stable]);

  if (!key) return null;
  if (!fullKey) return undefined;
  return answer?.key === fullKey ? answer.games : undefined;
}
