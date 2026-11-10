/** One player of a Stack as the banner and Lineup show them. */
export interface Seat {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "co_captain" | "player";
  rankTier: number | null;
  /**
   * Their Best Position: of the positions they saved, the one they played most in their last 20 games; the most
   * heroes saved breaks a tie or stands in when they have no games there. Null when unknown.
   */
  position: number | null;
  /** Games at that position out of their recent games with a known position; null without games there. */
  played: { games: number; of: number } | null;
  /** Every position they play, lowest first. Empty when they have none or their heroes aren't shared with you. */
  positions: number[];
  /** Heroes for the main position, in the order they were saved. The first is their top hero. */
  heroes: number[];
  /** False when their heroes and positions aren't shared with you (a Manager never sees the owner's). */
  shared: boolean;
}

/** A stack_members row. */
export interface StackPerson {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  rank_tier: number | null;
}

/** A stack_player_stats row: only for the people whose heroes you may see. */
export interface SharedPool {
  user_id: string;
  positions: number[] | null;
  /** Hero ids per position, keyed "1" to "5", in the order they were saved. */
  favorites: unknown;
  /** Games per position over their last 20 games, keyed "1" to "5". Missing until the backend sends it. */
  played?: unknown;
}

const isPosition = (p: number) => Number.isInteger(p) && p >= 1 && p <= 5;

function heroesByPosition(favorites: unknown): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  if (!favorites || typeof favorites !== "object") return out;
  for (const [key, ids] of Object.entries(favorites as Record<string, unknown>)) {
    const p = Number(key);
    if (isPosition(p) && Array.isArray(ids)) out[p] = ids.filter((id): id is number => Number.isInteger(id) && id > 0);
  }
  return out;
}

function gamesByPosition(played: unknown): Record<number, number> {
  const out: Record<number, number> = {};
  if (!played || typeof played !== "object") return out;
  for (const [key, games] of Object.entries(played as Record<string, unknown>)) {
    const p = Number(key);
    if (isPosition(p) && Number.isInteger(games) && (games as number) > 0) out[p] = games as number;
  }
  return out;
}

/**
 * Best Position: of the positions saved, the one played most lately; then the one with the most heroes saved;
 * then the lower number. Null without positions.
 */
export function mainPosition(
  positions: number[],
  heroes: Record<number, number[]>,
  games: Record<number, number> = {},
): number | null {
  const score = (p: number) => [games[p] ?? 0, heroes[p]?.length ?? 0];
  let best: number | null = null;
  for (const p of [...positions].sort((a, b) => a - b)) {
    if (best === null) {
      best = p;
      continue;
    }
    const [g, h] = score(p);
    const [bg, bh] = score(best);
    if (g > bg || (g === bg && h > bh)) best = p;
  }
  return best;
}

/**
 * The Stack's players in Lineup order: by main position 1 to 5, players without one last, in Stack order
 * otherwise, each player once. Heroes and positions come only from `pools` (what row level security lets you see).
 */
export function toSeats(
  people: StackPerson[],
  pools: SharedPool[],
  avatar: (url: string | null) => string | null,
): Seat[] {
  const shared = new Map(pools.map((p) => [p.user_id, p]));
  // The owner can also have a member row; they get one seat, as the owner (stack_members lists the owner first).
  const unique = people.filter((m, i) => people.findIndex((o) => o.user_id === m.user_id) === i);
  const seats = unique.map((m, i) => {
    const pool = shared.get(m.user_id);
    const heroes = heroesByPosition(pool?.favorites);
    const positions = (pool?.positions ?? []).filter(isPosition).sort((a, b) => a - b);
    const games = gamesByPosition(pool?.played);
    const position = mainPosition(positions, heroes, games);
    const known = Object.values(games).reduce((a, b) => a + b, 0);
    const seat: Seat = {
      id: m.user_id,
      name: m.display_name ?? "Unnamed",
      avatarUrl: avatar(m.avatar_url),
      role: m.role === "owner" || m.role === "co_captain" ? m.role : "player",
      rankTier: m.rank_tier,
      position,
      played: position && games[position] ? { games: games[position], of: known } : null,
      positions,
      heroes: position ? (heroes[position] ?? []) : [],
      shared: !!pool,
    };
    return { seat, i };
  });
  return seats.sort((a, b) => (a.seat.position ?? 9) - (b.seat.position ?? 9) || a.i - b.i).map((s) => s.seat);
}

/**
 * The average rank of the players who have one, as a rank tier (75 = Divine 5), or null when nobody has a rank.
 * Medal and stars are counted as one ladder (Divine 5 is one step under Immortal), so the average is a real rank.
 */
export function averageRankTier(tiers: (number | null)[]): number | null {
  const steps = tiers
    .filter((t): t is number => !!t && t >= 11 && t <= 80)
    // Immortal (80) has no stars: count it as the step above Divine 5.
    .map((t) => (t >= 80 ? 35 : (Math.floor(t / 10) - 1) * 5 + Math.min(Math.max(t % 10, 1), 5) - 1));
  if (!steps.length) return null;
  const avg = Math.round(steps.reduce((a, b) => a + b, 0) / steps.length);
  if (avg >= 35) return 80;
  return (Math.floor(avg / 5) + 1) * 10 + (avg % 5) + 1;
}
