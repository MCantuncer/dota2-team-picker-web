import { describe, expect, it } from "vitest";
import { Engine } from "@/lib/engine/score";
import type { Snapshot } from "@/lib/engine/types";
import { ownHeroes, RISK_MATCHUP, riskHere, weakHere } from "./pick-explain";

const card = (heroId: number, score: number) => ({ heroId, score });

describe("weakHere", () => {
  it("flags a score below 0 and nothing else", () => {
    expect(weakHere(card(1, -0.1))).toBe(true);
    expect(weakHere(card(1, 0))).toBe(false);
    // Seen live on 2026-11-11: a hero at +15.9, 2nd of 34 for its position, was called weak for one bad matchup.
    expect(weakHere(card(1, 15.9))).toBe(false);
  });
});

describe("ownHeroes with weak pool heroes", () => {
  // Best first, as the engine returns them.
  const ranked = [card(10, 14.5), card(20, 14), card(30, 13.6), card(40, 6), card(50, 2), card(94, -3.4)];

  it("keeps a weak pool hero in its place by score, with a label, and never adds a hero from outside the pool", () => {
    const { list, weak: marked } = ownHeroes(ranked, new Set([94, 50]), { weak: weakHere });
    expect(list.map((s) => s.heroId)).toEqual([50, 94]);
    expect([...marked]).toEqual([94]);
  });

  it("marks no pool hero whose score is 0 or more", () => {
    const { list, weak: marked } = ownHeroes(ranked, new Set([10, 40]), { weak: weakHere });
    expect(list.map((s) => s.heroId)).toEqual([10, 40]);
    expect(marked.size).toBe(0);
  });

  it("lists a pool where every hero is weak, best first", () => {
    const { list, weak: marked, fromAll } = ownHeroes(ranked, new Set([94, 50, 40]), { weak: () => true });
    expect(list.map((s) => s.heroId)).toEqual([40, 50, 94]);
    expect(marked.size).toBe(3);
    expect(fromAll).toBeNull();
  });
});

describe("riskHere", () => {
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

  const none = { heroId: 1, hardCounters: [] };

  it("is null with no enemies", () => {
    expect(riskHere(engine, none, [], 1)).toBeNull();
  });

  it("names the enemy of the worst matchup once it is RISK_MATCHUP or worse", () => {
    const risk = riskHere(engine, none, [2], 1);
    expect(risk).toMatchObject({ heroId: 2, isHardCounter: false });
    expect(risk!.points).toBeLessThanOrEqual(RISK_MATCHUP);
  });

  it("is null when no enemy is that bad", () => {
    expect(riskHere(engine, { heroId: 2, hardCounters: [] }, [1], 1)).toBeNull();
  });

  it("names a hard counter on the enemy team first, and ignores one that is still open", () => {
    const listed = new Engine(data, { hardCounters: [{ hero: 2, counter: 1, gap: 6, names: "Hero 2 < Hero 1" }] });
    const onEnemy = { heroId: 2, hardCounters: [{ counterId: 1, status: "enemy" }] };
    expect(riskHere(listed, onEnemy, [1], 1)).toEqual({ heroId: 1, points: -6, isHardCounter: true });
    const open = { heroId: 2, hardCounters: [{ counterId: 1, status: "open" }] };
    expect(riskHere(engine, open, [], 1)).toBeNull();
  });
});
