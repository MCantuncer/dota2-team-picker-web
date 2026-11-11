import { useState } from "react";
import type { Engine } from "@/lib/engine/score";
import type { PositionFit } from "@/lib/engine/positions";
import type { EnemyPositions, GamesWins, Position, RankBracket } from "@/lib/engine/types";

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

/** A single matchup this bad (in win-rate points) is a risk worth naming on the hero's card. */
export const RISK_MATCHUP = -1.5;

/**
 * True when a hero is weak in this draft: its whole score is below 0. One bad matchup alone never makes a hero
 * weak (a hero can lose to one enemy and still be the second best pick); that is a named risk, see `riskHere`.
 */
export function weakHere(s: { score: number }): boolean {
  return s.score < 0;
}

/** The enemy a listed hero does worst against, and the points it costs. */
export interface PickRisk {
  heroId: number;
  /** Counter points against that enemy, below 0. */
  points: number;
  /** The enemy is one of the hero's listed hard counters. */
  isHardCounter: boolean;
}

/**
 * The one enemy worth a warning on a hero's card: a hard counter on the enemy team, else the worst matchup when it
 * is RISK_MATCHUP or worse (from Engine.counterEdges, which already holds a hard counter at its listed gap). Null
 * when no enemy is that bad.
 */
export function riskHere(
  engine: Engine,
  s: { heroId: number; hardCounters: { counterId: number; status: string }[] },
  enemies: number[],
  pos: Position,
  bracket?: RankBracket,
  known?: EnemyPositions,
): PickRisk | null {
  if (!enemies.length) return null;
  const edges = engine.counterEdges(s.heroId, enemies, engine.laneChances(enemies, pos, known), bracket);
  const hard = new Set(s.hardCounters.filter((n) => n.status === "enemy").map((n) => n.counterId));
  const worstOf = (xs: typeof edges) => xs.reduce<(typeof edges)[number] | null>((a, b) => (!a || b.edge < a.edge ? b : a), null);
  const counter = worstOf(edges.filter((e) => hard.has(e.enemy)));
  if (counter) return { heroId: counter.enemy, points: counter.edge, isHardCounter: true };
  const worst = worstOf(edges);
  return worst && worst.edge <= RISK_MATCHUP ? { heroId: worst.enemy, points: worst.edge, isHardCounter: false } : null;
}

/**
 * How a saved list was built: only the player's own heroes ("pool"), their own heroes plus heroes they have
 * played ("played"), or every hero when none of those are left ("any"). The database checks each rule.
 */
export type ListRule = "pool" | "played" | "any";

/**
 * Games on a hero (any position, six months of the player's matches) that make it one they have played: the
 * Profile's bar for a hero, and the one save_draft_suggestions checks a "played" list against.
 */
export const PLAYED_MIN = 10;
/**
 * Share of a hero's games in the position before a played hero is listed there. The record counts every
 * position, so this is stricter than the engine's bar for listing a pool hero.
 */
export const PLAYED_FIT = 0.3;

/**
 * Heroes outside the pool the player has played PLAYED_MIN games or more and that are at home in `pos`
 * (Can, 2026-11-10: Top 5 is the player's best heroes, not their only ones). Their record is measured, so
 * the score can weigh them; a hero they never played stays out.
 */
export function playedHeroes(
  personal: Record<number, GamesWins> | undefined,
  fit: (heroId: number) => PositionFit,
  pos: Position,
  pool: Set<number>,
): Set<number> {
  const played = new Set<number>();
  for (const [key, record] of Object.entries(personal ?? {})) {
    const heroId = Number(key);
    if (pool.has(heroId) || !Number.isInteger(heroId) || !(record?.games >= PLAYED_MIN)) continue;
    if (fit(heroId)[pos] >= PLAYED_FIT) played.add(heroId);
  }
  return played;
}

/** A player's list: the heroes to show, and which of them are weak in this draft. */
export interface PickList<T> {
  list: T[];
  /** Heroes in `list` that score below 0 in this draft: Weak Here on a card, or together in Not This Game on My Picks. */
  weak: Set<number>;
  /** Heroes in `list` from outside the pool that the player has played, shown with a label. */
  played: Set<number>;
  /**
   * Why the list is the best of every hero instead of the player's own: "none" when the player has
   * no heroes for the position, "used" when every one of them is picked, banned or listed for
   * another player. null for a list of their own heroes.
   */
  fromAll: "none" | "used" | null;
}

/**
 * The heroes a player sees, from `ranked` (every suggestion, best first): the pool heroes and the heroes
 * they have played (`played`, from playedHeroes), together in score order. The engine's score already
 * boosts the pool, the Top 5 and the player's record, so Top 5 is a push, never a filter (Can,
 * 2026-11-10), and a hero they never played stays out (Can, 2026-11-08). A weak hero keeps its place by
 * score and gets a label (Can, 2026-11-03). With none of those to list, the top `max` of all heroes, and
 * `fromAll` says why.
 */
export function ownHeroes<T extends { heroId: number }>(
  ranked: T[],
  pool: Set<number>,
  { max = LIST_MAX, weak = () => false, played = new Set() }: { max?: number; weak?: (s: T) => boolean; played?: Set<number> } = {},
): PickList<T> {
  const list = ranked.filter((s) => pool.has(s.heroId) || played.has(s.heroId)).slice(0, max);
  if (!list.length) return { list: ranked.slice(0, max), weak: new Set(), played: new Set(), fromAll: pool.size ? "used" : "none" };
  return {
    list,
    weak: new Set(list.filter(weak).map((s) => s.heroId)),
    played: new Set(list.filter((s) => !pool.has(s.heroId)).map((s) => s.heroId)),
    fromAll: null,
  };
}

/** The rule a list was built by, as the database checks it. */
export function listRule({ fromAll, played }: Pick<PickList<unknown>, "fromAll" | "played">): ListRule {
  return fromAll ? "any" : played.size ? "played" : "pool";
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
 * The best hero the player neither has in the pool nor has played, when it beats the best listed hero
 * by more than the error in both scores (Can, 2026-11-08: one proven outsider). Only for a list of the
 * player's own heroes: a list from every hero already shows the best of all. The listed heroes' scores
 * include their favorite and comfort boosts, so the outsider has to win without them.
 */
export function provenOutsider<T extends { heroId: number; score: number; error: number }>(
  ranked: T[],
  pool: Set<number>,
  { list, fromAll, played }: PickList<T>,
): Outsider<T> | null {
  const over = list[0];
  const listed = new Set(list.map((s) => s.heroId));
  const pick = ranked.find((s) => !pool.has(s.heroId) && !played.has(s.heroId) && !listed.has(s.heroId));
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
