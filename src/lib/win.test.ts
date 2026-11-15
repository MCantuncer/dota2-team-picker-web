import { describe, expect, it } from "vitest";
import { Engine } from "@/lib/engine/score";
import type { Snapshot } from "@/lib/engine/types";
import { draftEdge } from "@/lib/engine/win-chance";
import { draftWinRange, edgeParts, edgeRange, favoredSide, pickGain, teamWinChance } from "@/lib/win";

const hero = (id: number) => ({ id, name: `Hero ${id}`, roles: [], attackType: "Melee" as const, primaryAttr: "str" });
/** Hero 1 wins 60% of its games, heroes 2 and 3 win half. */
function snapshot(winModel?: Snapshot["winModel"]): Snapshot {
  const stats = (wins: number) => ({ picks: [1000, 0, 0, 0, 0, 0, 0, 0], wins: [wins, 0, 0, 0, 0, 0, 0, 0] });
  return {
    generatedAt: "2026-10-26T00:00:00Z",
    heroes: { 1: hero(1), 2: hero(2), 3: hero(3) },
    bracketStats: { 1: stats(600), 2: stats(500), 3: stats(500) },
    matchups: {},
    synergy: {},
    laneRoles: {},
    winModel,
  };
}
const model = { fittedAt: "2026-10-26T00:00:00Z", games: 5000, byKnown: { 2: { a: 0, b: 0.1 } } };

describe("teamWinChance", () => {
  it("is null without a checked model", () => {
    expect(teamWinChance(new Engine(snapshot()), [1], [2])).toBeNull();
  });

  it("is null before the model's first step", () => {
    expect(teamWinChance(new Engine(snapshot(model)), [1], [])).toBeNull();
  });

  it("favours the side with the stronger heroes", () => {
    expect(teamWinChance(new Engine(snapshot(model)), [1], [2])).toBeGreaterThan(0.5);
    expect(teamWinChance(new Engine(snapshot(model)), [2], [3])).toBeCloseTo(0.5);
  });
});

describe("pickGain", () => {
  it("is the change in points once both chances are known", () => {
    const engine = new Engine(snapshot(model));
    expect(pickGain(engine, 1, [3], [2])).toBeGreaterThan(0);
    expect(pickGain(engine, 1, [], [2])).toBeNull();
  });
});

describe("edgeParts", () => {
  it("splits the draft edge into win rates, matchups and synergy that add up to it", () => {
    const engine = new Engine(snapshot());
    const parts = edgeParts(engine, [1, 3], [2]);
    expect(parts.rates).toBeCloseTo((engine.winRate(1) + engine.winRate(3) - engine.winRate(2) - 0.5) * 100);
    expect(parts.rates).toBeGreaterThan(0);
    expect(parts.rates + parts.matchups + parts.synergy).toBeCloseTo(draftEdge(engine, [1, 3], [2]));
  });

  it("is all zero with nothing picked", () => {
    expect(edgeParts(new Engine(snapshot()), [], [])).toEqual({ rates: 0, matchups: 0, synergy: 0 });
  });
});

describe("favoredSide", () => {
  it("names the side ahead by half a point of edge, else an even draft", () => {
    expect(favoredSide(2.1, null)).toBe("ours");
    expect(favoredSide(-0.6, null)).toBe("theirs");
    expect(favoredSide(0.4, null)).toBe("even");
  });

  it("follows the win chance once there is one", () => {
    expect(favoredSide(5, 0.48)).toBe("theirs");
    expect(favoredSide(-5, 0.52)).toBe("ours");
    expect(favoredSide(3, 0.5)).toBe("even");
  });
});

describe("edgeRange", () => {
  it("rounds the largest value up to 5, never under the least", () => {
    expect(edgeRange([14.2, -23.8])).toBe(25);
    expect(edgeRange([3])).toBe(10);
    expect(edgeRange([1.2], 5)).toBe(5);
  });
});

describe("draftWinRange", () => {
  // Radiant edges under 0 won 45%, 0 and up won 60%.
  const winRange: Snapshot["winRange"] = {
    fittedAt: "2026-11-15T00:00:00Z",
    games: 40000,
    days: { from: "2026-10-27", to: "2026-11-14" },
    cuts: [0],
    bands: [
      { games: 20000, won: 0.45, low: 0.44, high: 0.46 },
      { games: 20000, won: 0.6, low: 0.59, high: 0.61 },
    ],
  };
  const engine = new Engine({ ...snapshot(), winRange });

  it("waits for all 10 heroes and a known side", () => {
    expect(draftWinRange(engine, 5, 9, "radiant")).toBeNull();
    expect(draftWinRange(engine, 5, 10, null)).toBeNull();
    expect(draftWinRange(new Engine(snapshot()), 5, 10, "radiant")).toBeNull();
  });

  it("reads Radiant's band as is", () => {
    expect(draftWinRange(engine, 5, 10, "radiant")).toEqual({ won: 0.6, low: 0.59, high: 0.61, games: 20000 });
  });

  it("on Dire, flips my edge to Radiant's and gives the other side of that band", () => {
    // My Dire team is 5 points ahead, so Radiant is 5 behind: Radiant won 45%, Dire 55%.
    expect(draftWinRange(engine, 5, 10, "dire")).toEqual({ won: 0.55, low: 0.54, high: 0.56, games: 20000 });
  });
});
