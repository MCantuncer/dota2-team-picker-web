import { describe, expect, it } from "vitest";
import { HeroSearch } from "./hero-search";

const heroes = [
  { id: 1, name: "Anti-Mage" },
  { id: 2, name: "Axe" },
  { id: 5, name: "Crystal Maiden" },
  { id: 11, name: "Shadow Fiend" },
  { id: 27, name: "Shadow Shaman" },
  { id: 30, name: "Witch Doctor" },
  { id: 76, name: "Outworld Devourer" },
  { id: 79, name: "Shadow Demon" },
];
const names = (found: { name: string }[]) => found.map((h) => h.name);

describe("HeroSearch", () => {
  const search = new HeroSearch(heroes);

  it("finds heroes by nickname first", () => {
    expect(names(search.find("sf", new Set()))[0]).toBe("Shadow Fiend");
    expect(names(search.find("od", new Set()))).toEqual(["Outworld Devourer"]);
  });

  it("matches the start of the name, ignoring case and punctuation", () => {
    expect(names(search.find("anti", new Set()))).toEqual(["Anti-Mage"]);
    expect(names(search.find("ANTI MA", new Set()))).toEqual(["Anti-Mage"]);
  });

  it("matches initials and later words", () => {
    expect(names(search.find("cm", new Set()))).toEqual(["Crystal Maiden"]);
    expect(names(search.find("doctor", new Set()))).toEqual(["Witch Doctor"]);
  });

  it("ranks ties by popularity", () => {
    const popular = new HeroSearch(heroes, (id) => (id === 79 ? 100 : 0));
    expect(names(popular.find("shadow", new Set()))[0]).toBe("Shadow Demon");
  });

  it("skips excluded heroes and respects the limit", () => {
    expect(names(search.find("shadow", new Set([11]), 5))).not.toContain("Shadow Fiend");
    expect(search.find("s", new Set(), 2)).toHaveLength(2);
  });

  it("returns nothing for an empty query", () => {
    expect(search.find("  ", new Set())).toEqual([]);
  });
});
