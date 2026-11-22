import { describe, expect, it } from "vitest";
import { buildGroups, buildPath, change, dayLabel, extrasItemIds, heroRates, isExtras, isMeta, MIN_GAMES, movers, patchDay, previousPatch, roleItems, roleLeaders, signed, sliceGames, type HeroRate, type MetaDay, type MetaExtras, type MetaFile } from "./meta";

/** A hero's day: `games` in every rank (all in rank group 3) with `wins`. */
const hero = (games: number, wins: number) => [games, wins, 0, 0, 0, 0, games, wins, 0, 0];

function day(index: number, heroes: Record<string, number[]>, games: number): MetaDay {
  const from = new Date(Date.parse("2026-11-18T21:28:07Z") + index * 86_400_000).toISOString();
  return { index, from, to: from, complete: true, games: [games, 0, 0, games, 0], heroes };
}

const META: MetaFile = {
  computedAt: "2026-11-21T14:00:00Z",
  patch: { name: "7.42", startedAt: "2026-11-18T21:28:07Z" },
  days: [
    day(0, { 32: hero(6000, 3400), 1: hero(3000, 1400), 5: hero(100, 60) }, 50_000),
    day(1, { 32: hero(6000, 3480), 1: hero(3000, 1450), 5: hero(100, 60) }, 50_000),
  ],
  base: [day(-1, { 32: hero(5000, 2650), 1: hero(5000, 2600) }, 100_000)],
  roles: { 32: [37, 25, 13, 14, 11], 1: [90, 5, 5, 0, 0] },
};

describe("isMeta", () => {
  it("accepts the published shape and refuses others", () => {
    expect(isMeta(META)).toBe(true);
    expect(isMeta({ ...META, days: [] })).toBe(false);
    expect(isMeta({ ...META, roles: undefined })).toBe(false);
    expect(isMeta({ ...META, days: [{ ...META.days[0], heroes: { 1: [1, 2] } }] })).toBe(false);
    expect(isMeta(null)).toBe(false);
  });
});

describe("heroRates", () => {
  const rates = heroRates(META, 0);
  const riki = rates.find((r) => r.id === 32)!;

  it("sums the patch's days into pick and win rates, with the patch before as base", () => {
    expect(riki.games).toBe(12_000);
    expect(riki.pick).toBeCloseTo(12);
    expect(riki.win).toBeCloseTo(57.3, 1);
    expect(riki.basePick).toBeCloseTo(5);
    expect(riki.baseWin).toBeCloseTo(53);
    expect(riki.days.map((d) => d?.toFixed(1))).toEqual(["56.7", "58.0"]);
    expect(riki.roles).toEqual([1, 2]);
  });

  it("leaves out heroes under MIN_GAMES and keeps no base under it", () => {
    expect(rates.map((r) => r.id).sort()).toEqual([1, 32]);
    const thin = heroRates({ ...META, base: [day(-1, { 32: hero(MIN_GAMES - 1, 900) }, 100_000)] }, 0).find((r) => r.id === 32)!;
    expect(thin.baseWin).toBeNull();
    expect(change(thin, "win")).toBeNull();
  });

  it("reads one rank group on its own", () => {
    expect(heroRates(META, 3).find((r) => r.id === 32)?.win).toBeCloseTo(57.3, 1);
    expect(heroRates(META, 1)).toEqual([]);
    expect(sliceGames(META, 0)).toBe(100_000);
  });
});

describe("movers", () => {
  it("splits heroes into the biggest rises and falls", () => {
    const { up, down } = movers(heroRates(META, 0), "win", 6);
    expect(up.map((h) => h.id)).toEqual([32]);
    expect(down.map((h) => h.id)).toEqual([1]);
    expect(movers(heroRates(META, 0), "pick", 1).up.map((h) => h.id)).toEqual([32]);
  });
});

