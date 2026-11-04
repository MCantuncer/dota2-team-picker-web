import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlayerRecord } from "@/lib/player-record";
import { YourGamesCard } from "./your-games-card";

const record: PlayerRecord = {
  games: 23,
  wins: 13,
  parsed: 19,
  firstAt: "2026-10-28T10:00:00Z",
  lastAt: "2026-11-03T10:00:00Z",
  topHero: { id: 114, games: 9, wins: 6 },
  latest: [true, false, true],
};

describe("YourGamesCard", () => {
  it("sums up the feedback and the latest results", () => {
    render(<YourGamesCard record={record} strengths={2} problems={1} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/my-heroes/games");
    expect(link.textContent).toContain("2 strengths and 1 problem from your last 23 games. Won 57%.");
    expect(link.textContent).toContain("Last 3 games, newest first: won, lost, won");
  });

  it("explains itself before any game is read", () => {
    render(<YourGamesCard record={null} strengths={0} problems={0} />);
    expect(screen.getByRole("link").textContent).toContain("New games show within 30 minutes.");
  });
});
