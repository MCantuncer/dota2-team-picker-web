import { describe, expect, it } from "vitest";
import type { HeroAbility, Snapshot } from "@/lib/engine/types";
import { metaLaneTactics } from "./meta-lane-tactics";

// Necrophos (36), Lina (25) and Pudge (14) with their 7.42 ability ids; no builds, so the even opening stands in.
const abilities: Record<number, [number, string, number, boolean?][]> = {
  36: [
    [5158, "necrolyte_death_pulse", 1],
    [1270, "necrolyte_ghost_shroud", 2],
    [5159, "necrolyte_heartstopper_aura", 3],
    [5161, "necrolyte_reapers_scythe", 6, true],
  ],
  25: [
    [5040, "lina_dragon_slave", 1],
    [5041, "lina_light_strike_array", 2],
    [5042, "lina_fiery_soul", 3],
    [5043, "lina_laguna_blade", 6, true],
  ],
  14: [
    [5075, "pudge_meat_hook", 1],
    [5076, "pudge_rot", 2],
    [5074, "pudge_flesh_heap", 3],
    [5077, "pudge_dismember", 6, true],
  ],
};

function snapshot(): Snapshot {
  const heroAbilities = Object.fromEntries(
    Object.entries(abilities).map(([id, list]) => [id, { abilities: list.map(([aid, key, slot, ultimate]): HeroAbility => ({ id: aid, key, name: key, slot, maxLevel: 0, ultimate: !!ultimate })), talents: [] }]),
  );
  return {
    heroAbilities,
    positions: { "36": [10, 900, 50, 5, 5], "25": [20, 800, 10, 100, 10], "14": [5, 50, 300, 400, 200] },
    // Necrophos meets Lina in more lanes than Pudge; a hero without abilities (99) gets no tactics.
    laneOutcomes: { "0": { "36": { "25": [2000, 600, 600, 800], "14": [900, 450, 200, 250], "99": [3000, 1000, 1000, 1000] } } },
  } as unknown as Snapshot;
}

describe("metaLaneTactics", () => {
  it("lists the enemies met most in lane that have tactics, with the hero's lane win rate against each", () => {
    const { pairs, won } = metaLaneTactics(snapshot(), 36, 2, (id) => `Hero ${id}`);
    expect(pairs.map((p) => p.enemy)).toEqual([25, 14]);
    expect(pairs[0]!.tactics[0]!.title).toContain("Hero 25");
    expect(won.get(25)).toBeCloseTo(0.3);
    expect(won.get(14)).toBeCloseTo(0.5);
    expect(won.has(99)).toBe(false);
  });

  it("is empty without lane results for the hero", () => {
    expect(metaLaneTactics(snapshot(), 25, 2, String).pairs).toEqual([]);
  });
});
