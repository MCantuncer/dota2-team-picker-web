import { describe, expect, it } from "vitest";
import type { PositionFit } from "@/lib/engine/positions";
import { Engine } from "@/lib/engine/score";
import type { Snapshot } from "@/lib/engine/types";
import { perPlayerColumns } from "@/lib/per-player";
import { listRule, ownHeroes, PLAYED_MIN, playedHeroes, provenOutsider } from "@/lib/pick-explain";

const mid: PositionFit = { 1: 0.1, 2: 0.6, 3: 0.1, 4: 0.1, 5: 0.1 };
const support: PositionFit = { 1: 0, 2: 0.1, 3: 0, 4: 0.4, 5: 0.5 };

describe("playedHeroes", () => {
  it("takes heroes played often enough that are at home in the position, outside the pool", () => {
    // hero_stats keys arrive as strings from the database.
    const personal = { "10": { games: 12, wins: 7 }, "11": { games: 9, wins: 6 }, "12": { games: 30, wins: 15 }, "13": { games: 40, wins: 20 } } as never;
    const fit = (id: number) => (id === 12 ? support : mid);
    expect([...playedHeroes(personal, fit, 2, new Set([13]))]).toEqual([10]);
    expect(PLAYED_MIN).toBe(10);
  });

  it("skips broken records and works with none", () => {
    const personal = { "10": { games: "many" }, x: { games: 50, wins: 1 }, "11": null } as never;
    expect(playedHeroes(personal, () => mid, 2, new Set()).size).toBe(0);
    expect(playedHeroes(undefined, () => mid, 2, new Set()).size).toBe(0);
  });
});

describe("own heroes with played heroes", () => {
  const ranked = [10, 20, 30, 40, 50].map((heroId) => ({ heroId }));

  it("lists pool and played heroes together in score order, so Top 5 is a push and not a filter", () => {
    const picks = ownHeroes(ranked, new Set([40, 50]), { played: new Set([20]) });
    expect(picks.list.map((s) => s.heroId)).toEqual([20, 40, 50]);
    expect([...picks.played]).toEqual([20]);
    expect(picks.fromAll).toBeNull();
    expect(listRule(picks)).toBe("played");
  });

  it("names the rule each list was built by", () => {
    expect(listRule(ownHeroes(ranked, new Set([40])))).toBe("pool");
    expect(listRule(ownHeroes(ranked, new Set([99])))).toBe("any");
    // Played heroes alone fill a list for a player with no pool heroes for the position.
    const noPool = ownHeroes(ranked, new Set(), { played: new Set([30]) });
    expect(noPool.list.map((s) => s.heroId)).toEqual([30]);
    expect(listRule(noPool)).toBe("played");
  });

  it("finds the proven outsider among heroes neither in the pool, played nor listed", () => {
    const s = (heroId: number, score: number) => ({ heroId, name: `Hero ${heroId}`, score, error: 1 });
    const list = [s(10, 20), s(20, 19), s(30, 10)];
    const pool = new Set([30]);
    const picks = ownHeroes(list, pool, { played: new Set([10]) });
    // Hero 10 is played and listed, and 20 is not within reach of 10 by the margin.
    expect(provenOutsider(list, pool, picks)).toBeNull();
    const far = [s(10, 30), s(20, 12), s(30, 10)];
    const farPicks = ownHeroes(far, pool, { played: new Set([20]) });
    expect(provenOutsider(far, pool, farPicks)).toMatchObject({ pick: { heroId: 10 }, over: { heroId: 20 } });
  });
});

describe("Per Player with played heroes", () => {
  const hero = (id: number) => ({ id, name: `Hero ${id}`, roles: [], attackType: "Melee" as const, primaryAttr: "str" });
  const ids = Array.from({ length: 150 }, (_, i) => i + 1);
  const snapshot: Snapshot = {
    generatedAt: "2026-11-10T00:00:00Z",
    heroes: Object.fromEntries(ids.map((id) => [id, hero(id)])),
    bracketStats: Object.fromEntries(ids.map((id) => [id, { picks: Array(8).fill(1000), wins: Array(8).fill(400 + id) }])),
    matchups: {},
    synergy: {},
    // Every hero is a mid and an offlaner, so both columns can list any of them.
    laneRoles: Object.fromEntries(ids.map((id) => [id, { "2": 50, "3": 50 }])),
  };
  const engine = new Engine(snapshot);

  it("gives a played hero to the player who played it, not where it scores higher", () => {
    const cols = perPlayerColumns(engine, {
      // b lost most games on hero 150, so it scores higher for a, who never played it.
      personal: { b: { 150: { games: 20, wins: 5 } } },
      enemies: [],
      bans: [],
      slots: [
        { position: 2, playerId: "a", favorites: [5] },
        { position: 3, playerId: "b", favorites: [6] },
        { position: 1 },
        { position: 4 },
        { position: 5 },
      ],
    });
    const [a, b] = cols;
    expect(a!.suggestions.map((s) => s.heroId)).toEqual([5]);
    expect(b!.suggestions.map((s) => s.heroId)).toEqual([150, 6]);
    expect([...b!.played]).toEqual([150]);
  });
});
