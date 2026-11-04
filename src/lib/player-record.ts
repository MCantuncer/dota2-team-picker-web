/**
 * The player's record over their saved games (`player_game_facts`), for the Your Games strip and
 * the My Heroes card: games, wins, how many OpenDota parsed, the most played hero and the latest
 * results. Rows come newest first.
 */

export const RECORD_SELECT = "hero_id, is_win, started_at, status";
/** The same window as the feedback (backend `_shared/feedback/profile.ts` WINDOW_DAYS). */
export const RECORD_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RecordRow {
  hero_id: number;
  is_win: boolean;
  started_at: string;
  status: string;
}

export interface PlayerRecord {
  games: number;
  wins: number;
  parsed: number;
  firstAt: string | null;
  lastAt: string | null;
  /** The hero with the most games, then the most wins; null with no games. */
  topHero: { id: number; games: number; wins: number } | null;
  /** Won (true) or lost in the newest `recent` saved games, newest first, inside the window or not. */
  latest: boolean[];
}

/** The record over the last RECORD_DAYS before `now`. */
export function playerRecord(rows: RecordRow[], now: Date, recent = 8): PlayerRecord {
  const from = now.getTime() - RECORD_DAYS * DAY_MS;
  const newest = [...rows].sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
  const games = newest.filter((r) => Date.parse(r.started_at) >= from);
  const byHero = new Map<number, { id: number; games: number; wins: number }>();
  for (const g of games) {
    const h = byHero.get(g.hero_id) ?? { id: g.hero_id, games: 0, wins: 0 };
    h.games += 1;
    if (g.is_win) h.wins += 1;
    byHero.set(g.hero_id, h);
  }
  const topHero = [...byHero.values()].sort((a, b) => b.games - a.games || b.wins - a.wins)[0] ?? null;
  return {
    games: games.length,
    wins: games.filter((g) => g.is_win).length,
    parsed: games.filter((g) => g.status === "parsed").length,
    firstAt: games.at(-1)?.started_at ?? null,
    lastAt: games[0]?.started_at ?? null,
    topHero,
    latest: newest.slice(0, recent).map((g) => g.is_win),
  };
}

/** Whole percent won, or null with no games. */
export const winPercent = (r: { games: number; wins: number }) => (r.games ? Math.round((100 * r.wins) / r.games) : null);
