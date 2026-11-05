import type { Position } from "@/lib/engine/types";

/**
 * Ids for Team plans (src/lib/team-lineup.ts): the player, and the teammates in open seats. Teammates
 * are strangers, so they get no hero pool and no record: their heroes are ranked on this draft only
 * ("if you can play this hero, it's good to go").
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
