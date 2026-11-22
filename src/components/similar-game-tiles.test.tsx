import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ItemInfo } from "@/lib/engine/types";
import { GAME } from "@/lib/similar-games.sample";
import { ItemCardProvider } from "./item-card";
import { ClosestGames, minutes } from "./similar-game-tiles";

const item = (name: string, components: number[] = []): ItemInfo => ({ key: name, name, cost: 2000, img: `/${name}.png`, components });
const ITEMS: Record<string, ItemInfo> = { "1": item("Part"), "223": item("Meteor Hammer", [1]), "717": item("Starforge", [223, 1]) };
const PORTRAITS = Object.fromEntries([74, 8, 128, 129, 5, 11, 14, 26, 2, 44, 99].map((id) => [id, `/hero-${id}.png`]));
const heroName = (id: number) => `Hero ${id}`;

function show(games = [GAME, { ...GAME, match: 2, won: true }, { ...GAME, match: 3, won: false, deaths: 8 }]) {
  return render(
    <ItemCardProvider items={ITEMS}>
      <ClosestGames
        games={games}
        hero={74}
        enemies={[11, 14, 26, 2, 44]}
        allies={[8, 128]}
        heroName={heroName}
        icons={PORTRAITS}
        items={ITEMS}
      />
    </ItemCardProvider>,
  );
}

describe("ClosestGames", () => {
  it("shows each game's result, length and K/D/A", () => {
    show();
    const tiles = screen.getAllByRole("article");
    expect(tiles.map((t) => t.getAttribute("aria-label"))).toEqual([
      "Won, 40 min, 11 kills, 2 deaths, 9 assists",
      "Won, 40 min, 11 kills, 2 deaths, 9 assists",
      "Lost, 40 min, 11 kills, 8 deaths, 9 assists",
    ]);
    expect(tiles[0]!.textContent).toContain("4 of 5 Enemies");
  });

  it("lights this draft's heroes and leaves our hero out of his own row", () => {
    show([{ ...GAME, allies: [74, 8, 128, 99, 5].map((hero) => ({ hero, position: 1, lane: null })) }]);
    const faces = screen.getAllByRole("img").filter((i) => i.getAttribute("alt")?.startsWith("Hero"));
    const names = faces.map((f) => f.getAttribute("alt"));
    expect(names).not.toContain("Hero 74");
    const dim = faces.filter((f) => f.className.includes("grayscale")).map((f) => f.getAttribute("alt"));
    // Allies of this draft are 8 and 128 here; 99 and 5 are greyed. Every enemy of the sample is ours.
    expect(dim).toEqual(["Hero 99", "Hero 5"]);
  });

  it("lists finished items with their minute, not parts built right into a bigger item", () => {
    show([
      {
        ...GAME,
        buys: [
          [1, -60],
          [223, 640],
          [717, 1320],
        ],
      },
    ]);
    const tile = screen.getByRole("article");
    expect(tile.textContent).toContain("11");
    expect(tile.textContent).toContain("22");
    // Meteor Hammer was kept 11 minutes before Starforge, so both count; the basic part doesn't.
    expect(screen.getByRole("button", { name: "Meteor Hammer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Starforge" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Part" })).toBeNull();
  });

  it("shows nothing without games, and a buy before the horn as minute 0", () => {
    const { container } = show([]);
    expect(container.textContent).toBe("");
    expect(minutes(-89)).toBe(0);
    expect(minutes(640)).toBe(11);
  });
});
