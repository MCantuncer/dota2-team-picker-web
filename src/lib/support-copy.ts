/**
 * Support Copy: the first support list (Pos 4 or Pos 5) a player fills is copied to the other one
 * until they change the other list or press Stop Copying. The database does the copying
 * (set_favorite_hero); this reads its answer and words the note My Heroes shows.
 */

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
    ? `Pos ${other} gets the same heroes. Change Pos ${other} any time to make it its own list.`
    : `Copied from Pos ${copy.from}. Change this list any time to make it its own.`;
}
