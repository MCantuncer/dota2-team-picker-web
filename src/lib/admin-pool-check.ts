/**
 * Admin Pool Check page: reading admin_pool_check and admin_pool_slips. A slip is a party list built
 * from a player's own heroes ("pool") that still showed a hero from outside them; the server works
 * out the outside heroes from My Heroes when the list is saved, so the count should always be 0.
 */

/** How far back the page counts, in days. */
export const CHECK_DAYS = 7;
/** How many of the latest slips the page lists. */
export const SLIP_ROWS = 20;

export interface PoolCheck {
  lists: number;
  poolLists: number;
  slips: number;
  anyLists: number;
  /** Saved before the rule was recorded, or by an older page. */
  unknownLists: number;
  players: number;
}

export interface PoolSlip {
  draftId: string;
  userId: string;
  name: string;
  position: number;
  heroes: number[];
  outside: number[];
  at: string;
}

const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** The one row admin_pool_check returns, or null when it isn't the shape we expect. */
export function readCheck(rows: unknown): PoolCheck | null {
  const row: unknown = Array.isArray(rows) ? rows[0] : null;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const { lists, pool_lists, slips, any_lists, unknown_lists, players } = r;
  if (![lists, pool_lists, slips, any_lists, unknown_lists, players].every(count)) return null;
  return {
    lists: lists as number,
    poolLists: pool_lists as number,
    slips: slips as number,
    anyLists: any_lists as number,
    unknownLists: unknown_lists as number,
    players: players as number,
  };
}

/** The rows admin_pool_slips returns. */
export function readSlips(
  rows: { draft_id: string; user_id: string; display_name: string | null; position: number; heroes: number[]; outside: number[]; updated_at: string }[],
): PoolSlip[] {
  return rows.map((r) => ({
    draftId: r.draft_id,
    userId: r.user_id,
    name: r.display_name || "Player",
    position: r.position,
    heroes: r.heroes,
    outside: r.outside,
    at: r.updated_at,
  }));
}

/** "1 list", "12 lists". */
export function listsText(n: number): string {
  return n === 1 ? "1 list" : `${n} lists`;
}
