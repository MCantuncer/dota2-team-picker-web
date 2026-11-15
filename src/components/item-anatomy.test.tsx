import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { ItemInfo } from "@/lib/engine/types";
import { ItemParts, ItemSpells, ItemStatLines } from "./item-anatomy";
import { ItemCardProvider } from "./item-card";
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
  116: info("black_king_bar", "Black King Bar", 4050, {
    abilities: [
      { kind: "active", name: "Avatar", text: "Grants magic resistance.", facts: [{ label: "Duration", value: "9s" }] },
      { kind: "passive", name: "Sturdy" },
    ],
    cooldown: 95,
    manaCost: 50,
  }),
  44: info("tango", "Tango", 90),
};

describe("item tooltip parts", () => {
  it("lists the bonuses as lines and the parts with the recipe scroll", () => {
    render(
      <>
        <ItemStatLines item={items[73]!} />
        <ItemParts itemId={73} items={items} />
      </>,
    );
    expect(within(screen.getByRole("list", { name: "What Bracer gives" })).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["+5 Strength", "+50 Health"]);
    const recipe = screen.getByRole("region", { name: "How to build Bracer" });
    expect(within(recipe).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Circlet155 gold", "Gauntlets of Strength140 gold", "Recipe210 gold"]);
  });

  it("puts the cooldown and mana on the first used spell, with its text and number lines", () => {
    render(<ItemSpells item={items[116]!} />);
    const [avatar, sturdy] = within(screen.getByRole("list", { name: "Black King Bar spells" })).getAllByRole("listitem");
    expect(avatar?.textContent).toContain("Active: Avatar");
    expect(avatar?.textContent).toContain("95 seconds cooldown");
    expect(avatar?.textContent).toContain("50 mana");
    expect(avatar?.textContent).toContain("Grants magic resistance.");
    expect(avatar?.textContent).toContain("Duration9s");
    expect(sturdy?.textContent).toBe("Passive: Sturdy");
  });

  it("shows nothing for an item with no bonuses, spells or parts", () => {
    const { container } = render(
      <>
        <ItemStatLines item={items[44]!} />
        <ItemSpells item={items[44]!} />
        <ItemParts itemId={44} items={items} />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens in the item's card with its gold, and a part opens its own card with a way back", async () => {
    const player: PlayerPlan = {
      heroId: 36,
      position: 2,
      job: "Win your lane.",
      fallbacks: [],
      enemies: [],
      threatRows: [],
      build: { timings: "rank", start: [], lane: [{ itemId: 73, name: "Bracer", img: "/items/bracer.png", minute: 2 }], core: [], situational: [] },
    };
    const user = userEvent.setup();
    render(
      <ItemCardProvider items={items}>
        <PlayerItems player={player} heroName={(id) => `Hero ${id}`} icons={{}} />
      </ItemCardProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Bracer" }));
    const card = screen.getByRole("dialog", { name: "Bracer" });
    expect(within(card).getByText("505")).toBeInTheDocument();
    expect(within(card).getByRole("region", { name: "How to build Bracer" })).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "Open Circlet" }));
    expect(screen.getByRole("dialog", { name: "Circlet" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to Bracer" }));
    expect(screen.getByRole("dialog", { name: "Bracer" })).toBeInTheDocument();
  });
});
