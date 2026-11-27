import { describe, expect, it } from "vitest";
import type { Chapter } from "@/lib/engine/story";
import { afterLane, minuteText, namedHeroes, rulerAt, rulerSpan, rulerStep, timelineLabel } from "./story-axis";

const chapter = (from: number, to: number | null): Chapter => ({ phase: `${from}`, from, to, ours: [], theirs: [], action: "", text: "" });

describe("the Race Rows ruler", () => {
  it("zooms to the marks: three minutes before the first, never before the lane ends, two after the last", () => {
    expect(rulerSpan([15, 17, 18, 18, 20])).toEqual({ from: 12, to: 22 });
    expect(rulerSpan([11, 19])).toEqual({ from: 10, to: 21 });
    // One lone item still gets a ruler of eight minutes.
    expect(rulerSpan([25])).toEqual({ from: 22, to: 30 });
    expect(rulerSpan([])).toEqual({ from: 10, to: 18 });
  });

  it("puts every minute on its real place, kept inside", () => {
    const span = { from: 12, to: 22 };
    expect(rulerAt(span, 12)).toBe(0);
    expect(rulerAt(span, 17)).toBe(0.5);
    expect(rulerAt(span, 18)).toBeCloseTo(0.6);
    expect(rulerAt(span, 40)).toBe(1);
  });

  it("spaces the numbers so they never touch, and a phone keeps only numbers the wide ruler shows", () => {
    for (const minutes of [6, 10, 16, 20, 30, 40]) {
      const span = { from: 10, to: 10 + minutes };
      expect(rulerStep(span, true) % rulerStep(span)).toBe(0);
    }
    expect(rulerStep({ from: 12, to: 22 })).toBe(1);
    expect(rulerStep({ from: 12, to: 22 }, true)).toBe(2);
    expect(rulerStep({ from: 10, to: 40 })).toBe(2);
    expect(rulerStep({ from: 10, to: 45 })).toBe(5);
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

describe("afterLane", () => {
  it("leaves the lane chapter out and keeps the rest of the story", () => {
    const story = { headline: "Fight from 15 min.", ready: 15, chapters: [chapter(0, 10), chapter(10, 20), chapter(30, null)] };
    const after = afterLane(story);
    expect(after.chapters.map((c) => c.from)).toEqual([10, 30]);
    expect(after.ready).toBe(15);
    expect(story.chapters).toHaveLength(3);
  });
});
