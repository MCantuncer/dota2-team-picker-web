import { describe, expect, it } from "vitest";
import { positionsLately, recentForm } from "./recent-form";

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

describe("positionsLately", () => {
  const row = (position: number | null, is_win: boolean) => ({ position, is_win });

  it("counts games and wins per position, most played first", () => {
    const rows = [row(2, true), row(3, false), row(2, true), row(2, false), row(3, true), row(1, false)];
    expect(positionsLately(rows)).toEqual({
      positions: [
        { position: 2, games: 3, wins: 2 },
        { position: 3, games: 2, wins: 1 },
        { position: 1, games: 1, wins: 0 },
      ],
      unknown: { games: 0, wins: 0 },
    });
  });

  it("breaks a tie by more wins, and counts games with no known position as unknown", () => {
    const rows = [row(4, false), row(5, true), row(null, true), row(9, false)];
    expect(positionsLately(rows)).toEqual({
      positions: [
        { position: 5, games: 1, wins: 1 },
        { position: 4, games: 1, wins: 0 },
      ],
      unknown: { games: 2, wins: 1 },
    });
  });

  it("adds up to the games counted", () => {
    const rows = [...Array.from({ length: 16 }, () => row(1, true)), row(4, true), row(4, false), row(2, true), row(null, false)];
    const { positions, unknown } = positionsLately(rows);
    expect(positions.reduce((n, p) => n + p.games, 0) + unknown.games).toBe(20);
  });

  it("only reads the latest 20 games", () => {
    const rows = [...Array.from({ length: 20 }, () => row(2, true)), row(1, true)];
    expect(positionsLately(rows)).toEqual({
      positions: [{ position: 2, games: 20, wins: 20 }],
      unknown: { games: 0, wins: 0 },
    });
  });
});
