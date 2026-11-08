import { describe, expect, it } from "vitest";
import { poolOnly, rankMoves, reactingTo, SAVED_SUGGESTIONS, toSaved } from "./pick-explain";

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

describe("poolOnly", () => {
  const ranked = [10, 20, 30, 40, 50, 60].map((heroId) => ({ heroId }));

  it("lists only the pool heroes, best first", () => {
    const { list, fromAll } = poolOnly(ranked, new Set([60, 30]));
    expect(list.map((s) => s.heroId)).toEqual([30, 60]);
    expect(fromAll).toBeNull();
  });

  it("takes a custom limit", () => {
    const { list } = poolOnly(ranked, new Set([30, 50, 60]), { max: 2 });
    expect(list.map((s) => s.heroId)).toEqual([30, 50]);
  });

  it("ranks every hero together when the pool is empty, and says so", () => {
    const { list, fromAll } = poolOnly(ranked, new Set(), { max: 4 });
    expect(list.map((s) => s.heroId)).toEqual([10, 20, 30, 40]);
    expect(fromAll).toBe("none");
  });

  it("ranks every hero together when every pool hero is taken, and says so", () => {
    const { list, fromAll } = poolOnly(ranked, new Set([99]), { max: 2 });
    expect(list.map((s) => s.heroId)).toEqual([10, 20]);
    expect(fromAll).toBe("used");
  });
});

describe("toSaved", () => {
  it("saves at most what the database allows, in the order shown", () => {
    const shown = Array.from({ length: 11 }, (_, i) => ({ heroId: i + 1, score: 10 - i / 3 }));
    const saved = toSaved(shown);
    expect(saved.heroes).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(saved.heroes).toHaveLength(SAVED_SUGGESTIONS);
    expect(saved.scores[1]).toBe(9.67);
  });
});
