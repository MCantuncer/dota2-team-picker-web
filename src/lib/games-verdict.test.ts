import { describe, expect, it } from "vitest";
import { gamesVerdict } from "./games-verdict";
import type { PlayerRecord } from "./player-record";

const NAMES: Record<number, string> = { 114: "Monkey King", 8: "Juggernaut" };
const name = (id: number) => NAMES[id];
const record = (over: Partial<PlayerRecord> = {}): PlayerRecord => ({
  games: 24,
  wins: 14,
  parsed: 19,
  firstAt: "2026-10-28T10:00:00Z",
  lastAt: "2026-11-26T10:00:00Z",
  topHero: { id: 114, games: 7, wins: 5 },
  latest: [true, false, true, true, false, false, true],
  ...over,
});

describe("gamesVerdict", () => {
  it("says how many games were won and how many of those on the most played hero", () => {
    expect(gamesVerdict(record(), name)).toEqual({
      heroId: 114,
      title: "You Won 14 of 24 Games, 5 on Monkey King",
      facts: "24 games, 28 Oct to 26 Nov",
      line: "Monkey King is your most played hero, 5 wins in 7 games. You won 3 of the last 5, and 19 of the 24 games have full detail.",
    });
  });

  it("keeps the same sentence after a bad run, without a hero that won nothing", () => {
    const v = gamesVerdict(record({ wins: 9, topHero: { id: 114, games: 7, wins: 0 } }), name);
    expect(v.title).toBe("You Won 9 of 24 Games");
    expect(v.heroId).toBe(114);
    expect(v.line).toContain("Monkey King is your most played hero, 0 wins in 7 games.");
  });

  it("says All when every game was on one hero, and skips the newest five when they are every game", () => {
    const v = gamesVerdict(record({ games: 2, wins: 1, parsed: 2, topHero: { id: 114, games: 2, wins: 1 }, latest: [true, false] }), name);
    expect(v.title).toBe("You Won 1 of 2 Games, All on Monkey King");
    expect(v.line).toBe("All 2 games have full detail.");
  });

  it("names no most played hero when every hero was played once", () => {
    const v = gamesVerdict(record({ games: 6, wins: 4, parsed: 0, topHero: { id: 8, games: 1, wins: 1 } }), name);
    expect(v).toMatchObject({ heroId: null, title: "You Won 4 of 6 Games" });
    expect(v.line).toBe("You played 6 different heroes, one game each. You won 3 of the last 5, and none of the 6 games has full detail yet.");
  });

  it("writes one game as won or lost", () => {
    const one = { games: 1, parsed: 1, firstAt: "2026-11-26T10:00:00Z", topHero: { id: 8, games: 1, wins: 1 }, latest: [true] };
    expect(gamesVerdict(record({ ...one, wins: 1 }), name)).toEqual({
      heroId: 8,
      title: "You Won Your Only Game, on Juggernaut",
      facts: "1 game, 26 Nov",
      line: "The game has full detail.",
    });
    const lost = gamesVerdict(record({ ...one, wins: 0, parsed: 0, topHero: { id: 8, games: 1, wins: 0 }, latest: [false] }), name);
    expect(lost.title).toBe("You Lost Your Only Game, on Juggernaut");
    expect(lost.line).toBe("Its full detail is not read yet.");
  });

  it("leaves a hero without a name out of the title and the picture", () => {
    const v = gamesVerdict(record({ topHero: { id: 999, games: 7, wins: 5 } }), name);
    expect(v).toMatchObject({ heroId: null, title: "You Won 14 of 24 Games" });
    expect(v.line).toBe("You won 3 of the last 5, and 19 of the 24 games have full detail.");
  });

  it("says when no game is read yet, or none in the window", () => {
    const none = record({ games: 0, wins: 0, parsed: 0, firstAt: null, lastAt: null, topHero: null, latest: [] });
    expect(gamesVerdict(none, name)).toMatchObject({ heroId: null, title: "No Games Read Yet", facts: "Last 14 days" });
    expect(gamesVerdict({ ...none, latest: [true, false] }, name).title).toBe("No Games in the Last 14 Days");
  });

  it("falls back to what the page is when the record could not be read", () => {
    const v = gamesVerdict(null, name);
    expect(v.title).toBe("Your Ranked and Normal Games");
    expect(v.line).toMatch(/^What you do well and what costs you games/);
  });
});
