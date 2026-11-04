import { describe, expect, it } from "vitest";
import { Engine } from "@/lib/engine/score";
import type { Snapshot } from "@/lib/engine/types";
import { finishedDraftPlan } from "@/lib/game-plan";

const hero = (id: number) => ({ id, name: `Hero ${id}`, roles: [], attackType: "Melee" as const, primaryAttr: "str" });
const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const snapshot: Snapshot = {
  generatedAt: "2026-10-26T00:00:00Z",
  heroes: Object.fromEntries(ids.map((id) => [id, hero(id)])),
  bracketStats: Object.fromEntries(ids.map((id) => [id, { picks: Array(8).fill(100), wins: Array(8).fill(50) }])),
  matchups: {},
  synergy: {},
  laneRoles: {},
};

describe("finishedDraftPlan", () => {
  it("is null until all ten heroes are in", () => {
    const engine = new Engine(snapshot);
    expect(finishedDraftPlan(engine, [1, 2, 3, 4, null], [6, 7, 8, 9, 10])).toBeNull();
    expect(finishedDraftPlan(engine, [1, 2, 3, 4, 5], [6, 7, 8, 9])).toBeNull();
  });

  it("plans the game with our picks in position order", () => {
    const plan = finishedDraftPlan(new Engine(snapshot), [1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
    expect(plan?.players.map((p) => [p.heroId, p.position])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ]);
    expect(plan?.roadmap).toHaveLength(3);
  });
});
