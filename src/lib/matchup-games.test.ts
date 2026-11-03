import { describe, expect, it } from "vitest";
import type { SkillBuildSlice } from "@/lib/engine/types";
import { gamesByHero, matchupRequest, worthRetrying } from "@/lib/matchup-games";

const slice = (gameVersionId: number): SkillBuildSlice => ({ at: "2026-11-01T00:00:00Z", gameVersionId, matches: 50, talents: [] });
const snapshot = { skillBuilds: { 18: { 3: slice(183) }, 1: { 1: slice(184) } } };
const game = (match: number) => ({ match, account: match, won: true, level: 16, version: 184, points: [] });

describe("matchupRequest", () => {
  it("asks for our heroes by position, the enemies sorted, and the newest patch", () => {
    expect(matchupRequest(snapshot, [1, 2, 3, 4, 5], [10, 6, 8, 7, 9])).toEqual({
      ours: [1, 2, 3, 4, 5].map((hero, i) => ({ hero, position: i + 1 })),
      theirs: [6, 7, 8, 9, 10],
      version: 184,
    });
  });

  it("is null until the draft is finished, and without skill builds", () => {
    expect(matchupRequest(snapshot, [1, 2, 3, 4, null], [6, 7, 8, 9, 10])).toBeNull();
    expect(matchupRequest(snapshot, [1, 2, 3, 4, 5], [6, 7, 8, 9])).toBeNull();
    expect(matchupRequest({}, [1, 2, 3, 4, 5], [6, 7, 8, 9, 10])).toBeNull();
  });
});

describe("gamesByHero", () => {
  const request = matchupRequest(snapshot, [18, 1, 2, 3, 4], [6, 7, 8, 9, 10]);
  if (!request) throw new Error("Expected a request");

  it("puts each hero's games against all enemies together, and gives heroes with no games none", () => {
    const answer = { slices: [{ hero: 18, games: [game(1)] }, { hero: 18, games: [game(2)] }, { hero: 1, games: [] }] };
    expect(gamesByHero(request, answer)).toEqual({ 18: [game(1), game(2)], 1: [], 2: [], 3: [], 4: [] });
  });

  it("gives a hero with a pending slice null, not the games of only some enemies", () => {
    const answer = { slices: [{ hero: 18, games: [game(1)] }], pending: [{ hero: 18 }, { hero: 2 }] };
    expect(gamesByHero(request, answer)).toMatchObject({ 18: null, 2: null, 1: [] });
  });
});

describe("worthRetrying", () => {
  it("asks again only when a teammate is fetching the pending games", () => {
    expect(worthRetrying({ slices: [], pending: [{ hero: 1 }], reasons: ["fetching-elsewhere"] })).toBe(true);
    expect(worthRetrying({ slices: [], pending: [{ hero: 1 }], reasons: ["time"] })).toBe(false);
    expect(worthRetrying({ slices: [], pending: [{ hero: 1 }], reasons: ["user-limit"] })).toBe(false);
    expect(worthRetrying({ slices: [], pending: [], reasons: ["fetching-elsewhere"] })).toBe(false);
  });
});
