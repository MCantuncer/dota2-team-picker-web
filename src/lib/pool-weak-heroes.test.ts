import { describe, expect, it } from "vitest";
import { Engine } from "@/lib/engine/score";
import type { Snapshot } from "@/lib/engine/types";
import { ownHeroes, WEAK_MATCHUP, weakHere, worstMatchup } from "./pick-explain";

const card = (heroId: number, score: number, enemyCounter = false) => ({
  heroId,
  score,
  hardCounters: enemyCounter ? [{ status: "enemy" }] : [],
});

describe("weakHere", () => {
  it("flags a score below 0, a hard counter on the enemy team, or one bad matchup", () => {
    expect(weakHere(card(1, -0.1), 0)).toBe(true);
    expect(weakHere(card(1, 5, true), 0)).toBe(true);
    expect(weakHere(card(1, 5), WEAK_MATCHUP)).toBe(true);
    expect(weakHere(card(1, 5), -1.4)).toBe(false);
  });
});

describe("ownHeroes with weak pool heroes", () => {
  // Best first, as the engine returns them.
  const ranked = [card(10, 14.5), card(20, 14), card(30, 13.6), card(40, 6), card(50, 2), card(94, -3.4)];

  it("keeps a weak pool hero in its place by score, with a label, and never adds a hero from outside the pool", () => {
    const weak = (s: (typeof ranked)[number]) => weakHere(s, 0);
    const { list, weak: marked } = ownHeroes(ranked, new Set([94, 50]), { weak });
    expect(list.map((s) => s.heroId)).toEqual([50, 94]);
    expect([...marked]).toEqual([94]);
  });

  it("marks a pool hero on one bad matchup alone", () => {
    const worst = new Map([[40, -2]]);
    const weak = (s: (typeof ranked)[number]) => weakHere(s, worst.get(s.heroId) ?? 0);
    const { list, weak: marked } = ownHeroes(ranked, new Set([10, 40]), { weak });
    expect(list.map((s) => s.heroId)).toEqual([10, 40]);
    expect([...marked]).toEqual([40]);
  });

  it("lists a pool where every hero is weak, best first", () => {
    const { list, weak: marked, fromAll } = ownHeroes(ranked, new Set([94, 50, 40]), { weak: () => true });
    expect(list.map((s) => s.heroId)).toEqual([40, 50, 94]);
    expect(marked.size).toBe(3);
    expect(fromAll).toBeNull();
  });
});

describe("worstMatchup", () => {
  const hero = (id: number) => ({ id, name: `Hero ${id}`, roles: [], attackType: "Melee" as const, primaryAttr: "agi" });
  const even = { picks: [1000, 0, 0, 0, 0, 0, 0, 0], wins: [500, 0, 0, 0, 0, 0, 0, 0] };
  const data: Snapshot = {
    generatedAt: "2026-11-03T00:00:00Z",
    heroes: { 1: hero(1), 2: hero(2) },
    bracketStats: { 1: even, 2: even },
    // Hero 1 loses to hero 2 clearly.
    matchups: { 1: { 2: { games: 2000, wins: 800 } }, 2: { 1: { games: 2000, wins: 1200 } } },
    synergy: {},
    laneRoles: {},
  };
  const engine = new Engine(data);

  it("is 0 with no enemies", () => {
    expect(worstMatchup(engine, 1, [], 1)).toBe(0);
  });

  it("is the worst matchup's points against the enemies picked", () => {
    expect(worstMatchup(engine, 1, [2], 1)).toBeLessThan(WEAK_MATCHUP);
    expect(worstMatchup(engine, 2, [1], 1)).toBe(0);
  });
});
