import { describe, expect, it } from "vitest";
import { sampleProof } from "../../test/fixtures/proof";
import { isProof, ladderRows, percent, proofVerdict, rankRoleTitle, rivalsTitle, runningTitle, shortDay, signedPoints } from "./proof";

describe("isProof", () => {
  it("takes the published shape", () => {
    expect(isProof(sampleProof())).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isProof(null)).toBe(false);
    expect(isProof([])).toBe(false);
    expect(isProof({ ...sampleProof(), games: "2020" })).toBe(false);
    expect(isProof({ ...sampleProof(), rivals: { ...sampleProof().rivals, meta: null } })).toBe(false);
    expect(isProof({ ...sampleProof(), byRole: { "1": { lift: 0.1 } } })).toBe(false);
    expect(isProof({ ...sampleProof(), running: undefined })).toBe(false);
  });
});

describe("number formats", () => {
  it("writes signed points with a real minus sign", () => {
    expect(signedPoints(0.079)).toBe("+7.9");
    expect(signedPoints(-0.012)).toBe("−1.2");
    expect(signedPoints(0.0001)).toBe("0.0");
  });

  it("writes percentages and short days", () => {
    expect(percent(0.57)).toBe("57.0%");
    expect(shortDay("2026-11-05")).toBe("Nov 5");
  });
});

describe("proofVerdict", () => {
  it("says yes or no with the size when the whole range is on one side of zero", () => {
    expect(proofVerdict({ lift: 0.051, margin: 0.016 })).toBe("Yes, by 5.1 Points");
    expect(proofVerdict({ lift: -0.03, margin: 0.012 })).toBe("No, by 3.0 Points");
  });

  it("does not call a gain or a loss the margin could erase", () => {
    expect(proofVerdict({ lift: 0.008, margin: 0.016 })).toBe("Too Close to Call");
    expect(proofVerdict({ lift: -0.004, margin: 0.016 })).toBe("Too Close to Call");
    expect(proofVerdict({ lift: 0.016, margin: 0.016 })).toBe("Too Close to Call");
  });

  it("gives no answer without games on both sides", () => {
    expect(proofVerdict({ lift: null, margin: null })).toBe("Too Few Games to Say Yet");
  });
});

describe("rivalsTitle", () => {
  const rivals = (engine: number | null, meta: number | null, popular: number | null) => ({ engine: { lift: engine }, meta: { lift: meta }, popular: { lift: popular } });

  it("compares our gain with the better simple rule, from the numbers shown", () => {
    expect(rivalsTitle(rivals(0.0512, 0.0488, 0.011))).toBe("Our Picks Lead the Best Simple Rule by 0.2 Points");
    expect(rivalsTitle(rivals(0.04, 0.011, 0.052))).toBe("The Best Simple Rule Leads Our Picks by 1.2 Points");
    expect(rivalsTitle(rivals(0.0504, 0.0496, 0.01))).toBe("Our Picks Are Level with the Best Simple Rule");
    expect(rivalsTitle(rivals(0.03, null, 0.01))).toBe("Our Picks Lead the Best Simple Rule by 2.0 Points");
  });

  it("gives no finding without our gain or any rule to compare", () => {
    expect(rivalsTitle(rivals(null, 0.04, 0.01))).toBeNull();
    expect(rivalsTitle(rivals(0.05, null, null))).toBeNull();
  });
});

describe("runningTitle", () => {
  const days = (...lifts: number[]) => lifts.map((lift) => ({ lift }));

  it("counts the days with a gain", () => {
    expect(runningTitle(days(0.08, 0.05, 0.051))).toBe("A Gain on All 3 Days");
    expect(runningTitle(days(0.08, 0.05))).toBe("A Gain on Both Days");
    expect(runningTitle(days(0.02, -0.01, 0.0004, 0.03))).toBe("A Gain on 2 of 4 Days");
    expect(runningTitle(days(-0.02, -0.01))).toBe("No Gain on Any of 2 Days");
  });

  it("gives no finding for a single day", () => {
    expect(runningTitle(days(0.05))).toBeNull();
  });
});

describe("rankRoleTitle", () => {
  const lifts = (...values: (number | null)[]) => Object.fromEntries(values.map((lift, i) => [String(i + 1), { lift }]));

  it("counts the rank groups and roles with a gain", () => {
    expect(rankRoleTitle(lifts(0.091, 0.031, 0.048, 0.096), lifts(0.06, 0.07, -0.004, 0.05, 0.04))).toBe("A Gain in Every Rank and in Four of Five Roles");
    expect(rankRoleTitle(lifts(0.09, -0.03, 0.04, 0.09), lifts(0.06, 0.07, 0.01, 0.05, 0.04))).toBe("A Gain in Three of Four Ranks and in Every Role");
    expect(rankRoleTitle(lifts(-0.01, -0.03), lifts(-0.06, -0.07))).toBe("No Gain in Any Rank or Role");
  });

  it("leaves out groups with too few picks, and needs two of each", () => {
    expect(rankRoleTitle(lifts(0.09, null, 0.04, 0.09), lifts(0.06, -0.07, null, 0.05, 0.04))).toBe("A Gain in Every Rank and in Three of Four Roles");
    expect(rankRoleTitle(lifts(0.09, null, null, null), lifts(0.06, 0.07))).toBeNull();
  });
});

describe("ladderRows", () => {
  const range = {
    games: 60000,
    bands: [
      { games: 2000, won: 0.39, low: 0.37, high: 0.41 },
      { games: 9000, won: 0.505, low: 0.495, high: 0.516 },
      { games: 1800, won: 0.69, low: 0.66, high: 0.71 },
    ],
    check: [
      { games: 1100, won: 0.37 },
      { games: 3100, won: 0.505 },
      { games: 200, won: 0.7 },
    ],
  };

  it("is empty without a checked range", () => {
    expect(ladderRows(null)).toEqual([]);
    expect(ladderRows({ ...range, check: undefined })).toEqual([]);
  });

  it("shows each band from the side it favours, leaving out bands with too few newer games", () => {
    const rows = ladderRows(range);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ side: "Radiant", low: 0.495, high: 0.516, won: 0.505, games: 3100 });
    expect(rows[1]!.side).toBe("Dire");
    expect(rows[1]!.low).toBeCloseTo(0.59, 6);
    expect(rows[1]!.high).toBeCloseTo(0.63, 6);
    expect(rows[1]!.won).toBeCloseTo(0.63, 6);
  });
});
