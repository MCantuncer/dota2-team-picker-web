import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GamePlan } from "@/lib/engine/game-plan";
import { GamePlanPanel } from "./game-plan-panel";

const item = (itemId: number, name: string, minute: number, reason?: string) => ({ itemId, name, img: `/items/${itemId}.png`, minute, ...(reason ? { reason } : {}) });
const plan: GamePlan = {
  edge: 2.1,
  ourStyle: null,
  theirStyle: null,
  winCondition: "No single style: play around your strongest heroes.",
  lanes: [{ name: "Mid", ours: [2], theirs: [7], edge: 0.2, verdict: "even", text: "Even lane against Hero 7: the better last hits win it." }],
  ourCombos: [],
  fears: ["Hero 8 is their biggest threat: strong against Hero 1. Focus or lock them down first"],
  roadmap: [{ phase: "Laning (0 to 10 min)", text: "No lane is clearly yours: farm and trade evenly." }],
  players: [
    {
      heroId: 1,
      position: 1,
      job: "Farm and carry the late game.",
      build: {
        start: [item(44, "Tango", 0)],
        lane: [],
        core: [item(50, "Phase Boots", 9), item(116, "Black King Bar", 17, "Against Hero 8: buy it early")],
        situational: [],
      },
    },
    { heroId: 2, position: 2, job: "Win your lane.", build: null },
  ],
};

describe("GamePlanPanel", () => {
  it("shows the roadmap, the fears and each player's build in order with the reasons", () => {
    render(<GamePlanPanel plan={plan} heroName={(id) => `Hero ${id}`} icons={{}} playerNames={["Can", null]} />);
    expect(screen.getByRole("region", { name: "Game plan" })).toBeInTheDocument();
    expect(screen.getByText(/No lane is clearly yours/)).toBeInTheDocument();
    expect(screen.getByText(/Hero 8 is their biggest threat/)).toBeInTheDocument();
    const carry = screen.getByRole("listitem", { name: "Hero 1, position 1" });
    expect(within(carry).getByText(/Can/)).toBeInTheDocument();
    expect(within(carry).getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual(["Tango", "Phase Boots", "Black King Bar"]);
    expect(within(carry).getByText("Against Hero 8: buy it early")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "Hero 2, position 2" })).getByText("No item data for this hero yet.")).toBeInTheDocument();
  });

  it("puts the viewer's own card first", () => {
    render(<GamePlanPanel plan={plan} heroName={(id) => `Hero ${id}`} icons={{}} playerNames={[]} myPosition={2} />);
    const cards = screen.getAllByRole("listitem", { name: /position/ });
    expect(cards[0]).toHaveAccessibleName("Hero 2, position 2");
  });
});
