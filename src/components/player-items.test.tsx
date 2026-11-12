import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem } from "@/lib/engine/item-build";
import { usualLane } from "./build-path";
import { PlayerItems } from "./player-items";

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

describe("Build Path", () => {
  it("shows the usual lane items as tiles after the start, with no minute", () => {
    renderItems([nullTalisman, bracer, wand]);
    const lane = screen.getByRole("list", { name: "Lane items, in buy order" });
    expect(within(lane).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Null Talisman", "Bracer", "Magic Wand"]);
    expect(within(lane).queryByText("2")).not.toBeInTheDocument();
  });

  it("puts a lane item this draft asks for on the path with its minute, open with its reason", () => {
    renderItems([nullTalisman, earlyWand]);
    const path = screen.getByRole("list", { name: "Core items, in buy order" });
    expect(within(path).getByRole("button", { name: "Magic Wand" })).toHaveAttribute("aria-pressed", "true");
    expect(within(path).getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Against Zeus's spells: get it early.")).toBeInTheDocument();
    const lane = screen.getByRole("list", { name: "Lane items, in buy order" });
    expect(within(lane).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Null Talisman"]);
  });

  it("opens an item's numbers under it when its tile is pressed", async () => {
    const user = userEvent.setup();
    renderItems([nullTalisman, earlyWand]);
    await user.click(screen.getByRole("button", { name: "Phase Boots" }));
    expect(screen.getByRole("button", { name: "Phase Boots" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Magic Wand" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("heading", { name: "Phase Boots" })).toBeInTheDocument();
    expect(screen.getByText("9 min")).toBeInTheDocument();
    expect(screen.getByText("Usual")).toBeInTheDocument();
  });

  it("names the enemy an item is bought for on its tile and in its detail", () => {
    const salve = item(39, "Healing Salve", 0, { reason: "Hard lane against Hero 11: more sustain", against: [11] });
    render(
      <PlayerItems
        player={{ ...player([]), build: { ...player([]).build!, start: [salve] } }}
        heroName={(id) => `Hero ${id}`}
        icons={{ 11: "/hero-11.png" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Healing Salve, for Hero 11" })).toBeInTheDocument();
  });

  it("shows no lane kit when there are no usual lane items", () => {
    renderItems([]);
    expect(screen.queryByRole("list", { name: "Lane items, in buy order" })).not.toBeInTheDocument();
  });
});
