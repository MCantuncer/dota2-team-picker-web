import { POSITION_NAMES } from "./draft";

/** What My Heroes says first: the hero it names, the finding as a title, short facts and one line of numbers. */
export interface PoolVerdict {
  /** The hero the title names, or null when it names none. */
  heroId: number | null;
  title: string;
  /** How many heroes sit in how many roles. Null when the title already says it, or the pool is empty. */
  facts: string | null;
  line: string;
}

const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const list = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);

/** Games per hero from `profiles.hero_stats` ({ "14": { games, wins } }, the last six months), skipping odd entries. */
function gamesByHero(stats: unknown): Map<number, number> | null {
  if (typeof stats !== "object" || stats === null) return null;
  const games = new Map<number, number>();
  for (const [id, v] of Object.entries(stats as Record<string, unknown>)) {
    const n = (v as { games?: unknown } | null)?.games;
    if (/^\d+$/.test(id) && typeof n === "number" && Number.isInteger(n) && n > 0) games.set(Number(id), n);
  }
  return games;
}

/**
 * My Heroes' opening finding, from the player's hero lists by position and their six months of games per hero.
 * It names the pool hero they played most; the line gives the next two and the roles with no heroes. A pool with
 * no games on it gets its size as the title, and an empty pool says so.
 */
export function poolVerdict(picks: Record<number, number[]>, stats: unknown, name: (id: number) => string | undefined): PoolVerdict {
  const roles = POSITION_NAMES.map((role, i) => ({ role, heroes: (picks[i + 1] ?? []).filter((id) => name(id)) }));
  const heroes = [...new Set(roles.flatMap((r) => r.heroes))];
  if (!heroes.length) {
    return { heroId: null, title: "No Heroes in Your Pool Yet", facts: null, line: "Pick the roles you play, then your heroes for each one. Changes save right away." };
  }

  const covered = roles.filter((r) => r.heroes.length);
  const empty = roles.filter((r) => !r.heroes.length).map((r) => r.role);
  const gaps = empty.length ? `${list(empty)} ${empty.length === 1 ? "has" : "have"} no heroes yet.` : "Every role has a hero.";

  const games = gamesByHero(stats);
  const played = heroes.flatMap((id) => (games?.get(id) ? [{ id, games: games.get(id) ?? 0 }] : [])).sort((a, b) => b.games - a.games || a.id - b.id);
  const [leader, second, third] = played;
  if (!leader) {
    const none = games ? "No games on them in the last 6 months. " : "";
    return { heroId: null, title: `${count(heroes.length, "Hero", "Heroes")} in Your Pool Across ${count(covered.length, "Role")}`, facts: null, line: none + gaps };
  }

  const next = !second
    ? ""
    : third
      ? `${name(second.id)} is next with ${count(second.games, "game")} and ${name(third.id)} with ${third.games.toLocaleString("en-US")}. `
      : `${name(second.id)} is next with ${count(second.games, "game")}. `;
  return {
    heroId: leader.id,
    title: `${name(leader.id)} Leads Your Pool, ${count(leader.games, "Game")} in 6 Months`,
    facts: `${count(heroes.length, "hero", "heroes")} in ${covered.length} of 5 roles`,
    line: next + gaps,
  };
}
