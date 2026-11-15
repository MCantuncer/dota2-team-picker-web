import { describe, expect, it } from "vitest";
import { damageName, fightRows, laneScale } from "./report-charts";

describe("report charts", () => {
  it("puts every lane on one scale, rounded up to a thousand", () => {
    const lane = (netWorthDiff: number) => ({ lane: "mid" as const, ourHeroes: [], theirHeroes: [], netWorthDiff });
    expect(laneScale([lane(777), lane(118), lane(2620)])).toBe(3000);
    expect(laneScale([lane(-4100), lane(200)])).toBe(5000);
    expect(laneScale([lane(0)])).toBe(1000);
  });

  it("moves a fight marker to the next row when it would sit on another", () => {
    expect(fightRows([23, 29, 30, 31], 2.5)).toEqual([0, 0, 1, 2]);
    expect(fightRows([5, 12, 20], 2.5)).toEqual([0, 0, 0]);
    expect(fightRows([10, 11, 14], 2.5)).toEqual([0, 1, 0]);
  });

  it("names damage sources in Title Case", () => {
    expect(damageName("attacks")).toBe("Right-clicks");
    expect(damageName("bloodseeker_blood_bath")).toBe("Bloodseeker Blood Bath");
    expect(damageName("item_blade_mail")).toBe("Blade Mail");
  });
});
