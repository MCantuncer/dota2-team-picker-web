import { useState } from "react";
import type { Engine } from "@/lib/engine/score";
import type { EnemyPositions, Position, RankBracket } from "@/lib/engine/types";

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

/** Heroes listed at most. */
const LIST_MAX = 8;

/** A single matchup this bad (in win-rate points) makes a pool hero weak in this draft. */
export const WEAK_MATCHUP = -1.5;

/**
 * True when a hero is weak in this draft: a score below 0, a hard counter on the enemy team, or
 * one matchup at WEAK_MATCHUP or worse (`worstMatchup`, from Engine.counterEdges). A label only: the
 * hero keeps its place by score.
 */
export function weakHere(s: { score: number; hardCounters: { status: string }[] }, worstMatchup: number): boolean {
  return s.score < 0 || s.hardCounters.some((n) => n.status === "enemy") || worstMatchup <= WEAK_MATCHUP;
}

/** The worst counter points the hero has against the enemies picked so far, 0 with none. `known`: enemy positions set by hand. */
export function worstMatchup(
  engine: Engine,
  heroId: number,
  enemies: number[],
  pos: Position,
  bracket?: RankBracket,
  known?: EnemyPositions,
): number {
  if (!enemies.length) return 0;
  const edges = engine.counterEdges(heroId, enemies, engine.laneChances(enemies, pos, known), bracket);
  return Math.min(0, ...edges.map((e) => e.edge));
}

/** A player's list: the heroes to show, and which of them are weak in this draft. */
/** How a saved list was built: from the player's own heroes, or from every hero when none are left. */
export type ListRule = "pool" | "any";

export interface PickList<T> {
  list: T[];
  /** Pool heroes in `list` that are weak in this draft, shown with a label. */
  weak: Set<number>;
  /**
   * Why the list is the best of every hero instead of the pool: "none" when the player has no
   * heroes for the position, "used" when every one of them is picked, banned or listed for
   * another player. null for a pool list.
   */
  fromAll: "none" | "used" | null;
}

/**
 * The heroes a player sees, from `ranked` (every suggestion, best first). With heroes in the pool,
 * only those, in score order: the pool decides which heroes are listed and the engine decides their
 * order (Can, 2026-11-08). A weak pool hero keeps its place by score and gets a label, so a bad pool
 * hero is never listed above better ones (Can, 2026-11-03) and is never swapped for a hero from
 * outside the pool. Without a pool hero to list, the top `max` of all heroes, and `fromAll` says why.
 */
export function poolOnly<T extends { heroId: number }>(
  ranked: T[],
  pool: Set<number>,
  { max = LIST_MAX, weak = () => false }: { max?: number; weak?: (s: T) => boolean } = {},
): PickList<T> {
  const list = ranked.filter((s) => pool.has(s.heroId)).slice(0, max);
  if (!list.length) return { list: ranked.slice(0, max), weak: new Set(), fromAll: pool.size ? "used" : "none" };
  return { list, weak: new Set(list.filter(weak).map((s) => s.heroId)), fromAll: null };
}

/**
 * How many standard errors an outside hero must clear the best pool hero by: 1.645 is the one-sided
 * 95% line, so a hero shown from outside the pool is better with 95% confidence, not by noise.
 */
export const OUTSIDER_Z = 1.645;

/** The one hero from outside the pool worth showing, and the numbers that prove it. */
export interface Outsider<T> {
  pick: T;
  /** The best pool hero it beats. */
  over: T;
  /** Score points above `over`. */
  gap: number;
  /** The gap it had to clear: OUTSIDER_Z times both scores' combined error. */
  margin: number;
}

/**
 * The best hero outside the pool, when it beats the pool's best hero by more than the error in
 * both scores (Can, 2026-11-08: pool only, plus one proven outsider). Only for a pool list: a list
 * from every hero already shows the best of all. The pool heroes' scores include their favorite
 * and comfort boosts, so the outsider has to win without them.
 */
export function provenOutsider<T extends { heroId: number; score: number; error: number }>(
  ranked: T[],
  pool: Set<number>,
  { list, fromAll }: PickList<T>,
): Outsider<T> | null {
  const over = list[0];
  const pick = ranked.find((s) => !pool.has(s.heroId));
  if (fromAll || !over || !pick) return null;
  const gap = pick.score - over.score;
  const margin = OUTSIDER_Z * Math.hypot(pick.error, over.error);
  return gap > margin ? { pick, over, gap, margin } : null;
}

/**
 * The outsider's reason, with its numbers: "Scores 6.2 above Puck, your best, more than the 4.1 the
 * data could be off by." `owner` names whose pool it is when that isn't the reader's.
 */
export function outsiderText({ over, gap, margin }: Outsider<{ name: string }>, owner?: string): string {
  const best = owner ? `${owner}'s best` : "your best";
  return `Scores ${gap.toFixed(1)} above ${over.name}, ${best}, more than the ${margin.toFixed(1)} the data could be off by.`;
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
