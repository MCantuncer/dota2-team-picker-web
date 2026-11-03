import { describe, expect, it } from "vitest";
import { readPlayerFeedback } from "./player-feedback";

const finding = (over: Record<string, unknown> = {}) => ({
  kind: "deaths",
  tone: "problem",
  score: 1.2,
  headline: "Too many deaths",
  happened: ["Lina: 82nd percentile for deaths per minute", 3],
  pattern: "Across 5 games on Lina, you had more deaths per minute than 80% of games on these heroes.",
  cost: null,
  change: "You died about 9 times per game.",
  matchIds: [1, 2, "3"],
  ...over,
});

const row = (over: Record<string, unknown> = {}) => ({
  version: 1,
  findings: [
    finding(),
    finding({
      kind: "farm",
      tone: "strength",
      headline: "Strong farm",
      change: "ignored",
    }),
  ],
  improved: [{ kind: "laning", headline: "You fall behind in lane" }, { kind: "farm" }],
  games: 6,
  parsed_games: 4,
  first_game_at: "2026-10-25T10:00:00+00:00",
  last_game_at: "2026-11-02T10:00:00+00:00",
  updated_at: "2026-11-03T01:00:00+00:00",
  ...over,
});

describe("readPlayerFeedback", () => {
  it("splits findings into strengths and problems and keeps only clean values", () => {
    const fb = readPlayerFeedback(row());
    expect(fb?.problems).toEqual([
      {
        kind: "deaths",
        tone: "problem",
        headline: "Too many deaths",
        happened: ["Lina: 82nd percentile for deaths per minute"],
        pattern: "Across 5 games on Lina, you had more deaths per minute than 80% of games on these heroes.",
        cost: null,
        change: "You died about 9 times per game.",
        matchIds: [1, 2],
      },
    ]);
    expect(fb?.strengths.map((f) => [f.headline, f.change])).toEqual([["Strong farm", null]]);
    expect(fb?.improved).toEqual([{ kind: "laning", headline: "You fall behind in lane" }]);
    expect([fb?.games, fb?.parsedGames]).toEqual([6, 4]);
  });

  it("reads no row or an unknown version as no feedback yet", () => {
    expect(readPlayerFeedback(null)).toBeNull();
    expect(readPlayerFeedback(row({ version: 2 }))).toBeNull();
  });

  it("skips an odd finding without hiding the others", () => {
    const fb = readPlayerFeedback(
      row({
        findings: [finding({ tone: "great" }), finding({ headline: "" }), finding()],
      }),
    );
    expect(fb?.problems).toHaveLength(1);
  });
});
