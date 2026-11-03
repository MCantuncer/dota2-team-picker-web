import { latestSkillVersion } from "@/lib/engine/skill-plan";
import type { MatchupGame } from "@/lib/engine/matchup-talents";
import type { Snapshot } from "@/lib/engine/types";

/**
 * The live matchup lookup for a finished draft: our heroes' high-rank games against these five
 * enemies, from the matchup-builds edge function. The Game Story uses them to pick each talent
 * for this game; until they arrive each card shows the usual talents.
 */

export interface MatchupRequest {
  ours: { hero: number; position: number }[];
  theirs: number[];
  version: number;
}

/** What matchup-builds answers; only the fields the card reads. */
export interface MatchupAnswer {
  slices: { hero: number; games: MatchupGame[] }[];
  pending?: { hero: number }[];
  reasons?: string[];
}

/** The games by hero id, a hero's null when its lookup didn't finish, or "sign-in" for a signed-out viewer. */
export type MatchupGames = Record<number, MatchupGame[] | null> | null | "sign-in";

/**
 * The request for a finished draft (picks by position, index 0 = pos 1), or null when the draft
 * isn't finished or the snapshot has no skill builds to know the patch from. Enemies are sorted so
 * their order alone doesn't make a new request.
 */
export function matchupRequest(
  snapshot: Pick<Snapshot, "skillBuilds">,
  picks: (number | null)[],
  enemies: number[],
): MatchupRequest | null {
  const version = latestSkillVersion(snapshot.skillBuilds);
  if (!version || picks.length !== 5 || enemies.length !== 5) return null;
  const ours = picks.flatMap((hero, i) => (hero == null ? [] : [{ hero, position: i + 1 }]));
  return ours.length === 5 ? { ours, theirs: [...enemies].sort((a, b) => a - b), version } : null;
}

/**
 * Each hero's games against all enemies together. A hero with a slice still pending gets null, so
 * its card says the lookup didn't finish instead of counting only some of the enemies.
 */
export function gamesByHero(request: MatchupRequest, answer: MatchupAnswer): Record<number, MatchupGame[] | null> {
  const pending = new Set((answer.pending ?? []).map((s) => s.hero));
  const out: Record<number, MatchupGame[] | null> = {};
  for (const { hero } of request.ours) out[hero] = pending.has(hero) ? null : [];
  for (const s of answer.slices) out[s.hero]?.push(...s.games);
  return out;
}

/**
 * Whether asking once more should fill the pending slices: a teammate's browser was already
 * fetching them. Limits, STRATZ errors and a timed out fetch (still claimed by this lookup) won't
 * clear in time.
 */
export function worthRetrying(answer: MatchupAnswer): boolean {
  return Boolean(answer.pending?.length) && (answer.reasons ?? []).includes("fetching-elsewhere");
}
