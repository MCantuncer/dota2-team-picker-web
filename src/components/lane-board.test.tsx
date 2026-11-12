import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LanePlan, PlayerPlan } from "@/lib/engine/game-plan";
import type { Position } from "@/lib/engine/types";
import { LaneBoard, playerPair } from "./lane-board";

const mid: LanePlan = {
  name: "Mid",
  ours: [13],
  theirs: [11],
  edge: -2,
  verdict: "hard",
  text: "Hard lane against Hero 11: farm safely.",
  pairs: [{ hero: 13, enemy: 11, games: 1251, won: 275, drawn: 313, lost: 663, weight: 0.97 }],
};
const safe: LanePlan = {
  name: "Safe lane",
  ours: [8, 5],
  theirs: [2, 14],
  edge: 2,
  verdict: "win",
  text: "Won lane.",
  pairs: [
    { hero: 8, enemy: 2, games: 900, won: 400, drawn: 200, lost: 300, weight: 0.4, allRanks: true },
    { hero: 8, enemy: 14, games: 800, won: 300, drawn: 200, lost: 300, weight: 0.9, allRanks: true },
  ],
};
const player = (heroId: number, position: Position): PlayerPlan => ({ heroId, position, job: "Win your lane.", fallbacks: ["Lane lost? Stop contesting runes."], enemies: [], threatRows: [], build: null });
const board = (heroId: number, position: Position) =>
  render(<LaneBoard lanes={[safe, mid]} player={player(heroId, position)} heroName={(id) => `Hero ${id}`} icons={{}} />);

describe("playerPair", () => {
  it("takes the enemy the player meets most: the highest weight among their hero's pairs", () => {
    expect(playerPair(safe, 8)?.enemy).toBe(14);
    expect(playerPair(safe, 5)).toBeUndefined();
  });
});

describe("LaneBoard", () => {
  it("draws the player's pair as won, even and lost shares with the lane count", () => {
    board(13, 2);
    expect(screen.getByText("Lane: Hard")).toBeInTheDocument();
    expect(screen.getByText("Hero 13 Won").nextSibling).toHaveTextContent("22%");
    expect(screen.getByText("Even").nextSibling).toHaveTextContent("25%");
    expect(screen.getByText("Hero 11 Won").nextSibling).toHaveTextContent("53%");
    expect(screen.getByText(/lanes of Hero 13 against Hero 11/)).toHaveTextContent("1,251 lanes of Hero 13 against Hero 11");
    expect(screen.getByText("Lane results at your rank")).toBeInTheDocument();
    // The enemy laner's role is named for the enemy, with the role name, never "Pos 2".
    expect(screen.getByText("Enemy")).toHaveTextContent("Enemy");
    expect(screen.getAllByText("Mid").length).toBeGreaterThan(0);
  });

  it("says when the lane results are from every rank, and names the lit lane in the map", () => {
    board(8, 1);
    expect(screen.getByText("Lane results from all ranks")).toBeInTheDocument();
    expect(screen.getByText("Hero 14 Won")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Lane map: Safe Lane won (yours), Mid hard." })).toBeInTheDocument();
  });

  it("keeps the lane line, the job and the fallbacks", () => {
    board(13, 2);
    const lanes = screen.getByRole("region", { name: "Lanes" });
    expect(within(lanes).getByText("Hard lane against Hero 11: farm safely.")).toBeInTheDocument();
    expect(within(lanes).getByText("Win your lane.")).toBeInTheDocument();
    expect(within(lanes).getByText("Lane lost? Stop contesting runes.")).toBeInTheDocument();
  });

  it("shows no bar without lane results", () => {
    render(<LaneBoard lanes={[{ ...mid, pairs: undefined }]} player={player(13, 2)} heroName={(id) => `Hero ${id}`} icons={{}} />);
    expect(screen.queryByText("Hero 13 Won")).toBeNull();
    expect(screen.queryByText(/Lane results/)).toBeNull();
  });
});
