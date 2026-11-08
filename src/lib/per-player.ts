import type { PlanSlot } from "@/lib/engine/plan";
import type { Engine } from "@/lib/engine/score";
import type { GamesWins, Position, RankBracket, Suggestion } from "@/lib/engine/types";
import { type Outsider, poolOnly, provenOutsider, weakHere, worstMatchup } from "@/lib/pick-explain";

/** Heroes shown per player: their own heroes for the position, or the best of every hero without any. */
const COLUMN_MAX = 6;

/** One player who still has to pick, with their suggestions for the position they play. */
export interface PlayerColumn {
  playerId: string;
  position: Position;
  suggestions: Suggestion[];
  /** One of the player's heroes, but weak in this draft. */
  weak: Set<number>;
  /**
   * Why the column lists the best of every hero: "none" when the player has no heroes for the
   * position (or doesn't share them), "used" when all of theirs are taken. null for their own heroes.
   */
  fromAll: "none" | "used" | null;
  /** The one hero from outside the player's pool that clearly beats their best, shown after the list. */
  outsider: Outsider<Suggestion> | null;
}

/**
 * The planner's Per Player view: one column per party member who still has to pick, with only
 * their own heroes for the position, best first (any hero when they have none). Each hero goes to
 * one column only: a player whose pool has it, else the player it scores highest for, so the party
 * never gets told to pick the same hero twice.
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
      top: s.top,
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
    const picks = poolOnly(own, pool, {
      max: COLUMN_MAX,
      weak: (x) => weakHere(x, worstMatchup(engine, x.heroId, enemies, s.position, rankBracket)),
    });
    // From this column's own heroes, so no other column lists it or shows it as its outsider.
    const outsider = provenOutsider(own, pool, picks);
    return { playerId: s.playerId, position: s.position, suggestions: picks.list, weak: picks.weak, fromAll: picks.fromAll, outsider };
  });
}
