import type { DraftAction, DraftEntry } from "@/lib/draft";
import type { PositionFit } from "@/lib/engine/positions";
import { POSITIONS, type Position } from "@/lib/engine/types";

/** A pick's position on screen: the one a player chose, or the likeliest free one when nobody has. Used for both teams. */
export interface AllyPosition {
  heroId: number;
  position: Position;
  isGuess: boolean;
}

/**
 * Every ally's (or, with no `reserved`, every enemy's) position. Chosen positions stay as they are. The rest get the free positions that fit them best
 * together, by how often each hero is played in each position (`fit`). `reserved` positions (yours, or every party
 * member's lobby position, so all screens guess alike) stay free while nobody chose them and the rest of the team
 * still fits around them. A position chosen for two heroes, as a half-finished swap can leave it, keeps the first
 * and the other falls back to a guess.
 */
export function resolveAllyPositions(
  allies: DraftEntry[],
  reserved: Position[],
  fit: (heroId: number) => PositionFit,
): AllyPosition[] {
  const taken = new Set<Position>();
  const chosen = allies.map((e) => {
    if (e.position === null || taken.has(e.position)) return null;
    taken.add(e.position);
    return e.position;
  });
  const open = allies.filter((_, i) => chosen[i] === null);
  const room = POSITIONS.length - taken.size - open.length;
  const held = [...new Set(reserved)].filter((p) => !taken.has(p)).slice(0, Math.max(room, 0));
  const free = POSITIONS.filter((p) => !taken.has(p) && !held.includes(p));
  const guesses = bestAssignment(
    open.map((e) => fit(e.heroId)),
    free,
  );

  let next = 0;
  return allies.map((e, i) => {
    const position = chosen[i];
    if (position != null) return { heroId: e.heroId, position, isGuess: false };
    return { heroId: e.heroId, position: guesses[next++]!, isGuess: true }; // One guess per open ally.
  });
}

/** The free positions, one per hero, that make the likeliest lineup together. Ties keep the lower position. */
function bestAssignment(fits: PositionFit[], free: Position[]): Position[] {
  let best: Position[] = [];
  let bestWeight = -1;
  const assigned: Position[] = [];
  const walk = (i: number, weight: number) => {
    if (i === fits.length) {
      if (weight > bestWeight) [best, bestWeight] = [[...assigned], weight];
      return;
    }
    for (const pos of free) {
      if (assigned.includes(pos)) continue;
      assigned.push(pos);
      walk(i + 1, weight * Math.max(fits[i]![pos], 1e-4)); // The caller passes one fit per hero.
      assigned.pop();
    }
  };
  walk(0, 1);
  return best;
}

/**
 * The draft actions that put a pick in `position`, so no two heroes of a team share one. The hero holding it moves to
 * this hero's old position (a swap), or back to a guess when this hero had none. `position` null clears the choice.
 */
export function positionActions(
  resolved: AllyPosition[],
  heroId: number,
  position: Position | null,
  kind: "ally" | "enemy" = "ally",
): DraftAction[] {
  const self = resolved.find((a) => a.heroId === heroId);
  const holder = position === null ? undefined : resolved.find((a) => a.heroId !== heroId && a.position === position && !a.isGuess);
  const actions: DraftAction[] = [];
  if (holder) {
    const back = self && !self.isGuess ? self.position : null;
    actions.push({ kind, heroId: holder.heroId, position: back });
  }
  actions.push({ kind, heroId, position });
  return actions;
}
