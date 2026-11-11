import { describe, expect, it } from "vitest";
import {
  etaText,
  fillStatus,
  HEROES_PER_POSITION,
  nextRun,
  patchVersion,
  percent,
  readFill,
  REFRESH_HOURS,
  REFRESH_MINUTE,
  twoPathStatus,
} from "@/lib/admin-data-status";
import type { SkillBuildSlice, Snapshot } from "@/lib/engine/types";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const slice = (over: Partial<SkillBuildSlice>): SkillBuildSlice => ({ at: "2026-11-01T00:00:00Z", gameVersionId: 200, matches: 50, talents: [], ...over });
const timing = (games: number) => ({ all: { games, items: [] } });

describe("twoPathStatus", () => {
  it("counts slices with item paths for this patch, of every main position the refresh fetches", () => {
    // Snapshot fields under test only; the rest are unused.
    const snapshot = {
      heroes: { "1": {}, "2": {} },
      itemTimings: { "1": { "1": timing(500), "2": timing(80) }, "2": { "3": timing(300) }, "99": { "1": timing(10) } },
      skillBuilds: {
        "1": {
          // Done today, with a late path.
          "1": slice({ at: "2026-11-11T08:00:00Z", itemPaths: { "116": { late: 22, running: 30, onTime: 20, path: { games: 10, steps: [], keyLater: 3 } } } }),
          // Done a week ago, no key item passed.
          "2": slice({ itemPaths: {} }),
          // No longer a main position: never fetched again, so not counted.
          "5": slice({ gameVersionId: 199 }),
        },
        // Saved before item paths: due again.
        "2": { "3": slice({}) },
      },
    } as unknown as Pick<Snapshot, "heroes" | "skillBuilds" | "itemTimings">;
    expect(patchVersion(snapshot)).toBe(200);
    // Hero 99 is not in the hero list, so its timings don't count either.
    expect(twoPathStatus(snapshot, NOW)).toEqual({ done: 2, total: 3, lastDay: 1, withPath: 1 });
  });

  it("is empty with no data", () => {
    expect(twoPathStatus({ heroes: {} }, NOW)).toEqual({ done: 0, total: 0, lastDay: 0, withPath: 0 });
  });
});

describe("readFill", () => {
  const row = { hero_id: 8, position: 1, slices: 3, fresh: 2, last_day: 1, expiring: 0, last_fetched: "2026-11-11T10:00:00Z" };

  it("reads the rows", () => {
    expect(readFill([row])).toEqual([{ hero: 8, position: 1, slices: 3, fresh: 2, lastDay: 1, expiring: 0, lastFetched: "2026-11-11T10:00:00Z" }]);
    expect(readFill([])).toEqual([]);
  });

  it("returns null when any row is wrong, so the page shows an error instead of wrong numbers", () => {
    expect(readFill(null)).toBeNull();
    expect(readFill([row, { ...row, fresh: null }])).toBeNull();
    expect(readFill([{ ...row, last_day: undefined }])).toBeNull();
    expect(readFill([{ ...row, last_fetched: "soon" }])).toBeNull();
  });
});

describe("fillStatus", () => {
  // Heroes 1 to 12; at Pos 1 hero n has n * 10 games, so 12 down to 3 are the plan's ten.
  const heroes = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), {}]));
  const itemTimings = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), { "1": timing((i + 1) * 10) }]));
  // Snapshot fields under test only.
  const snapshot = { heroes, itemTimings } as unknown as Pick<Snapshot, "heroes" | "itemTimings">;
  const fill = (hero: number, fresh: number, lastDay: number, at = "2026-11-11T10:00:00Z", expiring = 0) => ({
    hero, position: 1, slices: fresh, fresh, lastDay, expiring, lastFetched: at,
  });

  it("plans the most played heroes of each position against every other hero", () => {
    const status = fillStatus(snapshot, [fill(12, 11, 5), fill(3, 4, 0, "2026-11-11T11:00:00Z"), fill(2, 11, 11)]);
    const pos1 = status.positions[0];
    expect(pos1?.heroes.map((h) => h.hero)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
    expect(pos1?.heroes.length).toBe(HEROES_PER_POSITION);
    // Hero 2 is outside the plan, so its rows don't count.
    expect(status).toMatchObject({ done: 15, total: 110, lastDay: 5, lastFetched: "2026-11-11T11:00:00Z" });
    expect(status.positions.slice(1).every((p) => p.total === 0)).toBe(true);
  });

  it("takes the ones going stale off the pace", () => {
    expect(fillStatus(snapshot, [fill(12, 11, 5, "2026-11-11T10:00:00Z", 3), fill(11, 6, 0, "2026-11-11T10:00:00Z", 4)])).toMatchObject({ done: 17, lastDay: -2 });
  });

  it("never counts more fresh enemies than there are", () => {
    expect(fillStatus(snapshot, [fill(12, 40, 40)])).toMatchObject({ done: 11, lastDay: 11 });
  });
});

describe("percent and etaText", () => {
  it("stays under 100 until done", () => {
    expect(percent({ done: 999, total: 1000 })).toBe(99);
    expect(percent({ done: 1000, total: 1000 })).toBe(100);
    expect(percent({ done: 0, total: 0 })).toBe(0);
    expect(percent({ done: 222, total: 295 })).toBe(75);
  });

  it("estimates the days left at the last day's pace", () => {
    expect(etaText({ done: 10, total: 10, lastDay: 0 })).toBe("Done");
    expect(etaText({ done: 0, total: 10, lastDay: 0 })).toBe("Not gaining at the last day's pace");
    expect(etaText({ done: 0, total: 10, lastDay: -3 })).toBe("Not gaining at the last day's pace");
    expect(etaText({ done: 0, total: 10, lastDay: 10 })).toBe("About a day left at this pace");
    expect(etaText({ done: 0, total: 25, lastDay: 10 })).toBe("About 3 days left at this pace");
  });
});

describe("nextRun", () => {
  it("finds the next scheduled time, tomorrow after the last one", () => {
    expect(new Date(nextRun(NOW, REFRESH_HOURS, REFRESH_MINUTE)).toISOString()).toBe("2026-11-11T14:17:00.000Z");
    expect(new Date(nextRun(Date.parse("2026-11-11T14:17:00Z"), REFRESH_HOURS, REFRESH_MINUTE)).toISOString()).toBe("2026-11-12T02:17:00.000Z");
  });
});
