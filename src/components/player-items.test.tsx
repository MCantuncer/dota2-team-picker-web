import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem } from "@/lib/engine/item-build";
import { PlayerItems, usualLane } from "./player-items";

const item = (itemId: number, name: string, minute: number, extra: Partial<BuildItem> = {}): BuildItem => ({
  itemId,
  name,
  img: `/items/${itemId}.png`,
  minute,
  ...extra,
});
const nullTalisman = item(77, "Null Talisman", 2);
const bracer = item(73, "Bracer", 2);
const wand = item(36, "Magic Wand", 2);
const earlyWand = item(36, "Magic Wand", 3, { draft: true, reason: "Against Zeus's spells: get it early" });

const player = (lane: BuildItem[]): PlayerPlan => ({
  heroId: 36,
  position: 2,
  job: "Win your lane.",
  fallbacks: [],
  enemies: [],
  threatRows: [],
  build: { timings: "rank", start: [item(44, "Tango", 0)], lane, core: [item(50, "Phase Boots", 9)], situational: [] },
});
const renderItems = (lane: BuildItem[]) => render(<PlayerItems player={player(lane)} heroName={(id) => `Hero ${id}`} icons={{}} />);

describe("usualLane", () => {
  it("keeps the usual lane items in buy order and leaves out the ones this draft asks for", () => {
    expect(usualLane({ lane: [nullTalisman, bracer, earlyWand] })).toEqual([nullTalisman, bracer]);
  });
});

describe("PlayerItems lane items", () => {
  it("shows the usual lane items as icons after the start, with no minute", () => {
    renderItems([nullTalisman, bracer, wand]);
    const lane = screen.getByRole("list", { name: "Lane items, in buy order" });
    expect(within(lane).getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual(["Null Talisman", "Bracer", "Magic Wand"]);
    expect(screen.queryByText("2 min")).not.toBeInTheDocument();
    expect(screen.queryByText("Null Talisman")).not.toBeInTheDocument();
  });

  it("keeps a lane item this draft asks for as an Item Journey step with its reason and minute", () => {
    renderItems([nullTalisman, earlyWand]);
    expect(screen.getByText("Magic Wand")).toBeInTheDocument();
    expect(screen.getByText("3 min")).toBeInTheDocument();
    expect(screen.getByText("Against Zeus's spells: get it early.")).toBeInTheDocument();
    const lane = screen.getByRole("list", { name: "Lane items, in buy order" });
    expect(within(lane).getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual(["Null Talisman"]);
  });

  it("shows no lane strip when there are no usual lane items", () => {
    renderItems([]);
    expect(screen.queryByRole("list", { name: "Lane items, in buy order" })).not.toBeInTheDocument();
  });
});
