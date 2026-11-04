import { describe, expect, it } from "vitest";
import { playerRecord, winPercent } from "./player-record";

const NOW = new Date("2026-11-04T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
const row = (hero: number, win: boolean, d: number, status = "parsed") => ({
  hero_id: hero,
  is_win: win,
  started_at: daysAgo(d),
  status,
});

describe("playerRecord", () => {
  it("counts the last 14 days and finds the most played hero", () => {
    const r = playerRecord(
      [row(114, true, 1), row(25, false, 2, "basic"), row(114, false, 3), row(114, true, 5), row(25, true, 6), row(8, true, 20)],
      NOW,
    );
    expect([r.games, r.wins, r.parsed]).toEqual([5, 3, 4]);
    expect(r.topHero).toEqual({ id: 114, games: 3, wins: 2 });
    expect([r.firstAt, r.lastAt]).toEqual([daysAgo(6), daysAgo(1)]);
    expect(winPercent(r)).toBe(60);
  });

  it("lists the newest results even from before the window", () => {
    const r = playerRecord([row(8, true, 20), row(114, false, 1)], NOW, 3);
    expect(r.latest).toEqual([false, true]);
  });

  it("breaks a tie on games by wins, and has nothing with no games", () => {
    expect(playerRecord([row(1, false, 1), row(2, true, 2)], NOW).topHero?.id).toBe(2);
    const empty = playerRecord([], NOW);
    expect([empty.topHero, empty.firstAt, winPercent(empty)]).toEqual([null, null, null]);
  });
});
