import { type Friend, type SharedGame, winPercent } from "./friends";

/** What Friends says first: the hero it names, the finding as a title, short facts and one line of numbers. */
export interface FriendsVerdict {
  /** Your hero the title names, or null when it names none. */
  heroId: number | null;
  title: string;
  /** How many friends you have; null with none. */
  facts: string | null;
  line: string;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Your hero with the most wins in games with this friend; the better win rate, then the lower id, breaks a tie. */
function bestHero(games: SharedGame[]): { heroId: number; games: number; wins: number } | null {
  const byHero = new Map<number, { heroId: number; games: number; wins: number }>();
  for (const g of games) {
    const r = byHero.get(g.myHeroId) ?? { heroId: g.myHeroId, games: 0, wins: 0 };
    r.games += 1;
    if (g.won) r.wins += 1;
    byHero.set(g.myHeroId, r);
  }
  const top = [...byHero.values()].sort((a, b) => b.wins - a.wins || b.wins / b.games - a.wins / a.games || a.heroId - b.heroId)[0];
  return top && top.wins > 0 ? top : null;
}

/**
 * Friends' opening finding, for the friend who is open: how often the two of you win together and the hero you win
 * on most beside them; the line sets it against your games apart. The same sentence whether the number is high or
 * low. A friend with no games together, and a page with no friends, say so.
 */
export function friendsVerdict(friends: number, selected: Friend | null, games: SharedGame[], name: (id: number) => string | undefined): FriendsVerdict {
  if (!selected) {
    return { heroId: null, title: "No Friends Added Yet", facts: null, line: "Share your friend link, or add players from your Stacks." };
  }
  const facts = count(friends, "friend");
  const { together, without } = selected;
  const won = winPercent(together);
  if (won === null) {
    return { heroId: null, title: `No Games with ${selected.name} Yet`, facts, line: "Games the two of you play on the same team show here." };
  }

  const top = bestHero(games);
  const hero = top ? name(top.heroId) : undefined;
  const apart = winPercent(without);
  const record = `${count(together.wins, "win")} in ${count(together.games, "game")} together${apart === null ? "" : `, against ${apart}% in ${count(without.games, "game")} apart`}.`;
  return {
    heroId: top && hero ? top.heroId : null,
    title: `You Win ${won}% with ${selected.name}${hero ? `, Best on ${hero}` : ""}`,
    facts,
    line: top && hero ? `${record} On ${hero} you won ${top.wins} of ${top.games} with ${selected.name}.` : record,
  };
}
