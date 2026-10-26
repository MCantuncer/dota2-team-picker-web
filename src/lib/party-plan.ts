import type { DraftEntry } from "@/lib/draft";
import type { PlanSlot } from "@/lib/engine/plan";
import { POSITIONS, type Position } from "@/lib/engine/types";

/** A party member as the team plan needs them: who, and the position they chose in the lobby. */
export interface PlanMember {
  id: string;
  position: Position | null;
}

/** Favorite heroes per member, then per position; 0 holds heroes for any position. */
export type HeroPool = Record<string, Record<number, number[]>>;

/**
 * The five slots for the leader's team plan: each position gets the member who chose it in the
 * lobby (members without one fill the positions nobody chose, in order) and the ally already
 * picked there. Allies entered without a position take the open positions left, in order.
 */
export function toPlanSlots(members: PlanMember[], pool: HeroPool, allies: DraftEntry[]): PlanSlot[] {
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
    };
  });
}
