import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ItemInfo, NeutralItem } from "@/lib/engine/types";
import { findItem, findNeutral, ItemCard, itemSrc, placeCard } from "./item-card";

const view = { width: 1280, height: 800, top: 64 };
const card = { width: 480, height: 400 };

describe("placeCard", () => {
  it("puts the card under its item, centered on it", () => {
    expect(placeCard({ top: 100, left: 400, width: 64, height: 47 }, card, view)).toEqual({ top: 157, left: 192, maxHeight: 704 });
  });

  it("puts it over the item when there is no room under it", () => {
    expect(placeCard({ top: 600, left: 400, width: 64, height: 47 }, card, view).top).toBe(190);
  });

  it("puts it beside the item when there is room neither under nor over it", () => {
    const tall = { width: 480, height: 600 };
    expect(placeCard({ top: 300, left: 100, width: 64, height: 47 }, tall, view)).toEqual({ top: 80, left: 174, maxHeight: 704 });
    expect(placeCard({ top: 300, left: 1100, width: 64, height: 47 }, tall, view).left).toBe(610);
  });

  it("keeps the card inside the screen at its edges", () => {
    expect(placeCard({ top: 100, left: 4, width: 64, height: 47 }, card, view).left).toBe(16);
    expect(placeCard({ top: 100, left: 1240, width: 40, height: 47 }, card, view).left).toBe(784);
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

describe("neutral item cards", () => {
  const phial: NeutralItem = {
    key: "vile_phial",
    name: "Vile Phial",
    img: "/vile_phial.png",
    kind: "artifact",
    tier: 3,
    abilities: [{ kind: "passive", name: "Toxic Tincture", text: "Poisons for 5 seconds." }],
  };
  const claw: NeutralItem = { key: "imp_claw", name: "Imp Claw", img: "/imp_claw.png", kind: "artifact", tier: 2, cooldown: 7, abilities: [{ kind: "passive", name: "Critical Strike" }] };
  const brawny: NeutralItem = {
    key: "enhancement_brawny",
    name: "Brawny",
    img: "/b.png",
    kind: "enchantment",
    levels: [[{ value: "+110", label: "Health" }], [{ value: "+170", label: "Health" }, { value: "+4", label: "Health Regeneration" }]],
  };
  const neutrals = { 1882: phial, 334: claw, 1585: brawny };

  it("finds a neutral item by id only", () => {
    expect(findNeutral(neutrals, { itemId: 1882 })).toBe(phial);
    expect(findNeutral(neutrals, {})).toBeUndefined();
    expect(findNeutral(undefined, { itemId: 1882 })).toBeUndefined();
  });

  it("shows the tier and spell, never shop words or gold", () => {
    render(<ItemCard card={{ itemId: 1882, img: "https://cdn.example/vile_phial.png" }} items={{}} neutrals={neutrals} />);
    expect(screen.getByRole("heading", { name: "Vile Phial" })).toBeTruthy();
    expect(screen.getByText(/Tier/).textContent).toBe("Tier 3 Artifact");
    expect(screen.getByText("Poisons for 5 seconds.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/shop|gold/i);
    cleanup();
  });

  it("shows a passive's cooldown on a neutral item", () => {
    render(<ItemCard card={{ itemId: 334 }} neutrals={neutrals} />);
    expect(screen.getByText("seconds cooldown", { exact: false }).parentElement?.textContent).toContain("7");
    cleanup();
  });

  it("shows an enchantment's bonuses at the level it was opened with", () => {
    render(<ItemCard card={{ itemId: 1585, level: 2 }} neutrals={neutrals} />);
    expect(screen.getByText(/Enchantment/).textContent).toBe("Enchantment, Level 2");
    expect(screen.getByText("+170")).toBeTruthy();
    expect(screen.queryByText("+110")).toBeNull();
    cleanup();
  });

  it("keeps a full picture address as it is", () => {
    expect(itemSrc("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(itemSrc("/apps/a.png")).toBe("https://cdn.cloudflare.steamstatic.com/apps/a.png");
  });
});
