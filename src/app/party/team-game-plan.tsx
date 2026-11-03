"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GameStoryPanel } from "@/components/game-story-panel";
import { Engine } from "@/lib/engine/score";
import { loadSnapshot } from "@/lib/engine/snapshot";
import type { RankBracket } from "@/lib/engine/types";
import { finishedDraftPlan } from "@/lib/game-plan";
import { matchupRequest } from "@/lib/matchup-games";
import { useMatchupGames } from "@/lib/use-matchup-games";
import { createClient } from "@/lib/supabase/client";
import { latestSentPlan, type SentPlan } from "@/lib/team-game-plan";

/**
 * The latest game plan a captain sent to one of your teams, shown the moment it arrives, with your
 * own card first. Nothing shows when no plan was sent in the last two hours.
 */
export function TeamGamePlan({
  userId,
  initialPlan,
  names,
  icons,
}: {
  userId: string;
  initialPlan: SentPlan | null;
  /** Display names of friends and teammates by user id. */
  names: Record<string, string>;
  icons: Record<number, string>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [sent, setSent] = useState(initialPlan);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSent(await latestSentPlan(supabase));
      setError(null);
    } catch {
      setError("Your team's game plan didn't load. Reload the page to try again.");
    }
  }, [supabase]);

  // Each new plan as a captain sends it (the database only sends plans for your own teams).
  useEffect(() => {
    const channel = supabase
      .channel(`team-game-plans:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_game_plans" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refresh]);

  // Hero data is only needed once there is a plan to show.
  const hasPlan = sent !== null;
  useEffect(() => {
    if (!hasPlan || engine) return;
    loadSnapshot()
      .then((s) => setEngine(new Engine(s)))
      .catch(() => setError("Hero data didn't load. Reload the page to try again."));
  }, [hasPlan, engine]);

  const matchups = useMatchupGames(sent && engine ? matchupRequest(engine.data, sent.picks, sent.enemies) : null);
  const plan = useMemo(
    () =>
      sent &&
      engine &&
      finishedDraftPlan(engine, sent.picks, sent.enemies, (sent.rankBracket ?? undefined) as RankBracket | undefined, matchups),
    [sent, engine, matchups],
  );

  if (error) return <p className="notice notice-error">{error}</p>;
  if (!sent || !plan || !engine) return null;
  const myPosition = sent.players.indexOf(userId) + 1 || undefined;
  const time = new Date(sent.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <GameStoryPanel
      plan={plan}
      heroName={(id) => engine.hero(id).name}
      icons={icons}
      abilities={engine.data.heroAbilities}
      playerNames={sent.players.map((id) => (id === userId ? "You" : id ? (names[id] ?? null) : null))}
      myPosition={myPosition}
      action={
        <span className="text-xs text-muted">
          From {sent.teamName} at <span className="num">{time}</span>
        </span>
      }
    />
  );
}
