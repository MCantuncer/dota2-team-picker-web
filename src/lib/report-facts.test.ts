import { describe, expect, it } from "vitest";
import fixture from "../../test/fixtures/report-facts-v1.json";
import { readFacts } from "./report-facts";

// A copy of the backend's saved facts (functions/_shared/report/fixtures/facts-v1-dire-9072422905.json),
// so a change to the backend shape that this copy of the type misses fails here.
const copy = () => structuredClone(fixture) as Record<string, unknown>;

describe("readFacts", () => {
  it("reads the backend's version 1 facts", () => {
    const facts = readFacts(copy(), 1);
    expect(facts?.matchId).toBe(9072422905);
    expect(facts?.heroes).toHaveLength(5);
    expect(facts?.lanes?.map((l) => l.lane)).toEqual(["bottom", "mid", "top"]);
  });

  it("reads a basic report, without the parsed parts", () => {
    const basic = {
      ...copy(),
      isBasic: true,
      goldLead: null,
      swings: null,
      lanes: null,
      fights: null,
      damageTaken: null,
      draft: null,
    };
    expect(readFacts(basic, 1)?.isBasic).toBe(true);
  });

  it("refuses a version it doesn't know", () => {
    expect(readFacts(copy(), 2)).toBeNull();
    expect(readFacts({ ...copy(), version: 2 }, 1)).toBeNull();
    expect(readFacts(copy(), null)).toBeNull();
  });

  it("refuses facts with a missing or wrong field", () => {
    expect(readFacts(null, 1)).toBeNull();
    expect(readFacts({ ...copy(), side: "both" }, 1)).toBeNull();
    expect(readFacts({ ...copy(), heroes: [{ heroId: 1 }] }, 1)).toBeNull();
    expect(readFacts({ ...copy(), lanes: [{ lane: "safe", ourHeroes: [], theirHeroes: [], netWorthDiff: 0 }] }, 1))
      .toBeNull();
    const noScore = copy();
    delete noScore.score;
    expect(readFacts(noScore, 1)).toBeNull();
  });
});
