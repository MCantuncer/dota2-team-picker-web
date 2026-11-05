import { describe, expect, it } from "vitest";
import { heroInsights, signedPoints } from "./hero-insights";

// Can's real six months: 729 games, won 48%.
const stats = {
  "14": { games: 67, wins: 38 }, // Pudge, most played
  "74": { games: 50, wins: 16 }, // Invoker, 32%
  "76": { games: 46, wins: 29 }, // Outworld Devourer, 63%
  "106": { games: 10, wins: 3 }, // Ember Spirit, 30% but few games
  "35": { games: 4, wins: 4 }, // Sniper, too few games to be best
  "999": { games: 552, wins: 263 }, // the rest
};

describe("heroInsights", () => {
  it("weighs best and worst by games won or lost against the player's average", () => {
    const i = heroInsights(stats)!;
    expect([i.games, i.won]).toEqual([729, 48]);
    expect(i.mostPlayed?.heroId).toBe(999);
    expect(i.best).toMatchObject({ heroId: 76, won: 63, delta: 15, extraWins: 7 });
    // Ember Spirit has the lowest win rate, but Invoker cost more games.
    expect(i.worst).toMatchObject({ heroId: 74, won: 32, delta: -16, extraWins: -8 });
  });

  it("sorts by games or by win rate, leaving heroes with few games out of the win rate list", () => {
    expect(heroInsights(stats, "games")!.lines.map((l) => l.heroId)).toEqual([999, 14, 74, 76, 106, 35]);
    expect(heroInsights(stats, "won")!.lines.map((l) => l.heroId)).toEqual([76, 14, 999, 74, 106]);
  });

  it("skips odd entries and returns nothing without games", () => {
    expect(heroInsights({ "1": { games: 2, wins: 5 }, x: { games: 3, wins: 1 } })).toBeNull();
    expect(heroInsights(null)).toBeNull();
    expect(heroInsights({ "1": { games: 3, wins: 1 } })).toMatchObject({ games: 3, best: null, worst: null });
  });

  it("signs points with a real minus sign", () => {
    expect([signedPoints(7), signedPoints(-5), signedPoints(0)]).toEqual(["+7", "−5", "±0"]);
  });
});
