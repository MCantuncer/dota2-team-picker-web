import type { DraftEntry } from "@/lib/draft";
import type { PlanSlot } from "@/lib/engine/plan";
import { POSITIONS, type GamesWins, type Position, type RankBracket } from "@/lib/engine/types";

/** A party member as the team plan needs them: who, and the position they chose in the lobby. */
export interface PlanMember {
  id: string;
  position: Position | null;
}

/** Favorite heroes per member, then per position; 0 holds heroes for any position. */
export type HeroPool = Record<string, Record<number, number[]>>;

/** Builds the pool from `party_hero_pool` rows, which come ordered by player, position and when added. */
export function toHeroPool(rows: { user_id: string; position: number; hero_id: number }[]): HeroPool {
  const pool: HeroPool = {};
  for (const r of rows) ((pool[r.user_id] ??= {})[r.position] ??= []).push(r.hero_id);
  return pool;
}

/**
 * The five slots for the leader's team plan: each position gets the member who chose it in the
 * lobby (members without one fill the positions nobody chose, in order) and the ally already
 * picked there. Allies entered without a position take the open positions left, in order.
 * `stats` adds each member's Top 5 for the position they play.
 */
export function toPlanSlots(
  members: PlanMember[],
  pool: HeroPool,
  allies: DraftEntry[],
  stats: Record<string, Pick<PartyPlayer, "top">> = {},
): PlanSlot[] {
  const players = new Map<Position, string>();
  for (const m of members) if (m.position && !players.has(m.position)) players.set(m.position, m.id);
  const free = POSITIONS.filter((p) => !players.has(p));
  for (const m of members) {
    if (m.position && players.get(m.position) === m.id) continue;
    const p = free.shift();
    if (p) players.set(p, m.id);
  }

  const heroes = new Map<Position, number>();
  for (const a of allies) if (a.position && !heroes.has(a.position)) heroes.set(a.position, a.heroId);
  const open = POSITIONS.filter((p) => !heroes.has(p));
  for (const a of allies) {
    if (a.position && heroes.get(a.position) === a.heroId) continue;
    const p = open.shift();
    if (p) heroes.set(p, a.heroId);
  }

  return POSITIONS.map((position) => {
    const playerId = players.get(position);
    const own = playerId ? pool[playerId] : undefined;
    return {
      position,
      playerId,
      heroId: heroes.get(position),
      favorites: own ? [...new Set([...(own[position] ?? []), ...(own[0] ?? [])])] : [],
      // The position's own Top 5 only; heroes for any position (0) have none.
      top: (playerId && stats[playerId]?.top[position]) || [],
    };
  });
}

/** What a party member brings to the Draft Room: their rank and their match stats per hero. */
export interface PartyPlayer {
  /** Rank medal (1 Herald to 8 Immortal), or null when their rank isn't visible. */
  rank: RankBracket | null;
  personal: Record<number, GamesWins>;
  /** Their Top 5 per position (1 to 5), hero ids in slot order. */
  top: Record<number, number[]>;
}

interface PartyStatsRow {
  user_id: string;
  rank_tier: number | null;
  favorites: unknown;
  hero_stats: unknown;
  top?: unknown;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Position to hero ids, from a jsonb object; anything malformed is skipped rather than trusted. */
function idsByPosition(raw: unknown): Record<number, number[]> {
  const byPos: Record<number, number[]> = {};
  if (isObject(raw)) {
    for (const [pos, ids] of Object.entries(raw)) {
      if (Array.isArray(ids)) byPos[Number(pos)] = ids.filter((id): id is number => Number.isInteger(id));
    }
  }
  return byPos;
}

/**
 * Builds the party's hero pool and each member's rank, stats and Top 5 from `party_player_stats` rows.
 * favorites and top are position to hero ids; anything malformed is skipped rather than trusted.
 */
export function toPartyStats(rows: PartyStatsRow[]): { pool: HeroPool; players: Record<string, PartyPlayer> } {
  const pool: HeroPool = {};
  const players: Record<string, PartyPlayer> = {};
  for (const r of rows) {
    pool[r.user_id] = idsByPosition(r.favorites);
    players[r.user_id] = {
      rank: r.rank_tier ? (Math.floor(r.rank_tier / 10) as RankBracket) : null,
      personal: (isObject(r.hero_stats) ? r.hero_stats : {}) as Record<number, GamesWins>,
      top: idsByPosition(r.top),
    };
  }
  return { pool, players };
}
