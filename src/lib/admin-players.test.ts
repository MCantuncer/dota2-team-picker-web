import { describe, expect, it } from "vitest";
import { addDays, heroCountText, joinedText, readStats, steamProfileUrl, turkeyDate } from "./admin-players";

// 7 Nov 2026, 15:00 in Turkey (12:00 UTC).
const NOW = Date.parse("2026-11-07T12:00:00Z");

describe("joinedText", () => {
  it("says Today for a time after midnight in Turkey, even when it is still yesterday in UTC", () => {
    expect(joinedText("2026-11-06T21:30:00Z", NOW)).toBe("Today, 00:30");
  });
  it("says Yesterday for the day before in Turkey", () => {
    expect(joinedText("2026-11-06T20:41:00Z", NOW)).toBe("Yesterday, 23:41");
  });
  it("shows the date for older days", () => {
    expect(joinedText("2026-11-05T15:07:00Z", NOW)).toBe("5 Nov, 18:07");
  });
});

describe("dates", () => {
  it("reads the Turkey date and adds days across a month", () => {
    expect(turkeyDate(Date.parse("2026-10-31T22:00:00Z"))).toBe("2026-11-01");
    expect(addDays("2026-10-25", 13)).toBe("2026-11-07");
  });
});

describe("readStats", () => {
  const row = { total: 3, today: 1, last_7_days: 2, first_day: "2026-10-25", per_day: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1] };
  it("reads the row", () => {
    expect(readStats([row])).toEqual({ total: 3, today: 1, last7Days: 2, firstDay: "2026-10-25", perDay: row.per_day });
  });
  it("refuses a row that isn't the expected shape", () => {
    expect(readStats([])).toBeNull();
    expect(readStats([{ ...row, per_day: [1, 2] }])).toBeNull();
    expect(readStats([{ ...row, total: "3" }])).toBeNull();
  });
});

describe("text", () => {
  it("counts heroes in words", () => {
    expect([0, 1, 12].map(heroCountText)).toEqual(["No heroes", "1 hero", "12 heroes"]);
  });
  it("links the Steam profile", () => {
    expect(steamProfileUrl("76561198052332106")).toBe("https://steamcommunity.com/profiles/76561198052332106");
  });
});
