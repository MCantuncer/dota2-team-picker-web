import { describe, expect, it } from "vitest";
import { Engine } from "@/lib/engine/score";
import type { Snapshot } from "@/lib/engine/types";
import { perPlayerColumns } from "@/lib/per-player";

const hero = (id: number) => ({ id, name: `Hero ${id}`, roles: [], attackType: "Melee" as const, primaryAttr: "str" });
const ids = Array.from({ length: 150 }, (_, i) => i + 1);
const snapshot: Snapshot = {
  generatedAt: "2026-11-03T00:00:00Z",
  heroes: Object.fromEntries(ids.map((id) => [id, hero(id)])),
  bracketStats: Object.fromEntries(ids.map((id) => [id, { picks: Array(8).fill(1000), wins: Array(8).fill(400 + id) }])),
  matchups: {},
  synergy: {},
  laneRoles: {},
};
const engine = new Engine(snapshot);
const base = { personal: {}, enemies: [], bans: [] };

describe("perPlayerColumns", () => {
  it("gives a column only to players who still have to pick", () => {
    const cols = perPlayerColumns(engine, {
      ...base,
      slots: [
        { position: 1, playerId: "a", heroId: 3 },
        { position: 2, playerId: "b", favorites: [5] },
        { position: 3 },
        { position: 4, playerId: "c" },
        { position: 5 },
      ],
    });
    expect(cols.map((c) => [c.playerId, c.position])).toEqual([
      ["b", 2],
      ["c", 4],
    ]);
  });

  it("never suggests the same hero to two players, and a pool hero goes to its owner", () => {
    const cols = perPlayerColumns(engine, {
      ...base,
      slots: [
        { position: 1, playerId: "a", favorites: [140] },
        { position: 2, playerId: "b", favorites: [130] },
        { position: 3 },
        { position: 4 },
        { position: 5 },
      ],
    });
    const [a, b] = cols;
    const shown = cols.flatMap((c) => c.suggestions.map((s) => s.heroId));
    expect(new Set(shown).size).toBe(shown.length);
    expect(a!.suggestions[0]!.heroId).toBe(140);
    expect(b!.suggestions[0]!.heroId).toBe(130);
    expect(b!.suggestions.some((s) => s.heroId === 140)).toBe(false);
    expect(b!.outside.has(130)).toBe(false);
  });

  it("leaves out heroes already in the draft", () => {
    const cols = perPlayerColumns(engine, {
      ...base,
      enemies: [20],
      bans: [19],
      slots: [{ position: 1, playerId: "a", heroId: 18 }, { position: 2, playerId: "b" }, { position: 3 }, { position: 4 }, { position: 5 }],
    });
    const shown = cols[0]!.suggestions.map((s) => s.heroId);
    expect(shown).not.toContain(18);
    expect(shown).not.toContain(19);
    expect(shown).not.toContain(20);
  });
});
