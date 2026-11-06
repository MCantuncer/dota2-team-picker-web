import { describe, expect, it } from "vitest";
import { bestPair, gameModeName, signatureHeroes, sortFriends, winPercent, type Friend, type SharedGame } from "./friends";

const friend = (over: Partial<Friend> = {}): Friend => ({
  id: "f1",
  name: "Deniz",
  avatarUrl: null,
  rankTier: 75,
  positions: [1],
  heroStats: {},
  shared: true,
  party: null,
  partySize: null,
  together: { games: 0, wins: 0 },
  without: { games: 0, wins: 0 },
  lastTogether: null,
  lastGame: null,
  ...over,
});

const game = (myHeroId: number, friendHeroId: number, won: boolean, matchId = Math.random()): SharedGame => ({
  matchId,
  startedAt: "2026-11-06T12:00:00Z",
  gameMode: 22,
  lobbyType: 7,
  won,
  myHeroId,
  friendHeroId,
});

describe("sortFriends", () => {
  it("puts the friend you played with last first, then the rest by name", () => {
    const sorted = sortFriends([
      friend({ id: "a", name: "Zed" }),
      friend({ id: "b", name: "Emre", lastTogether: "2026-11-01T10:00:00Z" }),
      friend({ id: "c", name: "Ali" }),
      friend({ id: "d", name: "Mert", lastTogether: "2026-11-05T10:00:00Z" }),
    ]);
    expect(sorted.map((f) => f.name)).toEqual(["Mert", "Emre", "Ali", "Zed"]);
  });
});

describe("winPercent", () => {
  it("rounds to a whole percent and has nothing to say without games", () => {
    expect(winPercent({ games: 3, wins: 2 })).toBe(67);
    expect(winPercent({ games: 0, wins: 0 })).toBeNull();
  });
});

describe("signatureHeroes", () => {
  it("uses a sharing friend's own records, most played first, three at most", () => {
    const f = friend({ heroStats: { 8: { games: 48, wins: 27 }, 44: { games: 31, wins: 18 }, 18: { games: 22, wins: 11 }, 2: { games: 5, wins: 5 } } });
    expect(signatureHeroes(f, []).map((r) => r.heroId)).toEqual([8, 44, 18]);
  });

  it("falls back to the heroes they played with you when they don't share", () => {
    const f = friend({ shared: false, heroStats: {} });
    const heroes = signatureHeroes(f, [game(74, 128, true), game(13, 128, false), game(74, 27, true)]);
    expect(heroes).toEqual([
      { heroId: 128, games: 2, wins: 1 },
      { heroId: 27, games: 1, wins: 1 },
    ]);
  });
});

describe("bestPair", () => {
  it("picks the pair that won most often, from at least three games", () => {
    const games = [
      ...[true, true, true, true, false].map((w) => game(74, 8, w)),
      ...[true, true, true].map((w) => game(13, 44, w)),
      game(17, 18, true),
    ];
    expect(bestPair(games)).toEqual({ myHeroId: 13, friendHeroId: 44, games: 3, wins: 3 });
  });

  it("prefers more games when the win rate ties", () => {
    const games = [...[true, true, true, true].map((w) => game(74, 8, w)), ...[true, true, true].map((w) => game(13, 44, w))];
    expect(bestPair(games)?.games).toBe(4);
  });

  it("has no pair before three games on the same heroes", () => {
    expect(bestPair([game(74, 8, true), game(74, 8, true)])).toBeNull();
  });
});

describe("gameModeName", () => {
  it("names modes the way the client does", () => {
    expect(gameModeName(22, 7)).toBe("Ranked All Pick");
    expect(gameModeName(22, 0)).toBe("All Pick");
    expect(gameModeName(23, 0)).toBe("Turbo");
    expect(gameModeName(99, 0)).toBe("Custom Game");
  });
});