describe("labels", () => {
  it("names the day by its middle and counts patch days from 1", () => {
    expect(dayLabel(META.days[0]!)).toBe("Nov 19");
    expect(patchDay(META, new Date("2026-11-21T14:00:00Z"))).toBe(3);
    expect(patchDay(META, new Date("2026-11-18T22:00:00Z"))).toBe(1);
  });

  it("finds the patch before from the name", () => {
    expect(previousPatch("7.42")).toBe("7.41");
    expect(previousPatch("7.10")).toBe("7.09");
    expect(previousPatch("7.00")).toBeNull();
    expect(previousPatch("7.41c")).toBeNull();
  });

  it("signs points with a true minus", () => {
    expect(signed(4.34)).toBe("+4.3");
    expect(signed(-2.06)).toBe("−2.1");
    expect(signed(0.01)).toBe("0.0");
  });
});

const EXTRAS: MetaExtras = {
  buildGames: 300,
  builds: { 32: { 0: { games: 100, items: [[1, 80], [63, 50], [36, 30], [116, 6]], neutral: [[947, 20]] } } },
  newItems: [{ id: 1942, games: 12, heroes: [[32, 8]] }],
  matchups: { 32: { best: [[17, 60.7, 3039]], worst: [[94, 42.4, 1108]] } },
  items: {},
};

describe("isExtras", () => {
  it("accepts the published shape and refuses others", () => {
    expect(isExtras(EXTRAS)).toBe(true);
    expect(isExtras({ ...EXTRAS, builds: { 32: { 0: { games: 1, items: [[1]], neutral: [] } } } })).toBe(false);
    expect(isExtras({ ...EXTRAS, matchups: { 32: { best: [[17, 60.7]], worst: [] } } })).toBe(false);
    expect(isExtras({ ...EXTRAS, items: undefined })).toBe(false);
  });
});

describe("buildGroups and extrasItemIds", () => {
  it("splits a build into core, common and situational items by share", () => {
    const groups = buildGroups(EXTRAS.builds[32]![0]!);
    expect(groups.map((g) => [g.name, g.items.map((i) => i.id)])).toEqual([
      ["Core", [1, 63]],
      ["Common", [36]],
      ["Situational", [116]],
    ]);
    expect(groups[0]!.items[0]!.share).toBe(80);
  });

  it("lists every item the extras show, neutral items too", () => {
    expect(extrasItemIds(EXTRAS).sort((a, b) => a - b)).toEqual([1, 36, 63, 116, 947, 1942]);
  });
});

describe("isExtras with patch notes and buy minutes", () => {
  it("accepts notes and minutes, and refuses a bad note", () => {
    const notes = { 32: { changes: 2, lines: [{ ability: "Hero", text: "Base Agility increased from 18 to 19", tone: 1 }] } };
    expect(isExtras({ ...EXTRAS, patchNotes: notes })).toBe(true);
    expect(isExtras({ ...EXTRAS, patchNotes: { 32: { changes: 1, lines: [{ ability: "Hero", text: "x", tone: 2 }] } } })).toBe(false);
    expect(isExtras({ ...EXTRAS, builds: { 32: { 2: { games: 50, items: [[1, 40]], neutral: [], buyGames: 12, minutes: [[1, 14]], early: [[36, 9]] } } } })).toBe(true);
  });
});

