import { describe, expect, it } from "vitest";
import { toPlanSlots } from "./party-plan";

describe("toPlanSlots", () => {
  const pool = { a: { 1: [10], 0: [11] }, b: { 5: [20] }, c: { 0: [30, 31] } };

  it("puts each member and pick in their position", () => {
    const slots = toPlanSlots(
      [
        { id: "a", position: 1 },
        { id: "b", position: 5 },
      ],
      pool,
      [{ heroId: 99, kind: "ally", position: 5 }],
    );
    expect(slots.map((s) => [s.position, s.playerId, s.heroId])).toEqual([
      [1, "a", undefined],
      [2, undefined, undefined],
      [3, undefined, undefined],
      [4, undefined, undefined],
      [5, "b", 99],
    ]);
    expect(slots[0]!.favorites).toEqual([10, 11]);
    expect(slots[4]!.favorites).toEqual([20]);
  });

  it("fills open positions with members and picks that have none", () => {
    const slots = toPlanSlots(
      [
        { id: "a", position: 1 },
        { id: "c", position: null },
        { id: "b", position: 1 },
      ],
      pool,
      [
        { heroId: 7, kind: "ally", position: null },
        { heroId: 8, kind: "ally", position: 2 },
      ],
    );
    expect(slots.map((s) => s.playerId)).toEqual(["a", "c", "b", undefined, undefined]);
    expect(slots.map((s) => s.heroId)).toEqual([7, 8, undefined, undefined, undefined]);
    expect(slots[1]!.favorites).toEqual([30, 31]);
  });
});
