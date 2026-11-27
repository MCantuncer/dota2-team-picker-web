import type { HeroInsights, Period } from "./hero-insights";

/** What Your Profile says first: the hero it names, the finding as a title, and one line of numbers. */
export interface ProfileVerdict {
  /** The best hero the title names, or null when it names none. */
  heroId: number | null;
  title: string;
  line: string;
}

const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/**
 * Your Profile's opening finding for the chosen period, from the same numbers as Your Heroes below it. The title
 * names the Best Hero (the one that won the most games over the player's own average); the line gives the win rate
 * over every hero and the hero that costs the most games. With too few games for a best hero it says so.
 * `insights` is null when the period has no games; `loaded` is false until a sync has saved the period.
 */
export function profileVerdict(insights: HeroInsights | null, period: Period, loaded: boolean, name: (id: number) => string | undefined): ProfileVerdict {
  const none = "Too Few Games to Name a Best Hero";
  if (!insights) {
    const line = loaded ? `OpenDota has no public games of yours from ${period.words}.` : `Press the refresh button next to your rank to load ${period.words}.`;
    return { heroId: null, title: none, line };
  }
  const record = `You won ${insights.won}% of ${count(insights.games, "game")}.`;
  const best = insights.best && name(insights.best.heroId) ? insights.best : null;
  if (!best) return { heroId: null, title: none, line: `${record} A hero needs ${period.minGames} games in ${period.words} to be named.` };

  const worst = insights.worst && name(insights.worst.heroId) ? insights.worst : null;
  const cost = worst ? ` ${name(worst.heroId)} costs you the most, ${worst.won}% in ${count(worst.games, "game")}.` : "";
  return {
    heroId: best.heroId,
    title: `${name(best.heroId)} Is Your Best Hero, ${best.won}% in ${count(best.games, "Game")}`,
    line: record + cost,
  };
}
