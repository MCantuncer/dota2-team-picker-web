import type { PositionFit } from "@/lib/engine/positions";
import type { Position } from "@/lib/engine/types";

/**
 * Puts our heroes read from the Dota screen into open positions. The screen does not show positions,
 * so each hero goes where it is most often played, choosing the best fit for all of them together
 * (two carries don't both take pos 1). `picks` holds pos 1 to 5; heroes beyond the open slots are left out.
 */
export function placeByPosition(
  picks: (number | null)[],
  heroIds: number[],
  fit: (heroId: number) => PositionFit,
): (number | null)[] {
  const open = picks.flatMap((p, i) => (p === null ? [i] : []));
  const heroes = heroIds.slice(0, open.length);
  let best: number[] = [];
  let bestScore = -1;
  const chosen: number[] = [];
  const walk = (h: number, score: number) => {
    if (h === heroes.length) {
      if (score > bestScore) [bestScore, best] = [score, chosen.slice()];
      return;
    }
    for (const slot of open) {
      if (chosen.includes(slot)) continue;
      chosen.push(slot);
      walk(h + 1, score * Math.max(fit(heroes[h]!)[(slot + 1) as Position], 1e-4));
      chosen.pop();
    }
  };
  walk(0, 1);
  const out = picks.slice();
  best.forEach((slot, h) => (out[slot] = heroes[h]!));
  return out;
}
