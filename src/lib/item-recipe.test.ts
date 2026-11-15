import { describe, expect, it } from "vitest";
import type { ItemInfo } from "./engine/types";
import { recipeOf } from "./item-recipe";

const item = (key: string, name: string, cost: number, components: number[] = []): ItemInfo => ({ key, name, cost, img: `/items/${key}.png`, components });
const items: Record<string, ItemInfo> = {
  13: item("gauntlets", "Gauntlets of Strength", 140),
  20: item("circlet", "Circlet", 155),
  73: item("bracer", "Bracer", 505, [13, 20]),
  16: item("branches", "Iron Branch", 50),
  34: item("magic_stick", "Magic Stick", 200),
  36: item("magic_wand", "Magic Wand", 460, [34, 16, 16]),
  1: item("blink", "Blink Dagger", 2250),
  99: item("broken", "Broken", 900, [13, 404]),
};

describe("recipeOf", () => {
  it("lists the parts and the recipe scroll's price", () => {
    expect(recipeOf(73, items)).toEqual({
      parts: [
        { itemId: 13, name: "Gauntlets of Strength", img: "/items/gauntlets.png", cost: 140, count: 1 },
        { itemId: 20, name: "Circlet", img: "/items/circlet.png", cost: 155, count: 1 },
      ],
      scroll: 210,
    });
  });

  it("counts a repeated part once and needs no scroll when the parts make the price", () => {
    const wand = recipeOf(36, items);
    expect(wand?.parts.map((p) => [p.name, p.count])).toEqual([
      ["Magic Stick", 1],
      ["Iron Branch", 2],
    ]);
    expect(wand?.scroll).toBe(160);
    expect(recipeOf(36, { ...items, 36: item("magic_wand", "Magic Wand", 300, [34, 16, 16]) })?.scroll).toBe(0);
  });

  it("has no recipe for a basic item, an unknown item or a missing part", () => {
    expect(recipeOf(1, items)).toBeUndefined();
    expect(recipeOf(5, items)).toBeUndefined();
    expect(recipeOf(99, items)).toBeUndefined();
    expect(recipeOf(73, undefined)).toBeUndefined();
  });
});
