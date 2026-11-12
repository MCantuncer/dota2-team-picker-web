/**
 * Support Copy: the first support list (Pos 4 or Pos 5) a player fills is copied to the other one
 * until they change the other list or press Stop Copying. The database does the copying
 * (set_favorite_hero); this reads its answer and words the note My Heroes shows.
 */
import { POSITION_NAMES } from "./draft";

export type SupportPosition = 4 | 5;

/** null: never started; "on": the source list is copied; "off": both lists are the player's own. */
export interface SupportCopy {
  state: "on" | "off" | null;
  from: SupportPosition | null;
}

/** What set_favorite_hero and stop_support_copy return. */
export interface SupportLists {
  copy: SupportCopy;
  heroes: Record<SupportPosition, number[]>;
}

export const NO_SUPPORT_COPY: SupportCopy = { state: null, from: null };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isHeroList = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((id) => typeof id === "number" && Number.isInteger(id) && id > 0);

/** The copy state from profiles.support_copy and support_copy_from; anything odd reads as never started. */
export function readSupportCopy(state: unknown, from: unknown): SupportCopy {
  if (state === "on" && (from === 4 || from === 5)) return { state: "on", from };
  if (state === "off") return { state: "off", from: null };
  return NO_SUPPORT_COPY;
}

/** Checks the RPC answer; null when it isn't the expected shape. */
export function readSupportLists(raw: unknown): SupportLists | null {
  if (!isObj(raw) || !isObj(raw.heroes)) return null;
  const four = raw.heroes["4"];
  const five = raw.heroes["5"];
  if (!isHeroList(four) || !isHeroList(five)) return null;
  return { copy: readSupportCopy(raw.support_copy, raw.support_copy_from), heroes: { 4: four, 5: five } };
}

/** The note under a support list while copying is on, or null when there is nothing to say. */
export function supportCopyNote(copy: SupportCopy, position: number): string | null {
  if (copy.state !== "on" || !copy.from || (position !== 4 && position !== 5)) return null;
  const other = 9 - copy.from;
  return position === copy.from
    ? `${POSITION_NAMES[other - 1]} gets the same heroes. Change ${POSITION_NAMES[other - 1]} any time to make it its own list.`
    : `Copied from ${POSITION_NAMES[copy.from - 1]}. Change this list any time to make it its own.`;
}

type SupportHeroes = Record<SupportPosition, number[]>;

/**
 * What the database does when a suggestion's Yes adds a hero (answer_pool_suggestion runs the same
 * Support Copy rules as set_favorite_hero), so My Heroes can show it without reading the lists again.
 * A hero the player once removed from the other list is not copied there; the page shows that on the next load.
 */
export function supportAddedByAnswer(copy: SupportCopy, heroes: SupportHeroes, position: number, heroId: number): SupportLists {
  if ((position !== 4 && position !== 5) || heroes[position].includes(heroId)) return { copy, heroes };
  const other: SupportPosition = position === 4 ? 5 : 4;
  const added = { ...heroes, [position]: [...heroes[position], heroId] } as SupportHeroes;
  const stopped = { copy: { state: "off", from: null } as SupportCopy, heroes: added };
  const copied = {
    copy: { state: "on", from: position } as SupportCopy,
    heroes: { ...added, [other]: added[other].includes(heroId) ? added[other] : [...added[other], heroId] } as SupportHeroes,
  };
  if (copy.state === "off") return { copy, heroes: added };
  // The first time: copying starts only when this is the first hero on either support list.
  if (copy.state === null) return heroes[4].length === 0 && heroes[5].length === 0 ? copied : stopped;
  return position === copy.from ? copied : stopped;
}
