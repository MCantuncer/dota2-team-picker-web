"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GamesWins, Position } from "@/lib/engine/types";
import type { HeroPool, PartyPlayer } from "@/lib/party-plan";
import { SOLO_ME } from "@/lib/solo-queue";
import {
  cleanSeats,
  fillFromStack,
  place,
  readSavedTeam,
  removeSeat,
  teamPlan,
  teamStorageKey,
  toTeamPeople,
  type LineupRow,
  type SavedTeam,
  type Seat,
  type TeamPerson,
} from "@/lib/team-lineup";
import { createClient } from "@/lib/supabase/client";

/** A Stack the player runs (owner or Manager), so they can plan its drafts. */
export interface PlannableStack {
  id: string;
  name: string;
}

interface Loaded {
  people: TeamPerson[];
  pool: HeroPool;
  players: Record<string, PartyPlayer>;
}

function write(key: string, saved: SavedTeam) {
  try {
    if (saved.mode === "me" && !saved.seats.length) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(saved));
  } catch {
    // Not keeping the lineup in this browser is fine.
  }
}

/** Drops ?stack= from the address, so a reload keeps later edits. */
function forgetStackParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("stack")) return;
  url.searchParams.delete("stack");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

/**
 * Plan For, Just Me or Team. Team seats the player (SOLO_ME, from their own data) and anyone from
 * `lineup_players`: Stack mates of Stacks they run and friends, mixed, online or not. Open seats are
 * planned as teammates who can play any hero. Saved per account in this browser, ids only.
 * `enabled` is false in a party, where the party plans instead.
 */
export function useTeamLineup({
  userId,
  enabled,
  stacks,
  myPosition,
  myHeroes,
  personal,
}: {
  userId: string | null;
  enabled: boolean;
  stacks: PlannableStack[];
  /** The player's solo position, where they sit when Team starts. */
  myPosition: Position;
  myHeroes: Record<number, number[]>;
  personal: Record<number, GamesWins>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const key = teamStorageKey(userId);
  const [mode, setMode] = useState<"me" | "team">("me");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  // Seats are cleaned and saved only after a load worked, so a failed load never wipes them.
  const [trusted, setTrusted] = useState(false);
  // "Draft for <Stack>": start a fresh Team from that Stack once its people load.
  const startStack = useRef<string | null>(null);
  const seatPosition = useRef(myPosition);
  const seatsNow = useRef(seats);
  useEffect(() => {
    seatPosition.current = myPosition;
    seatsNow.current = seats;
  });

  useEffect(() => {
    if (!enabled) return;
    const wanted = new URLSearchParams(window.location.search).get("stack");
    let saved: SavedTeam | null = null;
    try {
      saved = readSavedTeam(localStorage, userId, seatPosition.current);
    } catch {
      // No storage: start from Just Me.
    }
    if (wanted && userId && stacks.some((s) => s.id === wanted)) {
      startStack.current = wanted;
      // Reading the address and browser storage after mount is the one way to avoid a server mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("team");
      setSeats([{ id: SOLO_ME, position: seatPosition.current }]);
    } else {
      if (wanted) forgetStackParam();
      setMode(saved?.mode ?? "me");
      setSeats(saved?.seats ?? []);
    }
    // Signed out there is nobody to load, so the saved seats are all there is.
    setTrusted(!userId);
    setRestored(true);
  }, [enabled, userId, stacks]);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc("lineup_players");
    if (error) return setNotice(`Players not loaded: ${error.message}`);
    const next = toTeamPeople((data ?? []) as LineupRow[]);
    setNotice(null);
    setLoaded(next);
    const current = seatsNow.current;
    const clean = cleanSeats(current, next.people);
    const from = startStack.current;
    if (from) {
      startStack.current = null;
      forgetStackParam();
      setSeats(fillFromStack(clean, next.people, from).seats);
    } else {
      if (clean.length < current.length) setNotice("Some players are no longer yours to plan for, so their seats are open.");
      setSeats(clean);
    }
    setTrusted(true);
  }, [supabase, userId]);

  useEffect(() => {
    if (!enabled || !restored || mode !== "team" || !userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // An unfriend or a friend turning sharing off shows when the player comes back to the tab.
    const again = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, [enabled, restored, mode, userId, load]);

  useEffect(() => {
    if (enabled && restored && trusted) write(key, { mode, seats });
  }, [enabled, restored, trusted, key, mode, seats]);

  const people = loaded?.people ?? null;
  const plan =
    enabled && mode === "team"
      ? teamPlan({
          seats,
          people: people ?? [],
          pool: loaded?.pool ?? {},
          players: loaded?.players ?? {},
          myHeroes,
          personal,
        })
      : null;

  return {
    mode,
    seats,
    /** Who can be seated, once loaded; null signed out or before the first load. */
    people,
    notice,
    /** Who can be seated: their heroes per position, for the seat art. */
    pool: loaded?.pool ?? {},
    /** Just Me: the plain solo draft. Team seats are kept for next time. */
    justMe: () => setMode("me"),
    /** Team, keeping the seats from last time, or just the player when there are none. */
    team: () => {
      setMode("team");
      setSeats((s) => (s.length ? s : [{ id: SOLO_ME, position: seatPosition.current }]));
    },
    /** Seats someone, or moves them (swapping with whoever sat there). */
    place: (id: string, position: Position) => setSeats((s) => place(s, id, position)),
    remove: (id: string) => setSeats((s) => removeSeat(s, id)),
    /** Fills open seats from a Stack and says who didn't fit. */
    fill: (fromStack: string) => {
      if (!loaded) return;
      const result = fillFromStack(seatsNow.current, loaded.people, fromStack);
      setSeats(result.seats);
      setNotice(
        result.left.length
          ? `${result.left.map((p) => p.name).join(", ")} didn't fit: all seats are taken.`
          : null,
      );
    },
    /** Set in Team: every position planned, open seats as teammates. */
    plan,
  };
}
