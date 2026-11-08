import { describe, expect, it } from "vitest";
import { daysAgo, fillNumbers, readTopAnswer, topByPosition, topError, topFirst } from "./top-heroes";

describe("readTopAnswer", () => {
  it("reads the position's Top 3", () => {
    expect(readTopAnswer({ position: 2, top: [74, 11] })).toEqual({ position: 2, top: [74, 11] });
    expect(readTopAnswer({ position: 2, top: [] })).toEqual({ position: 2, top: [] });
  });

  it("refuses anything else", () => {
    expect(readTopAnswer(null)).toBeNull();
    expect(readTopAnswer({ position: 0, top: [] })).toBeNull();
    expect(readTopAnswer({ position: 2, top: [1, 2, 3, 4] })).toBeNull();
    expect(readTopAnswer({ position: 2, top: ["74"] })).toBeNull();
  });
});

describe("topByPosition", () => {
  it("groups starred rows by position in slot order", () => {
    expect(
      topByPosition([
        { position: 2, hero_id: 74, top_slot: 2 },
        { position: 2, hero_id: 11, top_slot: 1 },
        { position: 2, hero_id: 13, top_slot: null },
        { position: 4, hero_id: 26, top_slot: 1 },
      ]),
    ).toEqual({ 2: [11, 74], 4: [26] });
  });
});

describe("topFirst", () => {
  it("puts the Top 3 first in slot order, then the rest as added", () => {
    expect(topFirst([1, 2, 3, 4, 5], [4, 2])).toEqual([4, 2, 1, 3, 5]);
  });

  it("ignores stars on heroes no longer listed", () => {
    expect(topFirst([1, 2], [9, 2])).toEqual([2, 1]);
  });
});

describe("topError", () => {
  it("maps the database's codes", () => {
    expect(topError("P0001")).toBe("full");
    expect(topError("23505")).toBe("busy");
    expect(topError("22023")).toBe("other");
    expect(topError(undefined)).toBe("other");
  });
});

describe("daysAgo", () => {
  const now = new Date("2026-11-07T12:00:00Z");
  it("counts whole days", () => {
    expect(daysAgo(new Date("2026-11-07T01:00:00Z"), now)).toBe("Today");
    expect(daysAgo(new Date("2026-11-06T11:00:00Z"), now)).toBe("1 day");
    expect(daysAgo(new Date("2026-10-31T12:00:00Z"), now)).toBe("7 days");
  });
});

describe("fillNumbers", () => {
  it("keys the numbers by position and hero and drops bad rows", () => {
    expect(
      fillNumbers([
        { position: 2, hero_id: 74, games: 58, wins: 22, last_played: "2026-10-31T12:00:00Z" },
        { position: 2, hero_id: 11, games: 4, wins: 5, last_played: "2026-10-31T12:00:00Z" },
      ]),
    ).toEqual({ "2:74": { games: 58, wins: 22, lastPlayed: "2026-10-31T12:00:00Z" } });
  });
});
