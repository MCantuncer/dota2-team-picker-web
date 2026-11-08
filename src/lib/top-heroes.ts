/**
 * Top 5: a player stars up to 5 heroes on each position list (Pos 1 to 5). Starred heroes get a small
 * extra push in pick suggestions. The database keeps the order (set_top_hero); this reads its answer,
 * orders a list for My Heroes and words the numbers a filled hero's card shows.
 */

export const TOP_SIZE = 5;

/** What set_top_hero returns: the position's Top 5, hero ids in slot order. */
export function readTopAnswer(raw: unknown): { position: number; top: number[] } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { position, top } = raw as { position?: unknown; top?: unknown };
  if (typeof position !== "number" || !Number.isInteger(position) || position < 1 || position > 5) return null;
  if (!Array.isArray(top) || top.length > TOP_SIZE || !top.every((id) => Number.isInteger(id) && id > 0)) return null;
  return { position, top: top as number[] };
}

/** Rows of favorite_heroes with their slot, to each position's Top 5 in slot order. */
export function topByPosition(rows: { position: number; hero_id: number; top_slot: number | null }[]): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  for (const r of [...rows].filter((r) => r.top_slot !== null).sort((a, b) => a.top_slot! - b.top_slot!)) {
    (out[r.position] ??= []).push(r.hero_id);
  }
  return out;
}

/** The list as My Heroes shows it: Top 5 first in slot order, then the rest in the order added. */
export function topFirst(list: number[], top: number[]): number[] {
  const starred = top.filter((id) => list.includes(id));
  return [...starred, ...list.filter((id) => !starred.includes(id))];
}

/** Postgres error codes set_top_hero raises, as the site reacts to them. */
export function topError(code: string | undefined): "full" | "busy" | "other" {
  if (code === "P0001") return "full";
  // Two quick adds took the same free slot; the list on screen is out of date.
  if (code === "23505") return "busy";
  return "other";
}

/** "Today", "1 day" or "12 days", counted in whole days before `now`. */
export function daysAgo(when: Date, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - when.getTime()) / 86_400_000));
  if (days === 0) return "Today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** The numbers the fill saved for a hero it added (hero_fill_picks). */
export interface FillNumbers {
  games: number;
  wins: number;
  lastPlayed: string;
}

/** hero_fill_picks rows keyed "position:hero"; rows that don't add up are left out. */
export function fillNumbers(
  rows: { position: number; hero_id: number; games: number; wins: number; last_played: string }[],
): Record<string, FillNumbers> {
  const out: Record<string, FillNumbers> = {};
  for (const r of rows) {
    if (r.games <= 0 || r.wins < 0 || r.wins > r.games || Number.isNaN(new Date(r.last_played).getTime())) continue;
    out[`${r.position}:${r.hero_id}`] = { games: r.games, wins: r.wins, lastPlayed: r.last_played };
  }
  return out;
}
