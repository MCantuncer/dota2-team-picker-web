import { describe, expect, it } from "vitest";
import { patchNotice } from "./patch-notice";

const patch = { name: "7.42", startedAt: "2026-11-18T21:28:07.019Z" };
// One game's 25 pairs from both heroes' side, times 1000 games, for 50 rows a game.
const matchups = {
  "1": { "2": { games: 30_000, wins: 15_000 } },
  "2": { "1": { games: 20_000, wins: 10_000 } },
};

describe("patchNotice", () => {
  it("gives the patch, its day, its games and their share of the counts", () => {
    const notice = patchNotice(
      {
        patch,
        matchups,
        matchupsFrom: { source: "stratz", at: "", patchGames: 750 },
      },
      new Date("2026-11-21T11:00:00Z"),
    );
    expect(notice).toEqual({
      name: "7.42",
      day: 3,
      patchGames: 750,
      share: 0.75,
    });
  });

  it("counts the release day as day 1", () => {
    const notice = patchNotice(
      {
        patch,
        matchups,
        matchupsFrom: { source: "stratz", at: "", patchGames: 750 },
      },
      new Date("2026-11-18T22:00:00Z"),
    );
    expect(notice?.day).toBe(1);
  });

  it("is off when the counts hold no young patch", () => {
    const now = new Date("2026-11-21T11:00:00Z");
    expect(
      patchNotice(
        { patch, matchups, matchupsFrom: { source: "stratz", at: "" } },
        now,
      ),
    ).toBeNull();
    expect(patchNotice({ patch, matchups }, now)).toBeNull();
    expect(
      patchNotice(
        {
          matchups,
          matchupsFrom: { source: "stratz", at: "", patchGames: 10 },
        },
        now,
      ),
    ).toBeNull();
  });

  it("never shows more than all of the counts", () => {
    const notice = patchNotice(
      {
        patch,
        matchups,
        matchupsFrom: { source: "stratz", at: "", patchGames: 5000 },
      },
      new Date("2026-11-21T11:00:00Z"),
    );
    expect(notice?.share).toBe(1);
  });
});
