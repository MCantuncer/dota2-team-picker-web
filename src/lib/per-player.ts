import type { PlanSlot } from "@/lib/engine/plan";
import type { Engine } from "@/lib/engine/score";
import type { GamesWins, Position, RankBracket, Suggestion } from "@/lib/engine/types";
import { poolFirst, weakHere, worstMatchup } from "@/lib/pick-explain";

/** Pool heroes shown per player, then the best few outside their pool. */
const POOL_MAX = 4;
const OUTSIDE_MAX = 2;
/** A player with no pool (a Solo Queue teammate) gets the same column length, all ranked on the draft. */
const NO_POOL_MAX = POOL_MAX + OUTSIDE_MAX;

/** One player who still has to pick, with their suggestions for the position they play. */
export interface PlayerColumn {
  playerId: string;
  position: Position;
  suggestions: Suggestion[];
  /** Not one of the player's heroes for the position. */
  outside: Set<number>;
  /** One of the player's heroes, but weak in this draft. */
  weak: Set<number>;
}

/**
 * The planner's Per Player view: one column per party member who still has to pick, their own
 * heroes for the position first, then a few others. Each hero goes to one column only: a player
 * whose pool has it, else the player it scores highest for, so the party never gets told to
 * pick the same hero twice.
 */
export function perPlayerColumns(
  engine: Engine,
  {
    slots,
    personal,
    enemies,
    bans,
    rankBracket,
  }: {
    /** The five slots from toPlanSlots: who plays where, their favorites and the hero picked there. */
    slots: PlanSlot[];
    /** Each player's own record per hero, by player id. */
    personal: Record<string, Record<number, GamesWins>>;
    enemies: number[];
    bans: number[];
    rankBracket?: RankBracket;
  },
): PlayerColumn[] {
  const allies = slots.flatMap((s) => (s.heroId != null ? [{ heroId: s.heroId, position: s.position }] : []));
  const open = slots.filter((s): s is PlanSlot & { playerId: string } => s.playerId != null && s.heroId == null);
  const lists = open.map((s) =>
    engine.suggest({
      myPosition: s.position,
      allies,
      enemies,
      bans,
      rankBracket,
      favorites: s.favorites ?? [],
      personal: personal[s.playerId],
      count: engine.heroes.length,
    }),
  );

  const best = new Map<number, { col: number; pool: boolean; score: number }>();
  lists.forEach((list, col) => {
    const pool = new Set(open[col]!.favorites ?? []);
    for (const s of list) {
      const b = best.get(s.heroId);
      const inPool = pool.has(s.heroId);
      if (!b || (inPool && !b.pool) || (inPool === b.pool && b.score < s.score)) {
        best.set(s.heroId, { col, pool: inPool, score: s.score });
      }
    }
  });

  return open.map((s, col) => {
    const own = lists[col]!.filter((x) => best.get(x.heroId)!.col === col);
    const pool = new Set(s.favorites ?? []);
    const { list, outside, weak } = poolFirst(own, pool, {
      poolMax: pool.size ? POOL_MAX : NO_POOL_MAX,
      outsideMax: OUTSIDE_MAX,
      weak: (x) => weakHere(x, worstMatchup(engine, x.heroId, enemies, s.position, rankBracket)),
    });
    return { playerId: s.playerId, position: s.position, suggestions: list, outside, weak };
  });
}
