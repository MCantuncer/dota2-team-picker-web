import { describe, expect, it } from "vitest";
import { splitHeroes } from "./hero-entry";

const never = () => false;

describe("splitHeroes", () => {
  it("splits a line into one hero per word", () => {
    expect(splitHeroes(" pa  sf ", false, never)).toEqual([
      { query: "pa", position: null },
      { query: "sf", position: null },
    ]);
  });

  it("reads a position digit written on or after each hero", () => {
    expect(splitHeroes("cm5 lion 4 axe", true, never)).toEqual([
      { query: "cm", position: 5 },
      { query: "lion", position: 4 },
      { query: "axe", position: null },
    ]);
  });

  it("keeps digits as letters when positions are off", () => {
    expect(splitHeroes("cm5", false, never)).toEqual([{ query: "cm5", position: null }]);
  });

  it("keeps a hero's full name as one hero", () => {
    const isShadowFiend = (q: string) => q === "shadow fiend";
    expect(splitHeroes("shadow fiend 2", true, isShadowFiend)).toEqual([{ query: "shadow fiend", position: 2 }]);
  });

  it("returns nothing for an empty line", () => {
    expect(splitHeroes("   ", true, never)).toEqual([]);
  });
});
