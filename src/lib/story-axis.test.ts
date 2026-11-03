import { describe, expect, it } from "vitest";
import type { Chapter } from "@/lib/engine/story";
import { MIN_GAP, axisPosition, minuteText, namedHeroes, spreadMarks, timelineLabel } from "./story-axis";

const chapter = (from: number, to: number | null): Chapter => ({ phase: `${from}`, from, to, ours: [], theirs: [], action: "", text: "" });
const FOUR = [chapter(0, 10), chapter(10, 20), chapter(20, 30), chapter(30, null)];

describe("axisPosition", () => {
  it("gives each chapter an equal column and spreads its minutes across it", () => {
    expect(axisPosition(FOUR, 0)).toBe(0);
    expect(axisPosition(FOUR, 15)).toBe(37.5);
    expect(axisPosition(FOUR, 30)).toBe(75);
    // The last chapter draws 15 minutes, then stops at the end.
    expect(axisPosition(FOUR, 45)).toBe(100);
    expect(axisPosition(FOUR, 60)).toBe(100);
  });

  it("puts a minute in a gap at the next chapter's start, and handles no chapters", () => {
    expect(axisPosition([chapter(0, 10), chapter(15, 25)], 12)).toBe(50);
    expect(axisPosition([], 12)).toBe(0);
  });
});

describe("spreadMarks", () => {
  const lefts = (xs: number[]) => spreadMarks(xs.map((left) => ({ left }))).map((m) => Math.round(m.left * 10) / 10);

  it("pushes close marks apart and keeps each one whole inside the axis", () => {
    expect(lefts([40, 42])).toEqual([40, 40 + MIN_GAP]);
    expect(lefts([0])).toEqual([MIN_GAP / 2]);
    expect(lefts([99, 100])).toEqual([100 - MIN_GAP * 1.5, 100 - MIN_GAP / 2]);
  });

  it("shrinks the gap when too many marks share a row", () => {
    const out = lefts(Array.from({ length: 12 }, () => 50));
    expect(out[0]).toBeGreaterThanOrEqual(MIN_GAP / 2);
    expect(out[11]).toBeLessThanOrEqual(100 - MIN_GAP / 2);
    expect(new Set(out).size).toBe(12);
  });
});

describe("namedHeroes", () => {
  it("finds whole names in the order the action names them", () => {
    expect(namedHeroes("Catch Lifestealer first, then Lina.", ["Lina", "Lifestealer", "Lion"])).toEqual(["Lifestealer", "Lina"]);
    expect(namedHeroes("Take towers before Hero 10's Radiance.", ["Hero 1", "Hero 10"])).toEqual(["Hero 10"]);
  });
});

describe("timeline text", () => {
  it("says around for a mixed build's minute, on screen and for screen readers", () => {
    expect(minuteText({ minute: 17, around: true })).toBe("~17");
    const story = { headline: "", ready: 24, chapters: [{ ...chapter(10, 20), theirs: [{ hero: "Lifestealer", item: "Radiance", minute: 17, around: true }] }] };
    expect(timelineLabel(story)).toBe("Item timings: their Lifestealer Radiance around 17, ready to fight at 24.");
  });
});
