import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NeutralPlanTier } from "@/lib/engine/neutral-plan";
import { NeutralItems, sourceLabel } from "./neutral-items";

const ranked: NeutralPlanTier = {
  tier: 3,
  unlock: 30,
  usual: { minute: 33, crafts: 40 },
  from: { source: "hero-position", picks: 57 },
  artifacts: [
    { itemId: 1, name: "Harmonizer", img: "/h.png", share: 26 },
    { itemId: 2, name: "Ceremonial Robe", img: "/c.png", share: 12 },
  ],
  enchants: [{ itemId: 9, name: "Mystical", img: "/m.png", level: 3, share: 60 }],
  enchantFrom: { source: "hero", picks: 10 },
};
const unranked: NeutralPlanTier = {
  tier: 4,
  unlock: 50,
  artifacts: [
    { itemId: 3, name: "Flicker", img: "/f.png" },
    { itemId: 4, name: "Fallen Sky", img: "/s.png" },
  ],
  enchants: [],
};

describe("sourceLabel", () => {
  it("names whose crafts the order is from", () => {
    expect(sourceLabel("hero-position", 1234, "Invoker", 2)).toBe("1,234 Invoker Mid crafts");
    expect(sourceLabel("hero", 30, "Invoker", 2)).toBe("30 Invoker crafts, every role");
    expect(sourceLabel("position", 209, "Invoker", 1)).toBe("209 Carry crafts, every hero");
  });
});

describe("NeutralItems", () => {
  it("shows each tier with its minute, artifacts by share, enchantments and where the numbers come from", () => {
    render(<NeutralItems tiers={[ranked, unranked]} hero="Invoker" position={2} />);
    const cards = screen.getAllByRole("listitem").filter((li) => li.textContent?.startsWith("Tier"));
    expect(cards).toHaveLength(2);
    const [t3, t4] = cards as [HTMLElement, HTMLElement];
    expect(within(t3).getByText("33")).toBeTruthy();
    expect(within(t3).getByText("Usual Minute")).toBeTruthy();
    expect(within(t3).getByRole("list", { name: "Tier 3 artifacts, most chosen first" }).textContent).toBe("Harmonizer26%Ceremonial Robe12%");
    expect(within(t3).getByText("Mystical")).toBeTruthy();
    expect(within(t3).getByText("From 57 Invoker Mid crafts")).toBeTruthy();
    // Without enough games: the tier's earliest minute and every artifact it can offer, unranked.
    expect(within(t4).getByText("Earliest Minute")).toBeTruthy();
    expect(within(t4).getByRole("list", { name: "Tier 4 artifacts the game can offer" })).toBeTruthy();
    expect(within(t4).getByText(/Too few games yet/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/—/);
  });

  it("shows nothing without tiers", () => {
    const { container } = render(<NeutralItems tiers={[]} hero="Invoker" position={2} />);
    expect(container.textContent).toBe("");
  });
});
