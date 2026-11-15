import { describe, expect, it } from "vitest";
import type { ItemInfo } from "@/lib/engine/types";
import { findItem, placeCard } from "./item-card";

const screen = { width: 1280, height: 800, top: 64 };
const card = { width: 480, height: 400 };

describe("placeCard", () => {
  it("puts the card under its item, centered on it", () => {
    expect(placeCard({ top: 100, left: 400, width: 64, height: 47 }, card, screen)).toEqual({ top: 157, left: 192, maxHeight: 704 });
  });

  it("puts it over the item when there is no room under it", () => {
    expect(placeCard({ top: 600, left: 400, width: 64, height: 47 }, card, screen).top).toBe(190);
  });

  it("puts it beside the item when there is room neither under nor over it", () => {
    const tall = { width: 480, height: 600 };
    expect(placeCard({ top: 300, left: 100, width: 64, height: 47 }, tall, screen)).toEqual({ top: 80, left: 174, maxHeight: 704 });
    expect(placeCard({ top: 300, left: 1100, width: 64, height: 47 }, tall, screen).left).toBe(610);
  });

  it("keeps the card inside the screen at its edges", () => {
    expect(placeCard({ top: 100, left: 4, width: 64, height: 47 }, card, screen).left).toBe(16);
    expect(placeCard({ top: 100, left: 1240, width: 40, height: 47 }, card, screen).left).toBe(784);
  });
});

describe("findItem", () => {
  const info = (key: string, name: string): ItemInfo => ({ key, name, cost: 100, img: `/${key}.png`, components: [] });
  const items = { 1: info("recipe_bkb", "Black King Bar"), 116: info("black_king_bar", "Black King Bar") };

  it("finds an item by id, or by name skipping its recipe", () => {
    expect(findItem(items, { itemId: 116 })?.id).toBe(116);
    expect(findItem(items, { name: "Black King Bar" })?.id).toBe(116);
    expect(findItem(items, { name: "Nothing" })).toBeUndefined();
    expect(findItem(undefined, { itemId: 116 })).toBeUndefined();
  });
});
