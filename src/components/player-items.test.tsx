import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem } from "@/lib/engine/item-build";
import { usualLane } from "./build-path";
import { ItemCardProvider } from "./item-card";
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
const renderItems = (lane: BuildItem[]) =>
  render(
    <ItemCardProvider>
      <PlayerItems player={player(lane)} heroName={(id) => `Hero ${id}`} icons={{}} />
    </ItemCardProvider>,
  );

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

  it("puts a lane item this draft asks for on the path with its minute, its card with its reason", async () => {
    const user = userEvent.setup();
    renderItems([nullTalisman, earlyWand]);
    const path = screen.getByRole("list", { name: "Core items, in buy order" });
    expect(within(path).getByText("3")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(within(path).getByRole("button", { name: "Magic Wand" }));
    expect(within(screen.getByRole("dialog", { name: "Magic Wand" })).getByText("Against Zeus's spells: get it early.")).toBeInTheDocument();
    const lane = screen.getByRole("list", { name: "Lane items, in buy order" });
    expect(within(lane).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Null Talisman"]);
  });

  it("opens an item's card next to it when its tile is pressed, one card at a time", async () => {
    const user = userEvent.setup();
    renderItems([nullTalisman, earlyWand]);
    await user.click(screen.getByRole("button", { name: "Phase Boots" }));
    expect(screen.getByRole("button", { name: "Phase Boots" })).toHaveAttribute("aria-expanded", "true");
    const card = screen.getByRole("dialog", { name: "Phase Boots" });
    expect(card).toHaveFocus();
    expect(within(card).getByText("9 min")).toBeInTheDocument();
    expect(within(card).getByText("Usual")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Magic Wand" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Magic Wand" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Phase Boots" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the card on a second press, Escape or Close, and gives focus back to the item", async () => {
    const user = userEvent.setup();
    renderItems([nullTalisman]);
    const tile = screen.getByRole("button", { name: "Phase Boots" });
    await user.click(tile);
    await user.click(tile);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(tile);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(tile).toHaveFocus();
    await user.click(tile);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(tile);
    await user.click(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names the enemy an item is bought for on its tile and in its card", async () => {
    const user = userEvent.setup();
    const salve = item(39, "Healing Salve", 0, { reason: "Hard lane against Hero 11: more sustain", against: [11] });
    render(
      <ItemCardProvider>
        <PlayerItems player={{ ...player([]), build: { ...player([]).build!, start: [salve] } }} heroName={(id) => `Hero ${id}`} icons={{ 11: "/hero-11.png" }} />
      </ItemCardProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Healing Salve, for Hero 11" }));
    expect(within(screen.getByRole("dialog", { name: "Healing Salve" })).getByText("For Hero 11")).toBeInTheDocument();
  });

  it("shows no lane kit when there are no usual lane items", () => {
    renderItems([]);
    expect(screen.queryByRole("list", { name: "Lane items, in buy order" })).not.toBeInTheDocument();
  });
});
