import { gamePlan, PLAN_MIN_ENEMIES, type GamePlan, type GamePlanInput } from "@/lib/engine/game-plan";
import type { Engine } from "@/lib/engine/score";
import type { Position, RankBracket } from "@/lib/engine/types";

/**
 * The game plan once the draft is complete: all five of our positions filled (index 0 = pos 1)
 * and at least four enemies, since Ranked All Pick hides their last pick until strategy time. Null
 * until then. `matchups` is the live matchup lookup's games by hero id
 * (see GamePlanInput), for each card's talents.
 */
export function finishedDraftPlan(
  engine: Engine,
  picks: (number | null)[],
  enemies: number[],
  rankBracket?: RankBracket,
  matchups?: GamePlanInput["matchups"],
): GamePlan | null {
  if (picks.length !== 5 || enemies.length < PLAN_MIN_ENEMIES || picks.some((p) => p == null)) return null;
  // Checked above: every pick is a hero id.
  const ours = (picks as number[]).map((heroId, i) => ({ heroId, position: (i + 1) as Position }));
  return gamePlan(engine, { ours, theirs: enemies, rankBracket, matchups });
}
