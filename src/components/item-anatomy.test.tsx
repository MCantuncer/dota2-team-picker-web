import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { ItemInfo } from "@/lib/engine/types";
import { ItemAnatomy } from "./item-anatomy";
import { PlayerItems } from "./player-items";

const info = (key: string, name: string, cost: number, extra: Partial<ItemInfo> = {}): ItemInfo => ({ key, name, cost, img: `/items/${key}.png`, components: [], ...extra });
const items: Record<string, ItemInfo> = {
  13: info("gauntlets", "Gauntlets of Strength", 140),
  20: info("circlet", "Circlet", 155),
  73: info("bracer", "Bracer", 505, {
    components: [20, 13],
    stats: [
      { value: "+5", label: "Strength" },
      { value: "+50", label: "Health" },
    ],
  }),
  116: info("black_king_bar", "Black King Bar", 4050, { abilities: [{ kind: "active", name: "Avatar" }] }),
  44: info("tango", "Tango", 90),
};

describe("ItemAnatomy", () => {
  it("shows what the item gives and its parts with the recipe scroll", () => {
    render(<ItemAnatomy itemId={73} items={items} />);
    const gives = screen.getByRole("region", { name: "What Bracer gives" });
    expect(within(gives).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["+5Strength", "+50Health"]);
    const recipe = screen.getByRole("region", { name: "How to build Bracer" });
    expect(within(recipe).getAllByRole("listitem").map((li) => li.textContent?.replace("+", ""))).toEqual(["Circlet155 gold", "Gauntlets of Strength140 gold", "Recipe210 gold"]);
  });

  it("shows an item's spell, and nothing for an item with no stats, spells or parts", () => {
    const { container, rerender } = render(<ItemAnatomy itemId={116} items={items} />);
    expect(screen.getByText("Avatar").parentElement?.textContent).toBe("ActiveAvatar");
    expect(screen.queryByRole("region", { name: /How to build/ })).toBeNull();
    rerender(<ItemAnatomy itemId={44} items={items} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ItemAnatomy itemId={73} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens in the Build Path detail with the item's gold", async () => {
    const player: PlayerPlan = {
      heroId: 36,
      position: 2,
      job: "Win your lane.",
      fallbacks: [],
      enemies: [],
      threatRows: [],
      build: { timings: "rank", start: [], lane: [{ itemId: 73, name: "Bracer", img: "/items/bracer.png", minute: 2 }], core: [], situational: [] },
    };
    render(<PlayerItems player={player} heroName={(id) => `Hero ${id}`} icons={{}} items={items} />);
    await userEvent.click(screen.getByRole("button", { name: "Bracer" }));
    expect(screen.getByText("505")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "How to build Bracer" })).toBeInTheDocument();
  });
});
