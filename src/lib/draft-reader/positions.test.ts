import { describe, expect, it } from "vitest";
import type { PositionFit } from "@/lib/engine/positions";
import { placeByPosition } from "./positions";

const fits: Record<number, PositionFit> = {
  // A pure carry, a mid who also carries, and a support.
  1: { 1: 0.9, 2: 0.05, 3: 0.05, 4: 0, 5: 0 },
  2: { 1: 0.4, 2: 0.6, 3: 0, 4: 0, 5: 0 },
  3: { 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 0.7 },
};
const fit = (id: number) => fits[id]!;

describe("placeByPosition", () => {
  it("puts each hero in its usual position", () => {
    expect(placeByPosition([null, null, null, null, null], [3, 1], fit)).toEqual([1, null, null, null, 3]);
  });

  it("picks the best fit for all heroes together", () => {
    // Hero 2 would like pos 1 less than hero 1 does, so it goes mid.
    expect(placeByPosition([null, null, null, null, null], [2, 1], fit)).toEqual([1, 2, null, null, null]);
  });

  it("keeps heroes already entered and uses only open positions", () => {
    expect(placeByPosition([7, null, null, null, null], [1], fit)).toEqual([7, 1, null, null, null]);
  });

  it("leaves out heroes once every position is taken", () => {
    expect(placeByPosition([7, 8, 9, 10, null], [1, 3], fit)).toEqual([7, 8, 9, 10, 1]);
  });
});
