import { POSITION_NAMES } from "./draft";
import { change, movers, type HeroRate } from "./meta";

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
