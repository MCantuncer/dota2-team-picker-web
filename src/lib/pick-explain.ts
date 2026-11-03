import { useState } from "react";
import type { Engine } from "@/lib/engine/score";
import type { Position, RankBracket } from "@/lib/engine/types";

/** "A", "A and B", "A, B and C". */
const list = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? ""));

/**
 * One line above the suggestions on what they react to, so a list that has not moved reads as
 * "nothing new to react to" rather than "not calculated".
 */
export function reactingTo({ enemies, allies, bans }: { enemies: string[]; allies: string[]; bans: number }): string {
  if (!enemies.length && !allies.length) {
    const banned = bans ? ` ${bans} ${bans === 1 ? "ban" : "bans"} counted.` : "";
    return `Blind pick: no heroes picked yet, so these lean on meta, role and how easy each hero is to punish.${banned}`;
  }
  const parts: string[] = [];
  if (enemies.length) parts.push(`${list(enemies)} on the enemy team`);
  if (allies.length) parts.push(`${list(allies)} on yours`);
  if (bans) parts.push(`${bans} ${bans === 1 ? "ban" : "bans"}`);
  return `Reacting to ${list(parts)}.`;
}

/** Suggestions saved per player for the after-game card and reports (the database allows 1 to 8). */
export const SAVED_SUGGESTIONS = 8;

/** The list to save: the first SAVED_SUGGESTIONS heroes as shown, with their scores. */
export function toSaved(shown: { heroId: number; score: number }[]): { heroes: number[]; scores: number[] } {
  const top = shown.slice(0, SAVED_SUGGESTIONS);
  return { heroes: top.map((s) => s.heroId), scores: top.map((s) => Math.round(s.score * 100) / 100) };
}

/** Pool heroes shown at most, before the others. */
const POOL_MAX = 8;
/** Heroes outside the pool shown after the pool. */
const OUTSIDE_MAX = 3;

/** A single matchup this bad (in win-rate points) makes a pool hero weak in this draft. */
export const WEAK_MATCHUP = -1.5;

/**
 * True when a hero is weak in this draft: a score below 0, a hard counter on the enemy team, or
 * one matchup at WEAK_MATCHUP or worse (`worstMatchup`, from Engine.counterEdges).
 */
export function weakHere(s: { score: number; hardCounters: { status: string }[] }, worstMatchup: number): boolean {
  return s.score < 0 || s.hardCounters.some((n) => n.status === "enemy") || worstMatchup <= WEAK_MATCHUP;
}

/** The worst counter points the hero has against the enemies picked so far, 0 with none. */
export function worstMatchup(engine: Engine, heroId: number, enemies: number[], pos: Position, bracket?: RankBracket): number {
  if (!enemies.length) return 0;
  const edges = engine.counterEdges(heroId, enemies, engine.laneChances(enemies, pos), bracket);
  return Math.min(0, ...edges.map((e) => e.edge));
}

/**
 * The player's own heroes for the position first, best first, then the best few outside the pool.
 * `ranked` is every suggestion, best first. With an empty pool, the top `poolMax` of all heroes.
 * A pool hero that is `weak` in this draft loses its place up front and competes with the others
 * by score, so a bad pool hero is never listed above better heroes (Can, 2026-11-03).
 */
export function poolFirst<T extends { heroId: number }>(
  ranked: T[],
  pool: Set<number>,
  { poolMax = POOL_MAX, outsideMax = OUTSIDE_MAX, weak = () => false }: { poolMax?: number; outsideMax?: number; weak?: (s: T) => boolean } = {},
): { list: T[]; outside: Set<number>; weak: Set<number> } {
  if (!pool.size) return { list: ranked.slice(0, poolMax), outside: new Set(), weak: new Set() };
  const weakPool = new Set(ranked.filter((s) => pool.has(s.heroId) && weak(s)).map((s) => s.heroId));
  const mine = ranked.filter((s) => pool.has(s.heroId) && !weakPool.has(s.heroId)).slice(0, poolMax);
  const others = ranked.filter((s) => !pool.has(s.heroId) || weakPool.has(s.heroId)).slice(0, outsideMax);
  return {
    list: [...mine, ...others],
    outside: new Set(others.filter((s) => !pool.has(s.heroId)).map((s) => s.heroId)),
    weak: new Set(others.filter((s) => weakPool.has(s.heroId)).map((s) => s.heroId)),
  };
}

/** "New" for a hero not in the list before, "Up 2" for one that moved up two places. */
export function rankMoves(before: number[] | null, now: number[]): Map<number, string> {
  const moves = new Map<number, string>();
  if (!before) return moves;
  now.forEach((id, i) => {
    const was = before.indexOf(id);
    if (was === -1) moves.set(id, "New");
    else if (was > i) moves.set(id, `Up ${was - i}`);
  });
  return moves;
}

/**
 * Marks for the heroes that are new or moved up since the draft last changed. `draftKey` names
 * the picks and bans, and `scope` the list (such as the position): a new scope starts over with
 * no marks, since its list was never shown before.
 */
export function useRankMoves(ids: number[], draftKey: string, scope: string): Map<number, string> {
  const [seen, setSeen] = useState({ scope, draftKey, ids, before: null as number[] | null });
  let current = seen;
  if (seen.scope !== scope) current = { scope, draftKey, ids, before: null };
  else if (seen.draftKey !== draftKey) current = { scope, draftKey, ids, before: seen.ids };
  else if (seen.ids.join() !== ids.join()) current = { ...seen, ids };
  // Adjusting state while rendering, as React suggests for state that follows a prop.
  if (current !== seen) setSeen(current);
  return rankMoves(current.before, ids);
}
