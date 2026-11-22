import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ItemInfo } from "@/lib/engine/types";
import { GAME } from "@/lib/similar-games.sample";
import { ItemCardProvider } from "./item-card";
import { stackMarks } from "./similar-game-popup";
import { ClosestGames } from "./similar-game-tiles";

const item = (name: string, components: number[] = []): ItemInfo => ({ key: name, name, cost: 2000, img: `/${name}.png`, components });
const ITEMS: Record<string, ItemInfo> = { "1": item("Part"), "223": item("Meteor Hammer", [1]), "717": item("Starforge", [223, 1]) };
const PORTRAITS = Object.fromEntries([74, 8, 128, 129, 5, 11, 14, 26, 2, 44, 99].map((id) => [id, `/hero-${id}.png`]));
const heroName = (id: number) => `Hero ${id}`;

function open() {
  render(
    <ItemCardProvider items={ITEMS}>
      <ClosestGames
        games={[GAME]}
        hero={74}
        enemies={[11, 14, 26, 2, 44]}
        allies={[8, 128]}
        heroName={heroName}
        icons={PORTRAITS}
        items={ITEMS}
      />
    </ItemCardProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open Game" }));
  return screen.getByRole("dialog", { hidden: true });
}

describe("GamePopup", () => {
  it("opens from a tile with the lineup, four facts and a link to the match", () => {
    const d = open();
    expect(d.getAttribute("aria-label")).toBe("Hero 74, won, 40 min");
    const facts = within(d)
      .getAllByRole("definition", { hidden: true })
      .map((e) => e.textContent);
    expect(facts).toEqual(["11 / 2 / 9", "24,150", "37", String(GAME.deathsAt.filter(([at]) => at <= 900).length)]);
    const links = within(d).getAllByRole("link", { name: /OpenDota/, hidden: true });
    expect(links.every((a) => a.getAttribute("href")?.endsWith(`/matches/${GAME.match}`))).toBe(true);
  });

  it("puts finished items above the minute line and deaths below, with the killer", () => {
    const d = open();
    const line = within(d).getByRole("region", { name: "The game, minute by minute", hidden: true });
    expect(within(line).getByRole("img", { name: "Starforge", hidden: true })).toBeTruthy();
    expect(within(line).queryByRole("img", { name: "Meteor Hammer", hidden: true })).toBeNull();
    const [at, by] = GAME.deathsAt[0]!;
    const name = by ? `Died at ${Math.round(at / 60)} min to Hero ${by}` : `Died at ${Math.round(at / 60)} min`;
    expect(within(line).getByRole("img", { name, hidden: true })).toBeTruthy();
  });

  it("closes back to the tile", () => {
    const d = open();
    fireEvent(d, new Event("close"));
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    expect(document.activeElement?.textContent).toBe("Open Game");
  });
});

describe("stackMarks", () => {
  it("moves a mark to the next row only when it would touch the one before", () => {
    const marks = [0, 60, 600, 120].map((at) => ({ at, key: String(at) }));
    expect(stackMarks(marks, 1200, 10).map((m) => [m.at, m.row])).toEqual([
      [0, 0],
      [60, 1],
      [120, 0],
      [600, 0],
    ]);
  });
});
