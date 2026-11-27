import { POSITION_NAMES } from "./draft";
import { change, movers, type HeroRate, type Measure } from "./meta";

/** What the Meta page says first: the hero it names, the finding as a title, and one line of numbers. */
export interface MetaVerdict {
  heroId: number;
  title: string;
  line: string;
}

/** A role's first leader: the hero with the most wins above even there. */
export interface RoleTop {
  role: number;
  rate: HeroRate;
}

const COUNT = ["", "", "two", "three", "four", "five"];

/**
 * The Meta page's opening finding. On a role it names that role's leader; across the roles it names the role leader
 * with the highest win rate. The line gives the leader's change since the patch before and its games, then the
 * hero of `rates` (the ones the page lists) that gained the most. Null when no role has a leader yet.
 */
export function metaVerdict(tops: RoleTop[], rates: HeroRate[], name: (id: number) => string, oldPatch: string | null): MetaVerdict | null {
  const top = [...tops].sort((a, b) => b.rate.win - a.rate.win)[0];
  if (!top) return null;
  const { rate, role } = top;
  const title = `${name(rate.id)} Leads ${POSITION_NAMES[role - 1]} at ${rate.win.toFixed(1)}%`;

  const why = tops.length > 1 ? `The highest win rate of the ${COUNT[tops.length] ?? tops.length} role leaders` : "The most wins above even in the role";
  const since = oldPatch ?? "the patch before";
  const moved = change(rate, "win");
  const games = `over ${rate.games.toLocaleString("en-US")} games`;
  const first =
    moved === null
      ? `${why}, ${games}.`
      : Math.abs(moved) < 0.05
        ? `${why}: level with ${since} ${games}.`
        : `${why}: ${moved > 0 ? "up" : "down"} ${Math.abs(moved).toFixed(1)} points since ${since} ${games}.`;

  const riser = movers(rates, "win", 1).up[0];
  const second =
    riser && riser.id !== rate.id
      ? ` ${name(riser.id)} gained the most, ${(change(riser, "win") ?? 0).toFixed(1)} points to ${riser.win.toFixed(1)}%.`
      : "";
  return { heroId: rate.id, title, line: first + second };
}

const WORD = ["No", "One", "Two", "Three", "Four", "Five"];

/** A change under this many points shows as 0.0, so it is no gain and no loss. */
const LEVEL = 0.05;

/**
 * The glance's title: how many of the role leaders win more than in the patch before ("Four of Five Role Leaders
 * Gained Since 7.41"). Null unless at least two leaders, each with a win rate from before, can be compared.
 */
export function glanceTitle(leaders: HeroRate[], oldPatch: string | null): string | null {
  const moved = leaders.map((h) => change(h, "win"));
  if (moved.length < 2 || moved.length > 5 || moved.some((c) => c === null)) return null;
  const up = moved.filter((c) => (c ?? 0) >= LEVEL).length;
  const since = `Since ${oldPatch ?? "the Patch Before"}`;
  if (up === 0) return `No Role Leader Gained ${since}`;
  if (up === moved.length) return `${up === 2 ? "Both" : `All ${WORD[up]}`} Role Leaders Gained ${since}`;
  return `${WORD[up]} of ${WORD[moved.length]} Role Leaders Gained ${since}`;
}

/**
 * Winners and Losers' title: the biggest riser and the biggest faller with their points ("Monkey King Is Up 5.5
 * Points, Outworld Devourer Down 6.1"). Null when nothing moved.
 */
export function moversTitle(up: HeroRate | undefined, down: HeroRate | undefined, measure: Measure, name: (id: number) => string): string | null {
  const points = (h: HeroRate) => Math.abs(change(h, measure) ?? 0).toFixed(1);
  if (measure === "pick") {
    if (up && down) return `${name(up.id)} Is Picked ${points(up)} Points More, ${name(down.id)} ${points(down)} Less`;
    if (up) return `${name(up.id)} Is Picked ${points(up)} Points More`;
    return down ? `${name(down.id)} Is Picked ${points(down)} Points Less` : null;
  }
  if (up && down) return `${name(up.id)} Is Up ${points(up)} Points, ${name(down.id)} Down ${points(down)}`;
  if (up) return `${name(up.id)} Is Up ${points(up)} Points`;
  return down ? `${name(down.id)} Is Down ${points(down)} Points` : null;
}

/**
 * New Items' title: the new item that ends the most games and how far ahead of the next it is ("Bloodslinger Is
 * Built Three Times as Often as Any Other New Item"). Null with fewer than two items, no games yet, or a tie.
 */
export function newItemsTitle(items: { name: string; games: number }[]): string | null {
  const [first, second] = [...items].sort((a, b) => b.games - a.games);
  if (!first || !second || first.games === 0 || first.games === second.games) return null;
  const times = second.games === 0 ? 0 : Math.floor(first.games / second.games);
  if (times < 2) return `${first.name} Is the Most Built New Item`;
  return `${first.name} Is Built ${times === 2 ? "Twice" : `${WORD[times] ?? times} Times`} as Often as Any Other New Item`;
}

/** What a Role Builds' title: the item that ends the most of the role's games ("41% of Carry Games End with Battle Fury"). */
export function roleItemsTitle(top: { name: string; share: number } | undefined, role: number): string | null {
  return top ? `${Math.round(top.share)}% of ${POSITION_NAMES[role - 1]} Games End with ${top.name}` : null;
}
