import { splitPosition } from "@/lib/draft";
import type { Position } from "@/lib/engine/types";

/** One hero as typed in a search box: the letters to search for and an optional position digit. */
export interface TypedHero {
  query: string;
  position: Position | null;
}

/**
 * Splits a search box line into the heroes typed on it, so `pa sf` is two heroes. With
 * `withPosition`, a trailing digit sets each hero's position, written either way: `cm5 lion 4`.
 * `isOneName` says when the whole line is one hero's name (`shadow fiend`), which then stays one hero.
 */
export function splitHeroes(text: string, withPosition: boolean, isOneName: (query: string) => boolean): TypedHero[] {
  const whole = withPosition ? splitPosition(text) : { query: text.trim(), position: null };
  if (!whole.query) return [];
  if (isOneName(whole.query)) return [whole];

  const heroes: TypedHero[] = [];
  for (const word of text.trim().split(/\s+/)) {
    const last = heroes.at(-1);
    if (withPosition && /^[1-5]$/.test(word) && last && last.position === null) {
      last.position = Number(word) as Position; // The regex above allows only 1 to 5.
      continue;
    }
    heroes.push(withPosition ? splitPosition(word) : { query: word, position: null });
  }
  return heroes.filter((h) => h.query);
}
