import { describe, expect, it } from "vitest";
import type { SkillBuildSlice } from "@/lib/engine/types";
import { currentGameVersion, gamesByHero, matchupRequest, worthRetrying } from "@/lib/matchup-games";

const slice = (gameVersionId: number): SkillBuildSlice => ({ at: "2026-11-01T00:00:00Z", gameVersionId, matches: 50, talents: [] });
const snapshot = { skillBuilds: { 18: { 3: slice(183) }, 1: { 1: slice(184) } } };
const game = (match: number) => ({ match, account: match, won: true, level: 16, version: 184, points: [] });

describe("matchupRequest", () => {
  it("asks for our heroes by position, the enemies and the newest patch", () => {
    expect(currentGameVersion(snapshot)).toBe(184);
    expect(matchupRequest(snapshot, [1, 2, 3, 4, 5], [6, 7, 8, 9, 10])).toEqual({
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
  it("puts each hero's games against all enemies together", () => {
    const answer = { slices: [{ hero: 18, games: [game(1)] }, { hero: 18, games: [game(2)] }, { hero: 1, games: [] }] };
    expect(gamesByHero(answer)).toEqual({ 18: [game(1), game(2)], 1: [] });
  });
});

describe("worthRetrying", () => {
  it("asks again only when the pending games are being fetched", () => {
    expect(worthRetrying({ slices: [], pending: [{}], reasons: ["fetching-elsewhere"] })).toBe(true);
    expect(worthRetrying({ slices: [], pending: [{}], reasons: ["time"] })).toBe(true);
    expect(worthRetrying({ slices: [], pending: [{}], reasons: ["user-limit"] })).toBe(false);
    expect(worthRetrying({ slices: [], pending: [], reasons: ["time"] })).toBe(false);
  });
});
