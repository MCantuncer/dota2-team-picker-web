/** The player's latest results, from the games the job saved (player_game_facts). Pure. */

export const FORM_GAMES = 20;
/** A run this long is worth a line. */
const STREAK = 3;

export interface FormRow {
  is_win: boolean;
  started_at: string;
}

export interface RecentForm {
  /** Newest first. */
  results: boolean[];
  wins: number;
  /** One line on what changed: a streak, or the last 10 against the 10 before. */
  note: string | null;
}

export function recentForm(rows: FormRow[]): RecentForm | null {
  const results = [...rows]
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))
    .slice(0, FORM_GAMES)
    .map((r) => r.is_win);
  if (results.length === 0) return null;
  const wins = results.filter(Boolean).length;
  return { results, wins, note: formNote(results) };
}

function formNote(results: boolean[]): string | null {
  const parts: string[] = [];
  let run = 1;
  while (run < results.length && results[run] === results[0]) run++;
  if (run >= STREAK) parts.push(`${results[0] ? "Won" : "Lost"} your last ${run} in a row.`);
  if (results.length === 20) {
    const last = results.slice(0, 10).filter(Boolean).length;
    const before = results.slice(10).filter(Boolean).length;
    if (Math.abs(last - before) >= 3) parts.push(`Won ${last} of the last 10, against ${before} of the 10 before.`);
  }
  return parts.length ? parts.join(" ") : null;
}

export interface PositionRow {
  is_win: boolean;
  position: number | null;
}

export interface PositionShare {
  /** 1 to 5. */
  position: number;
  games: number;
  wins: number;
}

export interface PositionsLately {
  /** Most played first. */
  positions: PositionShare[];
  /** Games with no known position, so the rows still add up to the games counted. */
  unknown: { games: number; wins: number };
}

/**
 * The positions the player actually played in their latest games (rows newest first), most played first, ties by
 * more wins, then by position number. A game without a known position (STRATZ didn't have it and OpenDota's lane
 * data couldn't tell core from support) is counted as unknown, not dropped. Pure.
 */
export function positionsLately(rows: PositionRow[]): PositionsLately {
  const byPosition = new Map<number, PositionShare>();
  const unknown = { games: 0, wins: 0 };
  for (const r of rows.slice(0, FORM_GAMES)) {
    if (r.position === null || r.position < 1 || r.position > 5) {
      unknown.games++;
      if (r.is_win) unknown.wins++;
      continue;
    }
    const share = byPosition.get(r.position) ?? { position: r.position, games: 0, wins: 0 };
    share.games++;
    if (r.is_win) share.wins++;
    byPosition.set(r.position, share);
  }
  const positions = [...byPosition.values()].sort(
    (a, b) => b.games - a.games || b.wins - a.wins || a.position - b.position,
  );
  return { positions, unknown };
}
