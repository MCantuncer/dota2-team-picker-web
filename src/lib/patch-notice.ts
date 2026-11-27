import type { Snapshot } from "@/lib/engine/types";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Every 5 v 5 game gives 25 hero vs hero pairs, and the matchups hold each pair from both heroes' side. */
const PAIR_ROWS_PER_GAME = 50;

export interface PatchNotice {
  /** The patch, like "7.42". */
  name: string;
  /** Day of the patch, 1 on the day it came out. */
  day: number;
  /** This patch's ranked games in the pick counts. */
  patchGames: number;
  /** Share of the pick counts from this patch, 0 to 1; the rest is older games from STRATZ. */
  share: number;
  /** The newest letter patch of it (7.42a) and its day, when there is one; its games count extra in the picks. */
  release?: { name: string; day: number };
}

const dayOf = (startedMs: number, now: Date) =>
  Math.max(1, Math.floor((now.getTime() - startedMs) / DAY_MS) + 1);

/**
 * The New Patch notice for the Draft page, while the hero data counts a young patch's own games next to older
 * ones (`matchupsFrom.patchGames`, set by the backend for a patch's first 14 days); null otherwise.
 */
export function patchNotice(
  data: Pick<Snapshot, "patch" | "matchupsFrom" | "matchups">,
  now: Date,
): PatchNotice | null {
  const patchGames = data.matchupsFrom?.patchGames;
  const started = Date.parse(data.patch?.startedAt ?? "");
  if (
    !data.patch ||
    patchGames === undefined ||
    !Number.isFinite(started) ||
    patchGames <= 0
  )
    return null;
  let rows = 0;
  for (const row of Object.values(data.matchups))
    for (const gw of Object.values(row)) rows += gw.games;
  const total = rows / PAIR_ROWS_PER_GAME;
  const r = data.patch.release;
  const releaseStart = Date.parse(r?.startedAt ?? "");
  return {
    name: data.patch.name,
    day: dayOf(started, now),
    patchGames,
    share: total > 0 ? Math.min(1, patchGames / total) : 1,
    ...(r && r.name !== data.patch.name && Number.isFinite(releaseStart)
      ? { release: { name: r.name, day: dayOf(releaseStart, now) } }
      : {}),
  };
}
