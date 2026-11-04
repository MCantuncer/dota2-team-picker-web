/** One player of a Stack as the banner and Lineup show them. */
export interface Seat {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "co_captain" | "player";
  rankTier: number | null;
  /** Their main position: the one with the most heroes saved, the lower number on a tie. Null when unknown. */
  position: number | null;
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

/** The position with the most heroes saved; the lower number on a tie; null without positions. */
export function mainPosition(positions: number[], heroes: Record<number, number[]>): number | null {
  let best: number | null = null;
  for (const p of [...positions].sort((a, b) => a - b)) {
    if (best === null || (heroes[p]?.length ?? 0) > (heroes[best]?.length ?? 0)) best = p;
  }
  return best;
}

/**
 * The Stack's players in Lineup order: by main position 1 to 5, players without one last, in Stack order
 * otherwise. Heroes and positions come only from `pools` (what row level security lets you see).
 */
export function toSeats(
  people: StackPerson[],
  pools: SharedPool[],
  avatar: (url: string | null) => string | null,
): Seat[] {
  const shared = new Map(pools.map((p) => [p.user_id, p]));
  const seats = people.map((m, i) => {
    const pool = shared.get(m.user_id);
    const heroes = heroesByPosition(pool?.favorites);
    const positions = (pool?.positions ?? []).filter(isPosition).sort((a, b) => a - b);
    const position = mainPosition(positions, heroes);
    const seat: Seat = {
      id: m.user_id,
      name: m.display_name ?? "Unnamed",
      avatarUrl: avatar(m.avatar_url),
      role: m.role === "owner" || m.role === "co_captain" ? m.role : "player",
      rankTier: m.rank_tier,
      position,
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
