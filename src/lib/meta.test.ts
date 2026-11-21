import { describe, expect, it } from "vitest";
import { change, dayLabel, heroRates, isMeta, MIN_GAMES, movers, patchDay, previousPatch, signed, sliceGames, type MetaDay, type MetaFile } from "./meta";

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
