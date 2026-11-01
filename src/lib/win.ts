import type { Engine } from "@/lib/engine/score";
import type { RankBracket } from "@/lib/engine/types";
import { draftEdge, winChance } from "@/lib/engine/win-chance";

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
