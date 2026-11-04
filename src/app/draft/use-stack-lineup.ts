"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Position } from "@/lib/engine/types";
import { toPartyStats, type HeroPool, type PartyPlayer, type PlanMember } from "@/lib/party-plan";
import {
  cleanLineup,
  isSavedLineup,
  lineupStorageKey,
  setPosition,
  togglePerson,
  type LineupEntry,
  type LineupPerson,
} from "@/lib/stack-lineup";
import { createClient } from "@/lib/supabase/client";

/** A Stack the player runs (owner or Manager), so they can plan its drafts. */
export interface PlannableStack {
  id: string;
  name: string;
}

/** What the draft board plans with when a Stack lineup is set. */
export interface LineupPlan {
  pool: HeroPool;
  players: Record<string, PartyPlayer>;
  members: PlanMember[];
  names: Record<string, string>;
  /** The player's own position in the lineup, or null when they aren't playing this game. */
  myPosition: Position | null;
}

const isPosition = (v: unknown): v is Position => [1, 2, 3, 4, 5].includes(v as number);

function read(userId: string) {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(lineupStorageKey(userId)) ?? "null");
    return isSavedLineup(v) ? v : null;
  } catch {
    return null;
  }
}

function write(userId: string, stackId: string, picks: LineupEntry[]) {
  try {
    if (stackId) localStorage.setItem(lineupStorageKey(userId), JSON.stringify({ stackId, picks }));
    else localStorage.removeItem(lineupStorageKey(userId));
  } catch {
    // Not keeping the lineup in this browser is fine.
  }
}

interface Loaded {
  stackId: string;
  people: LineupPerson[];
  pool: HeroPool;
  players: Record<string, PartyPlayer>;
}

/**
 * Plan For: a Stack the player runs, who plays this game and where. People come from
 * stack_members; their heroes and stats from stack_player_stats, which only returns the people the
 * player may plan for (a Manager never gets the owner). Saved per account in this browser.
 */
export function useStackLineup(userId: string | null, stacks: PlannableStack[]) {
  const supabase = useMemo(() => createClient(), []);
  const [stackId, setStackId] = useState("");
  const [picks, setPicks] = useState<LineupEntry[]>([]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  // After picking a Stack, tick the player once its people load (at their favorite free position).
  const tickMe = useRef(false);

  // The saved Stack, once, after mount (localStorage isn't there on the server).
  useEffect(() => {
    if (!userId) return;
    const saved = read(userId);
    // "Draft for <Stack>" on the Stacks page opens /draft?stack=<id>: plan for that Stack unless it is already the saved one.
    const wanted = new URLSearchParams(window.location.search).get("stack");
    if (wanted && wanted !== saved?.stackId && stacks.some((s) => s.id === wanted)) {
      tickMe.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStackId(wanted);
      setPicks([]);
      setRestored(true);
      return;
    }
    const id = saved && stacks.some((s) => s.id === saved.stackId) ? saved.stackId : "";
    // Reading browser storage after mount is the one way to restore it without a server mismatch.
    setStackId(id);
    setPicks(id ? saved!.picks : []);
    setRestored(true);
  }, [userId, stacks]);

  useEffect(() => {
    if (!stackId) return;
    let current = true;
    Promise.all([supabase.rpc("stack_members", { team: stackId }), supabase.rpc("stack_player_stats", { team: stackId })]).then(
      ([members, stats]) => {
        if (!current) return;
        const error = members.error ?? stats.error;
        if (error) return setNotice(`Stack not loaded: ${error.message}`);
        const rows = stats.data ?? [];
        if (!rows.length) {
          // The player no longer runs this Stack.
          setNotice("This Stack is no longer yours to plan, so the draft is back to Just Me.");
          setStackId("");
          setPicks([]);
          setLoaded(null);
          if (userId) write(userId, "", []);
          return;
        }
        const shared = new Map(rows.map((r) => [r.user_id, r]));
        const people: LineupPerson[] = (members.data ?? []).map((m) => ({
          id: m.user_id,
          name: m.user_id === userId ? "You" : (m.display_name ?? "Unnamed"),
          positions: (shared.get(m.user_id)?.positions ?? []).filter(isPosition),
          canPlay: shared.has(m.user_id),
        }));
        const { pool, players } = toPartyStats(rows);
        setNotice(null);
        setLoaded({ stackId, people, pool, players });
        const me = tickMe.current ? people.find((p) => p.id === userId) : undefined;
        tickMe.current = false;
        setPicks((p) => {
          const clean = cleanLineup(p, people);
          return me ? togglePerson(clean, me) : clean;
        });
      },
    );
    return () => {
      current = false;
    };
  }, [supabase, stackId, userId]);

  useEffect(() => {
    if (userId && restored) write(userId, stackId, picks);
  }, [userId, restored, stackId, picks]);

  const ready = loaded && loaded.stackId === stackId ? loaded : null;
  const choose = (id: string) => {
    setStackId(id);
    setLoaded(null);
    setNotice(null);
    // Picking a Stack ticks the player once it loads; Just Me clears the lineup.
    setPicks([]);
    tickMe.current = Boolean(id);
  };
  const plan: LineupPlan | null =
    ready && picks.length
      ? {
          pool: ready.pool,
          players: ready.players,
          members: picks.map((p) => ({ id: p.id, position: p.position })),
          names: Object.fromEntries(ready.people.map((p) => [p.id, p.name])),
          myPosition: picks.find((p) => p.id === userId)?.position ?? null,
        }
      : null;

  return {
    stackId,
    choose,
    people: ready?.people ?? null,
    picks,
    toggle: (person: LineupPerson) => setPicks((p) => togglePerson(p, person)),
    move: (id: string, position: Position) => setPicks((p) => setPosition(p, id, position)),
    notice,
    /** Set once a Stack is picked, loaded and at least one player is ticked. */
    plan,
  };
}
