import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DraftDone, type DoneHero, type GameControls } from "./start-game";

const ours: DoneHero[] = [
  { id: 8, name: "Juggernaut", isYou: true },
  { id: 74, name: "Invoker", player: "Deniz" },
  { id: 129, name: "Mars", player: null },
  { id: 128, name: "Snapfire" },
  { id: 50, name: "Dazzle" },
];
const theirs: DoneHero[] = [
  { id: 42, name: "Wraith King" },
  { id: 11, name: "Shadow Fiend" },
  { id: 2, name: "Axe" },
  { id: 14, name: "Pudge" },
  { id: 26, name: "Lion" },
];
const game = (over: Partial<GameControls> = {}): GameControls => ({
  ready: true,
  startedAt: null,
  busy: false,
  error: null,
  onStart: vi.fn(),
  onStop: vi.fn(),
  onOver: vi.fn(),
  ...over,
});

describe("DraftDone", () => {
  it("shows both teams with Radiant first, the player's hero and the final edge", () => {
    render(<DraftDone ours={ours} theirs={theirs} isDire={false} edge={14.2} game={null} />);
    expect(screen.getByRole("heading", { name: "All 10 Heroes Are In" })).toBeInTheDocument();
    const [left, right] = screen.getAllByRole("list");
    expect(left).toHaveAccessibleName("Radiant");
    expect(right).toHaveAccessibleName("Dire");
    expect(within(left!).getByText("Juggernaut").parentElement).toHaveTextContent("You");
    expect(within(left!).getByText("Deniz")).toBeInTheDocument();
    expect(screen.getByText("+14.2")).toBeInTheDocument();
    expect(screen.getByText("Points to You")).toBeInTheDocument();
    // Signed out: nothing to start.
    expect(screen.queryByRole("button", { name: "Start Game" })).not.toBeInTheDocument();
  });

  it("puts the enemy on the left on Dire, and names the enemy when the edge is theirs", () => {
    render(<DraftDone ours={ours} theirs={theirs} isDire edge={-3.1} game={null} />);
    const [left, right] = screen.getAllByRole("list");
    expect(left).toHaveAccessibleName("Radiant");
    expect(within(left!).getByText("Pudge")).toBeInTheDocument();
    expect(within(right!).getByText("Juggernaut")).toBeInTheDocument();
    expect(screen.getByText("−3.1")).toBeInTheDocument();
    expect(screen.getByText("Points to Enemy")).toBeInTheDocument();
  });

  it("names the teams Your Team and Enemy when the side is unknown", () => {
    render(<DraftDone ours={ours} theirs={theirs} isDire={null} edge={0} game={null} />);
    expect(screen.getAllByRole("list").map((l) => l.getAttribute("aria-label"))).toEqual(["Your Team", "Enemy"]);
  });

  it("starts the game once the board is saved", () => {
    const g = game();
    const { rerender } = render(<DraftDone ours={ours} theirs={theirs} isDire={false} edge={1} game={{ ...g, ready: false }} />);
    expect(screen.getByRole("button", { name: "Start Game" })).toBeDisabled();
    rerender(<DraftDone ours={ours} theirs={theirs} isDire={false} edge={1} game={g} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Game" }));
    expect(g.onStart).toHaveBeenCalledOnce();
  });

  it("after the start shows In Game with Game Over and Not Playing It", () => {
    const g = game({ startedAt: new Date().toISOString() });
    render(<DraftDone ours={ours} theirs={theirs} isDire={false} edge={1} game={g} />);
    expect(screen.getByText("In Game")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Game" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Game Over" }));
    fireEvent.click(screen.getByRole("button", { name: "Not Playing It" }));
    expect(g.onOver).toHaveBeenCalledOnce();
    expect(g.onStop).toHaveBeenCalledOnce();
  });
});
