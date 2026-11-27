import { describe, expect, it } from "vitest";
import type { Friend, SharedGame } from "./friends";
import { friendsVerdict } from "./friends-verdict";

const NAMES: Record<number, string> = { 74: "Invoker", 8: "Juggernaut" };
const name = (id: number) => NAMES[id];
const friend = (over: Partial<Friend> = {}): Friend => ({
  id: "f1",
  name: "Deniz",
  avatarUrl: null,
  rankTier: 63,
  positions: [],
  heroStats: {},
  shared: true,
  party: null,
  partySize: null,
  together: { games: 18, wins: 12 },
  without: { games: 25, wins: 13 },
  lastTogether: null,
  lastGame: null,
  ...over,
});
const game = (myHeroId: number, won: boolean, matchId = 1): SharedGame => ({ matchId, startedAt: "2026-11-20T10:00:00Z", gameMode: 22, lobbyType: 7, won, myHeroId, friendHeroId: 5 });

describe("friendsVerdict", () => {
  it("says how often you win with the open friend and the hero you win on most", () => {
    const games = [game(74, true), game(74, true), game(8, true), game(8, false), game(8, false)];
    expect(friendsVerdict(1, friend(), games, name)).toEqual({
      heroId: 74,
      title: "You Win 67% with Deniz, Best on Invoker",
      facts: "1 friend",
      line: "12 wins in 18 games together, against 52% in 25 games apart. On Invoker you won 2 of 2 with Deniz.",
    });
  });

  it("keeps the same sentence when the number is low, and names no hero without a win", () => {
    const v = friendsVerdict(4, friend({ together: { games: 5, wins: 0 }, without: { games: 0, wins: 0 } }), [game(8, false), game(74, false)], name);
    expect(v).toEqual({ heroId: null, title: "You Win 0% with Deniz", facts: "4 friends", line: "0 wins in 5 games together." });
  });

  it("breaks a tie on wins by the better win rate", () => {
    const games = [game(8, true), game(8, false), game(74, true)];
    expect(friendsVerdict(2, friend(), games, name).title).toBe("You Win 67% with Deniz, Best on Invoker");
  });

  it("names no hero it has no name for", () => {
    const v = friendsVerdict(1, friend(), [game(999, true)], name);
    expect(v).toMatchObject({ heroId: null, title: "You Win 67% with Deniz" });
  });

  it("says when you have no games with the friend, or no friends", () => {
    const v = friendsVerdict(2, friend({ together: { games: 0, wins: 0 } }), [], name);
    expect(v).toMatchObject({ heroId: null, title: "No Games with Deniz Yet", facts: "2 friends" });
    expect(friendsVerdict(0, null, [], name)).toMatchObject({ heroId: null, title: "No Friends Added Yet", facts: null });
  });
});
