import { describe, expect, it } from "vitest";
import type { DraftRead } from "./reader";
import { LOG_ROWS, logLine, WatchLog } from "./watch-log";

const names: Record<number, string> = { 5: "Crystal Maiden", 26: "Lion", 31: "Lich" };
const name = (id: number) => names[id] ?? `#${id}`;

describe("logLine", () => {
  it("names each slot's hero, a near miss with its score, or a dash", () => {
    const read: DraftRead = {
      radiant: [{ heroId: 5, unsure: false, best: { heroId: 5, score: 0.97 } }, { heroId: null, unsure: false, best: { heroId: 26, score: 0.4 } }],
      dire: [{ heroId: 26, unsure: false }, { heroId: null, unsure: true, best: { heroId: 31, score: 0.71 } }],
      bans: [],
    };
    expect(logLine(read, name)).toBe("Radiant: Crystal Maiden, -  |  Dire: Lion, ? Lich 0.71");
  });
});

describe("WatchLog", () => {
  it("keeps a row only when the line changes", () => {
    const log = new WatchLog<number>();
    expect(log.add(0, "a", () => 1)).toBe(true);
    expect(log.add(0.5, "a", () => 2)).toBe(false);
    expect(log.add(1, "b", () => 3)).toBe(true);
    expect(log.rows.map((r) => r.bar)).toEqual([1, 3]);
  });

  it("keeps only the latest rows", () => {
    const log = new WatchLog<number>();
    for (let i = 0; i < LOG_ROWS + 5; i++) log.add(i, `line ${i}`, () => i);
    expect(log.rows).toHaveLength(LOG_ROWS);
    expect(log.rows[0]!.bar).toBe(5);
  });
});