describe("roleLeaders", () => {
  const rate = (id: number, win: number, games: number, baseWin: number | null): HeroRate => ({
    id,
    games,
    pick: games / 1000,
    win,
    basePick: baseWin === null ? null : games / 1000,
    baseWin,
    days: [win],
    roles: [],
  });
  it("ranks a role's heroes by wins above even, winners first, and finds risers behind them", () => {
    const meta = { ...META, roles: {} as Record<string, number[]> };
    const rates: HeroRate[] = [];
    // Heroes 1 to 10 play mid; hero 11 plays mid in 35% of games but carry more, so it is not a mid.
    for (let id = 1; id <= 10; id++) {
      meta.roles[id] = [10, 80, 5, 5, 0];
      rates.push(rate(id, 47 + id, 10_000, 50));
    }
    meta.roles[11] = [60, 35, 5, 0, 0];
    rates.push(rate(11, 60, 50_000, 50));
    // Hero 12 loses but rose 6 points; hero 13 is too rare in the role.
    meta.roles[12] = [0, 90, 10, 0, 0];
    rates.push(rate(12, 48, 10_000, 42));
    meta.roles[13] = [0, 90, 10, 0, 0];
    rates.push(rate(13, 58, MIN_GAMES, 50));
    const out = roleLeaders(meta, rates, 2);
    expect(out.pool.map((h) => h.rate.id)).not.toContain(11);
    expect(out.pool.map((h) => h.rate.id)).not.toContain(13);
    expect(out.leaders.map((h) => h.rate.id)).toEqual([10, 9, 8, 7, 6, 5]);
    expect(out.leaders[0]!.extraWins).toBe(560);
    // Risers not in the top six: those winning at least 49% first.
    expect(out.dark.map((h) => h.rate.id)).toEqual([4, 12]);
  });
});

describe("buildPath", () => {
  const items = { 1: { cost: 2250 }, 63: { cost: 1400 }, 116: { cost: 4050 }, 36: { cost: 450 } } as unknown as MetaExtras["items"];
  it("puts core items in the order bought and keeps early items as shares of parsed games", () => {
    const path = buildPath({ games: 100, items: [[1, 80], [116, 30], [63, 90], [36, 50]], neutral: [], buyGames: 20, minutes: [[1, 14], [116, 9]], early: [[36, 10]] }, items);
    expect(path.core.map((c) => [c.id, c.minute])).toEqual([
      [116, 9],
      [1, 14],
    ]);
    expect(path.early).toEqual([{ id: 36, share: 50 }]);
  });

  it("orders core by share without minutes", () => {
    const path = buildPath({ games: 100, items: [[116, 30], [1, 80]], neutral: [] }, items);
    expect(path.core.map((c) => c.id)).toEqual([116, 1]);
    expect(path.early).toEqual([]);
  });
});

describe("roleItems", () => {
  const items = { 1: { cost: 4000 }, 2: { cost: 500 }, 3: { cost: 2500 }, 4: { cost: 300 } } as unknown as MetaExtras["items"];
  const extras = (builds: MetaExtras["builds"]): MetaExtras => ({ buildGames: 0, builds, newItems: [{ id: 4, games: 9, heroes: [] }], matchups: {}, items });
  it("adds up the role's heroes and keeps core and new items", () => {
    const out = roleItems(
      extras({
        10: { 2: { games: 60, items: [[1, 30], [2, 50], [4, 6]], neutral: [] } },
        11: { 2: { games: 40, items: [[1, 10], [3, 20]], neutral: [] }, 1: { games: 90, items: [[3, 90]], neutral: [] } },
        12: { 3: { games: 50, items: [[1, 50]], neutral: [] } },
      }),
      [10, 11, 12],
      2,
    );
    expect(out.games).toBe(100);
    expect(out.items).toEqual([
      { id: 1, share: 40, isNew: false },
      { id: 3, share: 20, isNew: false },
      { id: 4, share: 6, isNew: true },
    ]);
  });
  it("is empty with too few games", () => {
    expect(roleItems(extras({ 10: { 2: { games: 60, items: [[1, 30]], neutral: [] } } }), [10], 2).items).toEqual([]);
  });
  it("shows six when there are six to eleven", () => {
    const list: [number, number][] = [1, 3, 5, 6, 7, 8, 9, 10].map((id) => [id, 20]);
    const all = Object.fromEntries(list.map(([id]) => [id, { cost: 3000 }])) as unknown as MetaExtras["items"];
    const out = roleItems({ ...extras({ 10: { 2: { games: 100, items: list, neutral: [] } } }), items: all }, [10], 2);
    expect(out.items).toHaveLength(6);
  });
});
