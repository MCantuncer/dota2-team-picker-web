import type { PlanSlot } from "@/lib/engine/plan";
import type { Engine } from "@/lib/engine/score";
import type { EnemyPositions, GamesWins, Position, RankBracket, Suggestion } from "@/lib/engine/types";
import { type Outsider, ownHeroes, playedHeroes, provenOutsider, weakHere, worstMatchup } from "@/lib/pick-explain";

/** Heroes shown per player: their own heroes for the position and the ones they have played, or the best of every hero without any. */
const COLUMN_MAX = 6;

/** One player who still has to pick, with their suggestions for the position they play. */
export interface PlayerColumn {
  playerId: string;
  position: Position;
  suggestions: Suggestion[];
  /** A listed hero that is weak in this draft. */
  weak: Set<number>;
  /** Listed heroes from outside the player's pool that they have played. */
  played: Set<number>;
  /**
   * Why the column lists the best of every hero: "none" when the player has no heroes for the
   * position (or doesn't share them), "used" when all of theirs are taken. null for their own heroes.
   */
  fromAll: "none" | "used" | null;
  /** The one hero from outside the player's pool that clearly beats their best, shown after the list. */
  outsider: Outsider<Suggestion> | null;
}

/**
 * The planner's Per Player view: one column per party member who still has to pick, with their own
 * heroes for the position and the heroes they have played, best first (any hero when they have none).
 * Each hero goes to one column only: a player whose pool has it, else one who has played it, else the
 * player it scores highest for, so the party never gets told to pick the same hero twice.
 */
export function perPlayerColumns(
  engine: Engine,
  {
    slots,
    personal,
    enemies,
    enemyPositions,
    bans,
    rankBracket,
  }: {
    /** The five slots from toPlanSlots: who plays where, their favorites and the hero picked there. */
    slots: PlanSlot[];
    /** Each player's own record per hero, by player id. */
    personal: Record<string, Record<number, GamesWins>>;
    enemies: number[];
    /** Enemy positions set by hand; the rest are guessed. */
    enemyPositions?: EnemyPositions;
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
      enemyPositions,
      bans,
      rankBracket,
      favorites: s.favorites ?? [],
      top: s.top,
      personal: personal[s.playerId],
      count: engine.heroes.length,
    }),
  );

  // Each column's pool and the heroes its player has played, so a hero goes to a player who has it.
  const pools = open.map((s) => new Set(s.favorites ?? []));
  const playeds = open.map((s, col) => playedHeroes(personal[s.playerId], (id) => engine.fit(id), s.position, pools[col]!));
  // A hero goes to a column whose pool has it, else one whose player played it, else where it scores highest.
  const claim = (col: number, heroId: number) => (pools[col]!.has(heroId) ? 2 : playeds[col]!.has(heroId) ? 1 : 0);
  const best = new Map<number, { col: number; claim: number; score: number }>();
  lists.forEach((list, col) => {
    for (const s of list) {
      const b = best.get(s.heroId);
      const c = claim(col, s.heroId);
      if (!b || c > b.claim || (c === b.claim && b.score < s.score)) best.set(s.heroId, { col, claim: c, score: s.score });
    }
  });

  return open.map((s, col) => {
    const own = lists[col]!.filter((x) => best.get(x.heroId)!.col === col);
    const pool = pools[col]!;
    const picks = ownHeroes(own, pool, {
      max: COLUMN_MAX,
      played: playeds[col],
      weak: (x) => weakHere(x, worstMatchup(engine, x.heroId, enemies, s.position, rankBracket, enemyPositions)),
    });
    // From this column's own heroes, so no other column lists it or shows it as its outsider.
    const outsider = provenOutsider(own, pool, picks);
    return { playerId: s.playerId, position: s.position, suggestions: picks.list, weak: picks.weak, played: picks.played, fromAll: picks.fromAll, outsider };
  });
}
