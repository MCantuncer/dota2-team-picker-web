import { describe, expect, it } from "vitest";
import { poolFirst, rankMoves, reactingTo } from "./pick-explain";

describe("reactingTo", () => {
  it("says the list is a blind pick before anyone picks", () => {
    expect(reactingTo({ enemies: [], allies: [], bans: 0 })).toMatch(/^Blind pick: no heroes picked yet/);
    expect(reactingTo({ enemies: [], allies: [], bans: 5 })).toMatch(/5 bans counted\.$/);
  });

  it("names the heroes the list reacts to", () => {
    expect(reactingTo({ enemies: ["Axe", "Viper"], allies: ["Crystal Maiden"], bans: 1 })).toBe(
      "Reacting to Axe and Viper on the enemy team, Crystal Maiden on yours and 1 ban.",
    );
    expect(reactingTo({ enemies: [], allies: ["Juggernaut"], bans: 0 })).toBe("Reacting to Juggernaut on yours.");
  });
});

describe("rankMoves", () => {
  it("marks heroes that are new or moved up", () => {
    const moves = rankMoves([1, 2, 3, 4], [3, 1, 5, 2]);
    expect(Object.fromEntries(moves)).toEqual({ 3: "Up 2", 5: "New" });
  });

  it("marks nothing before there is a list to compare with", () => {
    expect(rankMoves(null, [1, 2]).size).toBe(0);
  });
});

describe("poolFirst", () => {
  const ranked = [10, 20, 30, 40, 50, 60].map((heroId) => ({ heroId }));

  it("puts the pool heroes first, then the best three outside the pool", () => {
    const { list, outside } = poolFirst(ranked, new Set([30, 60]));
    expect(list.map((s) => s.heroId)).toEqual([30, 60, 10, 20, 40]);
    expect([...outside]).toEqual([10, 20, 40]);
  });

  it("takes custom limits", () => {
    const { list } = poolFirst(ranked, new Set([30, 50, 60]), { poolMax: 2, outsideMax: 1 });
    expect(list.map((s) => s.heroId)).toEqual([30, 50, 10]);
  });

  it("ranks every hero together when the pool is empty", () => {
    const { list, outside } = poolFirst(ranked, new Set());
    expect(list.map((s) => s.heroId)).toEqual([10, 20, 30, 40, 50, 60]);
    expect(outside.size).toBe(0);
  });
});
