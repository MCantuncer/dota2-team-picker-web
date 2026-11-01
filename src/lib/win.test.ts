import { describe, expect, it } from "vitest";
import { Engine } from "@/lib/engine/score";
import type { Snapshot } from "@/lib/engine/types";
import { pickGain, teamWinChance } from "@/lib/win";

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
