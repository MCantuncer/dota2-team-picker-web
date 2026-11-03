"use client";

import { useEffect, useState } from "react";
import type { MatchupGame } from "@/lib/engine/matchup-talents";
import { gamesByHero, type MatchupAnswer, type MatchupRequest, worthRetrying } from "@/lib/matchup-games";
import { createClient } from "@/lib/supabase/client";

/** Wait before asking again for games another viewer is fetching. */
const RETRY_MS = 5000;

/** The lookup's games by hero id: undefined while loading, null when it failed or was refused. */
export type MatchupGames = Record<number, MatchupGame[]> | null | undefined;

/**
 * Asks matchup-builds once per finished draft. It needs a signed-in user; a signed-out viewer, an
 * error or a refused lookup all give null, and the cards keep the usual talents.
 */
export function useMatchupGames(request: MatchupRequest | null): MatchupGames {
  const key = request ? JSON.stringify(request) : null;
  const [answer, setAnswer] = useState<{ key: string; games: MatchupGames } | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) return null;
      const ask = () => supabase.functions.invoke<MatchupAnswer>("matchup-builds", { body: JSON.parse(key) });
      let { data, error } = await ask();
      // One more try when the missing games are being fetched right now (by a teammate, or a slow STRATZ).
      if (!error && data && Array.isArray(data.slices) && worthRetrying(data)) {
        await new Promise((done) => setTimeout(done, RETRY_MS));
        if (!live) return null;
        ({ data, error } = await ask());
      }
      if (error || !data || !Array.isArray(data.slices)) {
        if (error) console.error("matchup-builds failed", error);
        return null;
      }
      return gamesByHero(data);
    })()
      .catch((err: unknown) => {
        console.error("matchup-builds failed", err);
        return null;
      })
      .then((games) => {
        if (live) setAnswer({ key, games });
      });
    return () => {
      live = false;
    };
  }, [key]);
  if (!key) return null;
  return answer?.key === key ? answer.games : undefined;
}
