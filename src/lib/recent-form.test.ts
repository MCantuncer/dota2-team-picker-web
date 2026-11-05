import { describe, expect, it } from "vitest";
import { recentForm } from "./recent-form";

const games = (results: string) =>
  [...results].map((r, i) => ({ is_win: r === "W", started_at: new Date(Date.UTC(2026, 10, 4) - i * 3600_000).toISOString() }));

describe("recentForm", () => {
  it("keeps the newest 20, newest first, and says what changed", () => {
    const form = recentForm(games("LLWLLWLLLLWWWWWWWWWWWW").reverse())!;
    expect(form.results.length).toBe(20);
    expect(form.wins).toBe(12);
    expect(form.results.slice(0, 3)).toEqual([false, false, true]);
    expect(form.note).toBe("Won 2 of the last 10, against 10 of the 10 before.");
  });

  it("names a streak of three or more", () => {
    expect(recentForm(games("WWWL"))!.note).toBe("Won your last 3 in a row.");
    expect(recentForm(games("WLW"))!.note).toBeNull();
  });

  it("has nothing to show without games", () => {
    expect(recentForm([])).toBeNull();
  });
});
