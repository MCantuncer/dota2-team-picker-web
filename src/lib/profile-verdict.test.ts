import { describe, expect, it } from "vitest";
import { DEFAULT_PERIOD, type HeroInsights, type HeroLine, PERIODS } from "./hero-insights";
import { profileVerdict } from "./profile-verdict";

const NAMES: Record<number, string> = { 114: "Monkey King", 44: "Phantom Assassin" };
const name = (id: number) => NAMES[id];
const line = (heroId: number, games: number, wins: number, extraWins: number): HeroLine => ({ heroId, games, wins, won: Math.round((100 * wins) / games), delta: 0, extraWins });
const best = line(114, 41, 26, 4);
const worst = line(44, 22, 9, -3);
const insights = (over: Partial<HeroInsights> = {}): HeroInsights => ({ games: 123, won: 54, lines: [best, worst], mostPlayed: best, best, worst, ...over });

describe("profileVerdict", () => {
  it("names the best hero, then the win rate and the hero that costs the most", () => {
    expect(profileVerdict(insights(), DEFAULT_PERIOD, true, name)).toEqual({
      heroId: 114,
      title: "Monkey King Is Your Best Hero, 63% in 41 Games",
      line: "You won 54% of 123 games. Phantom Assassin costs you the most, 41% in 22 games.",
    });
  });

  it("leaves out the costly hero when there is none", () => {
    expect(profileVerdict(insights({ worst: null }), DEFAULT_PERIOD, true, name).line).toBe("You won 54% of 123 games.");
  });

  it("says when no hero has enough games, with the period's own bar", () => {
    const v = profileVerdict(insights({ games: 9, best: null, worst: null }), PERIODS[1], true, name);
    expect(v).toEqual({ heroId: null, title: "Too Few Games to Name a Best Hero", line: "You won 54% of 9 games. A hero needs 5 games in the last 30 days to be named." });
  });

  it("names no hero it has no name for", () => {
    const v = profileVerdict(insights({ best: line(999, 41, 26, 4) }), DEFAULT_PERIOD, true, name);
    expect(v).toMatchObject({ heroId: null, title: "Too Few Games to Name a Best Hero" });
  });

  it("says when the period has no games, or is not loaded yet", () => {
    expect(profileVerdict(null, PERIODS[0], true, name).line).toBe("OpenDota has no public games of yours from the last 7 days.");
    expect(profileVerdict(null, PERIODS[0], false, name).line).toBe("Press the refresh button next to your rank to load the last 7 days.");
  });
});
