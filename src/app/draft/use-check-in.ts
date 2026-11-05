"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CheckInAnswer, DueCheckIn } from "@/lib/game-check-in";
import { createClient } from "@/lib/supabase/client";

/** While a game is on, look for its result this often (the backend job finds it; this only reads). */
const POLL_MS = 2 * 60_000;

/**
 * The started game the Draft page should ask about now, from `due_check_in('draft')`: read on load, when
 * the tab comes back into view, and every two minutes while `polling` (a game is on). A failed read shows
 * nothing: the check-in must never get in the way of the draft.
 */
export function useDueCheckIn(on: boolean, polling: boolean) {
  const supabase = useMemo(() => createClient(), []);
  const [due, setDue] = useState<DueCheckIn | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("due_check_in", { surface: "draft" });
    if (error) return console.error("Reading the game check-in failed", error);
    const row = data?.[0];
    setDue(
      row
        ? {
            id: row.id,
            allies: row.allies,
            enemies: row.enemies,
            myHero: row.my_hero ?? null,
            myPosition: row.my_position,
            storyShown: row.story_shown,
            matchId: row.match_id ?? null,
            won: row.won ?? null,
          }
        : null,
    );
  }, [supabase]);

  useEffect(() => {
    if (!on) return;
    const first = setTimeout(() => void refresh(), 0);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = polling ? setInterval(() => document.visibilityState === "visible" && void refresh(), POLL_MS) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [on, polling, refresh]);

  return { due: on ? due : null, refresh, clear: () => setDue(null) };
}

/** Sends, skips or snoozes a check-in. Each returns an error message to show, or null. */
export function useCheckInActions() {
  const supabase = useMemo(() => createClient(), []);

  const answer = useCallback(
    async (id: string, a: CheckInAnswer): Promise<string | null> => {
      const note = a.note.trim();
      const { error } = await supabase.rpc("answer_check_in", {
        check_in: id,
        played: a.played,
        ...(a.won !== null && { did_win: a.won }),
        ...(a.picks && { picks: a.picks }),
        ...(a.story && { story: a.story }),
        ...(a.tags.length && { decided: a.tags }),
        ...(note && { note }),
      });
      if (!error) return null;
      console.error("Sending the check-in failed", error);
      return error.code === "22023" && error.message ? error.message : "Could not send it. Try again.";
    },
    [supabase],
  );

  const skip = useCallback(
    async (id: string): Promise<string | null> => {
      const { error } = await supabase.rpc("skip_check_in", { check_in: id });
      if (!error) return null;
      console.error("Skipping the check-in failed", error);
      return "Could not skip it. Try again.";
    },
    [supabase],
  );

  return { answer, skip };
}
