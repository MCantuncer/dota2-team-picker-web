import { gamePlan, type GamePlan, type GamePlanInput } from "@/lib/engine/game-plan";
import type { Engine } from "@/lib/engine/score";
import type { EnemyPositions, Position, RankBracket } from "@/lib/engine/types";

/**
 * The game plan once the draft is complete: all five of our positions filled (index 0 = pos 1)
 * and five enemies. Null until then. `matchups` is the live matchup lookup's games by hero id
 * (see GamePlanInput), for each card's talents. `theirPositions`: enemy positions set by hand.
 */
export function finishedDraftPlan(
  engine: Engine,
  picks: (number | null)[],
  enemies: number[],
  rankBracket?: RankBracket,
  matchups?: GamePlanInput["matchups"],
  theirPositions?: EnemyPositions,
): GamePlan | null {
  if (picks.length !== 5 || enemies.length !== 5 || picks.some((p) => p == null)) return null;
  // Checked above: every pick is a hero id.
  const ours = (picks as number[]).map((heroId, i) => ({ heroId, position: (i + 1) as Position }));
  return gamePlan(engine, { ours, theirs: enemies, theirPositions, rankBracket, matchups });
}
