import { describe, expect, it } from "vitest";
import { Engine } from "@/lib/engine/score";
import { POSITIONS, type GamesWins, type Position, type RankBracket, type Snapshot } from "@/lib/engine/types";
import { perPlayerColumns } from "@/lib/per-player";
import { OUTSIDER_Z, ownHeroes, provenOutsider, weakHere, worstMatchup } from "@/lib/pick-explain";

/**
 * The pool rule on many random drafts: a list built from a player's pool holds only pool heroes, in
 * score order, and every pool hero still open is listed while there is room. Today's live data showed
 * outside heroes in every list (2026-11-08), so this checks the rule itself on noisy random numbers,
 * where pool heroes are often weak in the draft.
 */

/** A small seeded random generator, so a failure always comes back the same. */
function random(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const HEROES = 120;
const ids = Array.from({ length: HEROES }, (_, i) => i + 1);

function randomSnapshot(rnd: () => number): Snapshot {
  const gw = (games: number, rate: number): GamesWins => ({ games, wins: Math.round(games * rate) });
  const matchups: Snapshot["matchups"] = {};
  const synergy: Snapshot["synergy"] = {};
  for (const a of ids) {
    matchups[a] = {};
    for (const b of ids) {
      if (a === b) continue;
      // Few games and wide swings, so pool heroes are often weak against someone.
      matchups[a]![b] = gw(50 + Math.floor(rnd() * 2000), 0.4 + rnd() * 0.2);
      if (a < b) synergy[`${a}-${b}`] = gw(50 + Math.floor(rnd() * 2000), 0.42 + rnd() * 0.16);
    }
  }
  return {
    generatedAt: "2026-11-08T00:00:00Z",
    heroes: Object.fromEntries(
      ids.map((id) => [id, { id, name: `Hero ${id}`, roles: rnd() < 0.3 ? ["Support"] : ["Carry"], attackType: "Melee" as const, primaryAttr: "str" }]),
    ),
    bracketStats: Object.fromEntries(
      ids.map((id) => {
        const rate = 0.46 + rnd() * 0.08;
        const picks = Array.from({ length: 8 }, () => 500 + Math.floor(rnd() * 5000));
        return [id, { picks, wins: picks.map((p) => Math.round(p * rate)) }];
      }),
    ),
    matchups,
    synergy,
    laneRoles: Object.fromEntries(ids.map((id) => [id, { "1": rnd() * 100, "2": rnd() * 100, "3": rnd() * 100, "4": rnd() * 30 }])),
  };
}

const rnd = random(20261108);
const engine = new Engine(randomSnapshot(rnd));
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;

/** A random draft: up to 4 allies with positions, up to 5 enemies, up to 4 bans, all different heroes. */
function randomDraft() {
  const shuffled = [...ids].sort(() => rnd() - 0.5);
  const allyCount = Math.floor(rnd() * 5);
  const positions = [...POSITIONS].sort(() => rnd() - 0.5);
  const allies = shuffled.slice(0, allyCount).map((heroId, i) => ({ heroId, position: positions[i]! }));
  const enemies = shuffled.slice(allyCount, allyCount + Math.floor(rnd() * 6));
  const bans = shuffled.slice(allyCount + enemies.length, allyCount + enemies.length + Math.floor(rnd() * 5));
  const open = POSITIONS.filter((p) => !allies.some((a) => a.position === p));
  return { allies, enemies, bans, open, rankBracket: pick([1, 2, 3, 4, 5, 6, 7, 8]) as RankBracket };
}

/** A random pool of 0 to 10 heroes; some of them may already be in the draft. */
const randomPool = () => [...ids].sort(() => rnd() - 0.5).slice(0, Math.floor(rnd() * 11));

// Hundreds of full engine rankings: about 2 s alone, but CI runs them with coverage next to other
// test files, which passed the 5 s default on 2026-11-08.
describe("pool-only lists on random drafts", { timeout: 30_000 }, () => {
  it("My Picks lists only pool heroes, in score order, and every open one while there is room", () => {
    let outsiders = 0;
    for (let n = 0; n < 300; n++) {
      const draft = randomDraft();
      const myPosition = pick(draft.open) as Position;
      const pool = randomPool();
      const ranked = engine.suggest({ ...draft, myPosition, favorites: pool, count: engine.heroes.length });
      const picks = ownHeroes(ranked, new Set(pool), {
        weak: (s) => weakHere(s, worstMatchup(engine, s.heroId, draft.enemies, myPosition, draft.rankBracket)),
      });
      const { list, weak, fromAll } = picks;
      const outsider = provenOutsider(ranked, new Set(pool), picks);
      if (outsider) {
        outsiders++;
        // One hero, the best from outside the pool, and only past the margin over the pool's best.
        expect(fromAll).toBeNull();
        expect(pool).not.toContain(outsider.pick.heroId);
        expect(outsider.pick).toBe(ranked.find((s) => !pool.includes(s.heroId)));
        expect(outsider.over).toBe(list[0]);
        expect(outsider.pick.score - list[0]!.score).toBeGreaterThan(OUTSIDER_Z * Math.hypot(outsider.pick.error, list[0]!.error));
      }
      const taken = new Set([...draft.allies.map((a) => a.heroId), ...draft.enemies, ...draft.bans]);
      const open = pool.filter((id) => !taken.has(id));

      expect(fromAll).toBe(pool.length === 0 ? "none" : open.length === 0 ? "used" : null);
      const scores = list.map((s) => s.score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
      if (fromAll === null) {
        for (const s of list) expect(pool).toContain(s.heroId);
        expect(list).toHaveLength(Math.min(8, open.length));
        for (const id of weak) expect(list.map((s) => s.heroId)).toContain(id);
      } else {
        expect(list).toHaveLength(8);
        expect(weak.size).toBe(0);
      }
    }
    // The rule is tested, not skipped: some random drafts have a proven outsider, most do not.
    expect(outsiders).toBeGreaterThan(0);
    expect(outsiders).toBeLessThan(300);
  });

  it("Per Player lists each player's own heroes only, and never the same hero twice", () => {
    for (let n = 0; n < 60; n++) {
      const draft = randomDraft();
      const slots = POSITIONS.map((position) => {
        const ally = draft.allies.find((a) => a.position === position);
        return ally ? { position, playerId: `p${position}`, heroId: ally.heroId } : { position, playerId: `p${position}`, favorites: randomPool() };
      });
      const cols = perPlayerColumns(engine, { slots, personal: {}, enemies: draft.enemies, bans: draft.bans, rankBracket: draft.rankBracket });
      // An outside hero shown under one column is in no other column either.
      const shown = cols.flatMap((c) => [...c.suggestions.map((s) => s.heroId), ...(c.outsider ? [c.outsider.pick.heroId] : [])]);
      expect(new Set(shown).size).toBe(shown.length);
      for (const c of cols) {
        const pool = slots.find((s) => s.position === c.position)!.favorites ?? [];
        if (c.fromAll === null) for (const s of c.suggestions) expect(pool).toContain(s.heroId);
        else expect(c.fromAll).toBe(pool.length ? "used" : "none");
        if (c.outsider) {
          expect(c.fromAll).toBeNull();
          expect(pool).not.toContain(c.outsider.pick.heroId);
          expect(c.outsider.gap).toBeGreaterThan(c.outsider.margin);
        }
      }
    }
  });
});
