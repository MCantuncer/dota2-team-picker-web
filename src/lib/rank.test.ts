import { describe, expect, it } from "vitest";
import { rankName } from "./rank";

describe("rankName", () => {
  it.each([
    [11, "Herald I"],
    [54, "Legend IV"],
    [75, "Divine V"],
    [80, "Immortal"],
    [40, "Archon"],
  ])("names rank tier %i as %s", (tier, name) => {
    expect(rankName(tier)).toBe(name);
  });

  it("returns null for unknown or hidden ranks", () => {
    expect(rankName(null)).toBeNull();
    expect(rankName(0)).toBeNull();
    expect(rankName(95)).toBeNull();
  });
});
