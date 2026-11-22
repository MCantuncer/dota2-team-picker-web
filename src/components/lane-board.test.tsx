import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LanePlan, PlayerPlan } from "@/lib/engine/game-plan";
import type { Position } from "@/lib/engine/types";
import { keyItemLateLine, playerPair, PlayerLine } from "./lane-board";

const safe: LanePlan = {
  name: "Safe lane",
  ours: [8, 5],
  theirs: [2, 14],
  edge: 2,
  verdict: "win",
  text: "Winning lane.",
  pairs: [
    { hero: 8, enemy: 2, games: 900, won: 400, drawn: 200, lost: 300, weight: 0.4, allRanks: true },
    { hero: 8, enemy: 14, games: 800, won: 300, drawn: 200, lost: 300, weight: 0.9, allRanks: true },
  ],
};
const LATE = "No Blink Dagger by 20 min? 31 of 48 high-rank wins without it bought Witch Blade next, around 18 min.";
const player = (heroId: number, position: Position): PlayerPlan => ({
  heroId,
  position,
  job: "Your timing is Blink Dagger at 19 min.",
  fallbacks: [LATE],
  fallbackSituations: ["keyItemLate"],
  enemies: [],
  threatRows: [],
  build: null,
});
describe("playerPair", () => {
  it("takes the enemy the player meets most: the highest weight among their hero's pairs", () => {
    expect(playerPair(safe, 8)?.enemy).toBe(14);
    expect(playerPair(safe, 5)).toBeUndefined();
  });
});

describe("PlayerLine", () => {
  it("keeps the player's line and the measured fallback", () => {
    render(<PlayerLine player={player(13, 2)} />);
    expect(screen.getByText("Your timing is Blink Dagger at 19 min.")).toBeInTheDocument();
    expect(screen.getByText(LATE)).toBeInTheDocument();
  });

  it("draws nothing when nothing is known about the player", () => {
    const { container } = render(<PlayerLine player={{ ...player(13, 2), job: "", fallbacks: [], fallbackSituations: undefined }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("leaves the late key item line to the Game Clock for the viewer, and keeps it for a teammate", () => {
    const late: PlayerPlan = { ...player(13, 2), keyItem: { itemId: 1, name: "Blink Dagger", lateMinute: 20 } };
    const { rerender } = render(<PlayerLine player={late} onClock />);
    expect(screen.queryByText(/No Blink Dagger by 20 min/)).toBeNull();
    expect(screen.queryByText("If It Goes Wrong")).toBeNull();
    rerender(<PlayerLine player={late} />);
    expect(screen.getByText(LATE)).toBeInTheDocument();
  });
});

describe("keyItemLateLine", () => {
  it("finds the key item's late line by its situation, only when the key item has a late minute", () => {
    const p: PlayerPlan = { ...player(8, 1), fallbacks: ["B"], fallbackSituations: ["keyItemLate"], keyItem: { itemId: 1, name: "Battle Fury", lateMinute: 16 } };
    expect(keyItemLateLine(p)).toBe("B");
    expect(keyItemLateLine({ ...p, keyItem: { itemId: 1, name: "Battle Fury" } })).toBeUndefined();
    expect(keyItemLateLine({ ...p, fallbackSituations: undefined })).toBeUndefined();
  });
});
