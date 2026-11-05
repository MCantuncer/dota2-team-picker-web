import { describe, expect, it } from "vitest";
import { DEFAULT_PERIOD, PERIODS, heroInsights, readPeriod, recordFor, signedPoints } from "./hero-insights";

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

describe("periods", () => {
  const now = Date.UTC(2026, 10, 5);
  const daysAgo = (d: number) => now / 1000 - d * 24 * 60 * 60;
  const games = [
    [14, 1, daysAgo(1)],
    [14, 0, daysAgo(3)],
    [74, 1, daysAgo(20)],
    [14, 1, daysAgo(60)],
    [76, 0, daysAgo(120)],
  ];
  const week = PERIODS[0];
  const month = PERIODS[1];

  it("reads the period from the URL, six months otherwise", () => {
    expect(readPeriod("7")).toBe(week);
    expect(readPeriod("30")).toBe(month);
    expect(readPeriod("365")).toBe(DEFAULT_PERIOD);
    expect(readPeriod(undefined)).toBe(DEFAULT_PERIOD);
  });

  it("counts a shorter period from the game list", () => {
    expect(recordFor(week, stats, games, now)).toEqual({ "14": { games: 2, wins: 1 } });
    expect(recordFor(month, stats, games, now)).toEqual({ "14": { games: 2, wins: 1 }, "74": { games: 1, wins: 1 } });
  });

  it("uses the saved six month totals for six months", () => {
    expect(recordFor(DEFAULT_PERIOD, stats, games, now)).toBe(stats);
  });

  it("is missing until the game list is saved, and empty when there were no games", () => {
    expect(recordFor(week, stats, [], now)).toBeUndefined();
    expect(recordFor(week, {}, [], now)).toEqual({});
    expect(recordFor(week, stats, [[14, 1, daysAgo(10)]], now)).toEqual({});
  });

  it("skips odd entries", () => {
    expect(recordFor(week, stats, [null, ["14", 1, daysAgo(1)], [14, 1], [14, 1, daysAgo(1)]], now)).toEqual({
      "14": { games: 1, wins: 1 },
    });
  });

  it("lets a hero be best or worst with fewer games in a short period", () => {
    const record = { "14": { games: 4, wins: 4 }, "74": { games: 4, wins: 0 } };
    expect(heroInsights(record, "games", week.minGames)?.best?.heroId).toBe(14);
    expect(heroInsights(record)?.best).toBeNull();
  });
});
