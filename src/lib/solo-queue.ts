import { POSITIONS, type GamesWins, type Position } from "@/lib/engine/types";
import type { HeroPool, PartyPlayer, PlanMember } from "@/lib/party-plan";

/**
 * Solo Queue: the player drafts alone and also wants ideas for the teammates they get. Teammates
 * are strangers, so they get no hero pool and no record: their heroes are ranked on this draft only
 * ("if you can play this hero, it's good to go"). The player keeps their own pool for their position.
 */

/** The Plan For value for Solo Queue. Never a Stack id, which are UUIDs. */
export const SOLO_QUEUE = "solo-queue";

/** The player's id in a Solo Queue plan, the same signed in or out. */
export const SOLO_ME = "me";

/** The name a teammate column shows, next to its position. */
export const TEAMMATE = "Teammate";

/** A teammate's id in the plan, one per position. */
export const teammateId = (p: Position) => `teammate-${p}`;

/** True for a teammate id from `teammateId`. */
export const isTeammate = (id: string) => id.startsWith("teammate-");

/** Whether Solo Queue is on, kept per account in this browser (signed out shares one key). */
export const soloQueueStorageKey = (userId: string | null) => `solo-queue:${userId ?? "guest"}`;

/** What the draft board plans with in Solo Queue. Same shape as a Stack lineup plan. */
export interface SoloQueuePlan {
  pool: HeroPool;
  players: Record<string, PartyPlayer>;
  members: PlanMember[];
  names: Record<string, string>;
  myPosition: Position;
}

/**
 * The player at their position and a teammate at every other one. Worked out on every render from
 * the player's position, so changing it never leaves a teammate on it. Only the player brings
 * heroes and a record; teammates have none, so the engine ranks every hero for them on the draft.
 * Positions an ally already holds drop out of Per Player on their own.
 */
export function soloQueuePlan({
  myPosition,
  myHeroes,
  personal,
}: {
  myPosition: Position;
  /** The player's favorite heroes per position; 0 holds heroes for any position. */
  myHeroes: Record<number, number[]>;
  personal: Record<number, GamesWins>;
}): SoloQueuePlan {
  const mates = POSITIONS.filter((p) => p !== myPosition);
  return {
    pool: { [SOLO_ME]: myHeroes, ...Object.fromEntries(mates.map((p) => [teammateId(p), {}])) },
    players: { [SOLO_ME]: { rank: null, personal } },
    members: [{ id: SOLO_ME, position: myPosition }, ...mates.map((p) => ({ id: teammateId(p), position: p }))],
    names: { [SOLO_ME]: "You", ...Object.fromEntries(mates.map((p) => [teammateId(p), TEAMMATE])) },
    myPosition,
  };
}
