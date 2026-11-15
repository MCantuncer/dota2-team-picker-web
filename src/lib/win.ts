import type { Side } from "@/lib/draft-reader/geometry";
import type { Engine } from "@/lib/engine/score";
import type { RankBracket } from "@/lib/engine/types";
import { draftEdge, winChance } from "@/lib/engine/win-chance";
import { type WinRange, winRange } from "@/lib/engine/win-range";

/** Heroes in a full draft, both teams. */
const FULL_DRAFT = 10;

/**
 * My team's chance (0-1) to win with the heroes picked so far, or null when the snapshot has no
 * checked model for that many picks. Nothing is shown then, rather than a number nobody checked.
 */
export function teamWinChance(engine: Engine, ours: number[], theirs: number[], bracket?: RankBracket): number | null {
  return winChance(engine.data.winModel, draftEdge(engine, ours, theirs, bracket), ours.length + theirs.length);
}

/** How much picking `heroId` changes my team's win chance (in points), or null when either side is unknown. */
export function pickGain(engine: Engine, heroId: number, ours: number[], theirs: number[], bracket?: RankBracket): number | null {
  const now = teamWinChance(engine, ours, theirs, bracket);
  const next = teamWinChance(engine, [...ours, heroId], theirs, bracket);
  return now === null || next === null ? null : (next - now) * 100;
}

/** The draft edge split into what makes it, in win-rate points; the three add up to `draftEdge`. */
export interface EdgeParts {
  /** The heroes' own win rates, ours minus theirs. */
  rates: number;
  /** Our heroes against theirs, hard counters included. */
  matchups: number;
  /** The synergy inside our team minus inside theirs. */
  synergy: number;
}

/**
 * The parts of `draftEdge` for these picks. Matchups are what is left of the edge once win rates and synergy are
 * taken out, so the parts always add up to the edge the engine computes.
 */
export function edgeParts(engine: Engine, ours: number[], theirs: number[], bracket?: RankBracket): EdgeParts {
  const meta = (ids: number[]) => ids.reduce((s, id) => s + (engine.winRate(id, bracket) - 0.5) * 100, 0);
  const synergyOf = (ids: number[]) =>
    ids.reduce((s, a, i) => ids.slice(i + 1).reduce((t, b) => t + engine.synergyEdge(a, b, bracket), s), 0);
  const rates = meta(ours) - meta(theirs);
  const synergy = synergyOf(ours) - synergyOf(theirs);
  return { rates, matchups: draftEdge(engine, ours, theirs, bracket) - rates - synergy, synergy };
}

/** Who the draft favors: by the win chance when a checked model gives one, else by at least half a point of edge. */
export function favoredSide(edge: number, chance: number | null): "ours" | "theirs" | "even" {
  if (chance !== null) return chance > 0.505 ? "ours" : chance < 0.495 ? "theirs" : "even";
  return edge >= 0.5 ? "ours" : edge <= -0.5 ? "theirs" : "even";
}

/** The points at each end of an edge bar: the largest value rounded up to 5, and never under `least`. */
export function edgeRange(values: number[], least = 10): number {
  return Math.max(least, Math.ceil(Math.max(...values.map(Math.abs)) / 5) * 5);
}

/**
 * What teams with a draft like mine really won, once all 10 heroes are in and my side is known: the band of fair
 * public games my draft edge falls in, from my side. `edge` is my team's draft edge over the enemy, so on Dire
 * Radiant's edge is the other way round. Null before then, or while the snapshot has no checked range.
 */
export function draftWinRange(engine: Engine, edge: number, picked: number, side: Side | null): WinRange | null {
  if (picked < FULL_DRAFT || side === null) return null;
  const radiant = side === "radiant";
  return winRange(engine.data.winRange, radiant ? edge : -edge, radiant);
}
