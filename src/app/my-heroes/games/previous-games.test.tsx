import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GameRow } from "@/lib/player-games";
import { PreviousGames } from "./previous-games";

const game = (over: Partial<GameRow> = {}): GameRow => ({
  matchId: 1,
  heroId: 114,
  position: 1,
  isWin: true,
  startedAt: "2026-11-02T10:00:00Z",
  durationS: 2045,
  status: "parsed",
  kills: 9,
  deaths: 2,
  assists: 7,
  goldPerMin: 712,
  note: { kind: "early_deaths", tone: "problem", text: "2 deaths before 10 minutes" },
  ...over,
});
const heroes = new Map([
  [114, { name: "Monkey King" }],
  [25, { name: "Lina" }],
]);
const noFilters = { heroId: null, position: null, result: null, page: 1 };

describe("PreviousGames", () => {
  it("lists each game with its result, KDA and main point", () => {
    render(
      <PreviousGames
        rows={[game(), game({ matchId: 2, heroId: 25, isWin: false, position: null, note: null, status: "waiting_parse" })]}
        total={2}
        filters={noFilters}
        heroes={heroes}
        heroOptions={[114, 25]}
      />,
    );
    const [first, second] = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(first.textContent).toContain("Monkey King");
    expect(first.textContent).toContain("Carry");
    expect(first.textContent).toContain("Won");
    expect(first.textContent).toContain("2 Nov · 34:05");
    expect(first.textContent).toContain("9/2/7");
    expect(first.textContent).toContain("2 deaths before 10 minutes");
    expect(within(first).getByRole("link", { name: "Monkey King won on 2 Nov" }).getAttribute("href")).toBe("/my-heroes/games/1");
    expect(second.textContent).toContain("Position unknown");
    expect(second.textContent).toContain("Waiting for OpenDota to parse this game");
    expect(screen.getByRole("combobox", { name: "Hero" }).textContent).toBe("All HeroesLinaMonkey King");
  });

  it("pages through older games and keeps the filters", () => {
    render(
      <PreviousGames
        rows={[game()]}
        total={45}
        filters={{ ...noFilters, heroId: 114, page: 2 }}
        heroes={heroes}
        heroOptions={[114]}
      />,
    );
    const pages = screen.getByRole("navigation", { name: "Pages" });
    expect(within(pages).getByText("Page 2 of 3")).toBeTruthy();
    expect(within(pages).getByRole("link", { name: "Older Games" }).getAttribute("href")).toBe(
      "/my-heroes/games?hero=114&page=3",
    );
    expect(within(pages).getByRole("link", { name: "Newer Games" }).getAttribute("href")).toBe("/my-heroes/games?hero=114");
    expect(screen.getByRole("link", { name: "Clear" })).toBeTruthy();
  });

  it("says when no game matches the filters", () => {
    render(<PreviousGames rows={[]} total={0} filters={{ ...noFilters, result: "won" }} heroes={heroes} heroOptions={[]} />);
    expect(screen.getByRole("status").textContent).toBe("No games match these filters.");
  });
});
