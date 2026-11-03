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
  pending?: unknown[];
  reasons?: string[];
}

/**
 * Whether asking again soon should fill the pending slices: another viewer of the same draft was
 * already fetching them, or the lookup ran out of time. Limits and STRATZ errors won't clear soon.
 */
export function worthRetrying(answer: MatchupAnswer): boolean {
  if (!answer.pending?.length) return false;
  return (answer.reasons ?? []).some((r) => r === "fetching-elsewhere" || r === "time");
}

/** The newest STRATZ game version among the weekly skill builds, or null when there are none. */
export function currentGameVersion(snapshot: Pick<Snapshot, "skillBuilds">): number | null {
  let latest = 0;
  for (const byPosition of Object.values(snapshot.skillBuilds ?? {})) {
    for (const s of Object.values(byPosition ?? {})) latest = Math.max(latest, s?.gameVersionId ?? 0);
  }
  return latest || null;
}

/**
 * The request for a finished draft (picks by position, index 0 = pos 1), or null when the draft
 * isn't finished or the snapshot has no skill builds to know the patch from.
 */
export function matchupRequest(
  snapshot: Pick<Snapshot, "skillBuilds">,
  picks: (number | null)[],
  enemies: number[],
): MatchupRequest | null {
  const version = currentGameVersion(snapshot);
  if (!version || picks.length !== 5 || enemies.length !== 5) return null;
  const ours = picks.flatMap((hero, i) => (hero == null ? [] : [{ hero, position: i + 1 }]));
  return ours.length === 5 ? { ours, theirs: enemies, version } : null;
}

/** The games for each of our heroes, all enemies together. A hero with no slice yet has none. */
export function gamesByHero(answer: MatchupAnswer): Record<number, MatchupGame[]> {
  const out: Record<number, MatchupGame[]> = {};
  for (const s of answer.slices) (out[s.hero] ??= []).push(...s.games);
  return out;
}
