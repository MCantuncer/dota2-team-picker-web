import { describe, expect, it } from "vitest";
import { filterQuery, gameLength, readFilters, readGameRow } from "./player-games";

const row = (over: Record<string, unknown> = {}) => ({
  match_id: 8100000001,
  hero_id: 114,
  position: 1,
  is_win: true,
  started_at: "2026-11-02T10:00:00+00:00",
  duration_s: 2045,
  status: "parsed",
  summary: { card: { kills: 9, deaths: 2, assists: 7, goldPerMin: 712.4 } },
  findings: [
    { tone: "strength", headline: "Strong farm" },
    { kind: "early_deaths", tone: "problem", headline: "2 deaths before 10 minutes" },
  ],
  ...over,
});

describe("readGameRow", () => {
  it("reads the row and picks a problem as the note", () => {
    expect(readGameRow(row())).toEqual({
      matchId: 8100000001,
      heroId: 114,
      position: 1,
      isWin: true,
      startedAt: "2026-11-02T10:00:00+00:00",
      durationS: 2045,
      status: "parsed",
      kills: 9,
      deaths: 2,
      assists: 7,
      goldPerMin: 712,
      note: { kind: "early_deaths", tone: "problem", text: "2 deaths before 10 minutes" },
    });
  });

  it("leaves out a kind it doesn't know", () => {
    const g = readGameRow(row({ findings: [{ kind: "new_kind", tone: "problem", headline: "Something" }] }));
    expect(g?.note).toEqual({ kind: null, tone: "problem", text: "Something" });
  });

  it("shows what it can from a row without a summary or findings", () => {
    const g = readGameRow(row({ summary: null, findings: null, status: "waiting_parse", position: 7 }));
    expect([g?.kills, g?.note, g?.position, g?.status]).toEqual([null, null, null, "waiting_parse"]);
  });

  it("skips rows missing what every row has", () => {
    expect(readGameRow(row({ is_win: null }))).toBeNull();
    expect(readGameRow(row({ status: "lost" }))).toBeNull();
    expect(readGameRow(null)).toBeNull();
  });
});

describe("filters", () => {
  it("reads valid filters and ignores odd ones", () => {
    expect(readFilters({ hero: "114", pos: "3", result: "won", page: "2" })).toEqual({
      heroId: 114,
      position: 3,
      result: "won",
      page: 2,
    });
    expect(readFilters({ hero: "x", pos: "9", result: "draw", page: "0" })).toEqual({
      heroId: null,
      position: null,
      result: null,
      page: 1,
    });
  });

  it("writes them back, leaving defaults out", () => {
    const filters = { heroId: 114, position: null, result: "lost" as const, page: 1 };
    expect(filterQuery(filters)).toBe("?hero=114&result=lost");
    expect(filterQuery(filters, 3)).toBe("?hero=114&result=lost&page=3");
    expect(filterQuery({ heroId: null, position: null, result: null, page: 1 })).toBe("");
  });

  it("writes a game's length as minutes and seconds", () => {
    expect([gameLength(2045), gameLength(605)]).toEqual(["34:05", "10:05"]);
  });
});
