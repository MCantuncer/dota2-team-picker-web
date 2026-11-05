"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CheckInBoard } from "@/lib/game-check-in";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

/** Edits to a full board are saved once they settle. */
const SAVE_DELAY_MS = 1500;

type SaveArgs = Database["public"]["Functions"]["save_game_check_in"]["Args"];

/**
 * The saved game behind a full Draft board: saved (and saved again after edits) while `board` is set,
 * and Start Game / Not Playing It. Saving never gets in the way of the draft: a failed save is retried
 * with the next edit and shows nothing; only Start Game reports an error, because the player pressed it.
 */
export function useGameCheckIn(board: CheckInBoard | null) {
  const supabase = useMemo(() => createClient(), []);
  const [saved, setSaved] = useState<{
    id: string;
    boardId: string;
    startedAt: string | null;
    answered: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The board a saved row belongs to: a solo key or a party draft. A new board starts unsaved.
  const boardId = board ? (board.party_draft ?? board.key) : null;
  const body = board ? JSON.stringify(board) : null;
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (!board || !boardId || body === lastSaved.current) return;
    const timer = setTimeout(async () => {
      // The generated types list every SQL argument as non-null; key, party_draft and my_hero take null.
      const { data: id, error } = await supabase.rpc("save_game_check_in", board as unknown as SaveArgs);
      // An answered game can't change any more (55000): keep it as answered.
      if (error?.code === "55000") {
        lastSaved.current = body;
        return;
      }
      if (error || !id) return console.error("Saving the game failed", error);
      lastSaved.current = body;
      if (saved?.id === id) return;
      // A board saved before (a reload, or a party mate's save) may be started already.
      const { data: row, error: readError } = await supabase
        .from("game_check_ins")
        .select("started_at, answered_at")
        .eq("id", id)
        .maybeSingle();
      if (readError) console.error("Reading the saved game failed", readError);
      setSaved({ id, boardId, startedAt: row?.started_at ?? null, answered: Boolean(row?.answered_at) });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // `board` is compared through `body`, its JSON.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, boardId, supabase]);

  const current = saved && saved.boardId === boardId ? saved : null;

  const setStarted = useCallback(
    async (started: boolean) => {
      if (!current) return;
      setBusy(true);
      setError(null);
      const { data, error } = await supabase.rpc("set_game_started", {
        check_in: current.id,
        started,
      });
      setBusy(false);
      if (error) return setError(started ? "Could not start the game. Try again." : "Could not change it. Try again.");
      setSaved({ ...current, startedAt: data ?? null });
    },
    [current, supabase],
  );

  return {
    /** The saved game's id, once the full board is saved. */
    id: current?.id ?? null,
    startedAt: current?.startedAt ?? null,
    /** True once the player answered the check-in for this board. */
    answered: current?.answered ?? false,
    /** Marks the board's game as answered here, after the check-in is sent. */
    markAnswered: () => current && setSaved({ ...current, answered: true }),
    busy,
    error,
    start: () => setStarted(true),
    stop: () => setStarted(false),
  };
}
