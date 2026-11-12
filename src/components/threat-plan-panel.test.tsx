import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { DraftThreat } from "@/lib/engine/threat-plan";
import { ThreatPlanPanel, threatVerdict } from "./threat-plan-panel";

const hero = (id: number) => ({ name: `Hero ${id}` });
const step = (games: number, winRate: number) => ({ games, winRate });

const threat = (have: number[], extra: Partial<DraftThreat> = {}): DraftThreat => ({
  hero: 8,
  position: 1,
  plan: { hero: 8, answers: [], stair: [step(19280, 57.6), step(17420, 52.1), step(6766, 46)], drop: 10.9, dropLow: 9.5, length: [] },
  have: have.map((h) => ({ hero: h, edge: -5 })),
  step: Math.min(2, have.length) as 0 | 1 | 2,
  open: [],
  // Hero 3 in his lane: he lost 53.1% of these lanes against 38.0% of all his lanes. Hero 4 changes little.
  lanes: [
    { ally: 3, with: [840, 146, 248, 446], usual: [10000, 3820, 2380, 3800] },
    { ally: 4, with: [1000, 380, 240, 380], usual: [10000, 3820, 2380, 3800] },
  ],
  length: {
    his: [step(100, 44), step(100, 44.4), step(100, 51), step(100, 57.7), step(100, 59.5)],
    group: [step(100, 47), step(100, 49.2), step(100, 50.9), step(100, 51.8), step(100, 51.5)],
  },
  ...extra,
});

describe("threatVerdict", () => {
  it("counts your answers and names a laner who beats his lane", () => {
    expect(threatVerdict(threat([1, 2, 3]), hero)).toBe("Three of his answers are in your draft, and Hero 3 is in his lane.");
    expect(threatVerdict(threat([1], { lanes: [] }), hero)).toBe("One of his answers is in your draft.");
    expect(threatVerdict(threat([], { lanes: [] }), hero)).toBe("None of his answers are in your draft.");
  });
});

describe("ThreatPlanPanel", () => {
  it("shows your answers, his lane, his timing and the game length as facts", () => {
    render(
      <ThreatPlanPanel
        threats={[threat([1, 2], {
          pace: {
            itemId: 147,
            minute: 16,
            early: step(5642, 69.1),
            late: step(5311, 42.9),
            minutes: [[13, 100, 75], [16, 200, 100], [18, 100, 45]],
          },
        })]}
        hero={hero}
        items={{ 147: { key: "manta", name: "Manta Style", cost: 4650, img: "", components: [] } }}
      />,
    );
    const panel = screen.getByRole("region", { name: "Game Plan Against Hero 8" });
    expect(panel).toHaveTextContent("You have Hero 1 and Hero 2. He wins 46.0% against teams with two or more of his answers, and 57.6% against teams with none.");
    expect(panel).toHaveTextContent("With Hero 3 in his lane, he lost 53.1% of his lanes. He usually loses 38.0%.");
    expect(panel).toHaveTextContent("Manta Style, is usually done at 16 minutes. In games where it was done by 14 he won 69.1%; at 17 to 19, 42.9%.");
    expect(panel).toHaveTextContent("This shows when, not why");
    expect(panel).toHaveTextContent("His win rate goes from 44.0% in games under 30 minutes to 59.5% past 45. The average carry goes from 47.0% to 51.5%.");
    expect(screen.getByRole("img", { name: /^His win rate against teams with no answers 57\.6%, one 52\.1%, two or more 46\.0%\. Your team: two or more\.$/ })).toBeInTheDocument();
  });

  it("leaves out the rows it has no data for", () => {
    render(<ThreatPlanPanel threats={[threat([], { lanes: [], length: { his: [], group: [] } })]} hero={hero} />);
    const panel = screen.getByRole("region", { name: "Game Plan Against Hero 8" });
    expect(panel).toHaveTextContent("You have none of his answers.");
    expect(panel).not.toHaveTextContent("His Lane");
    expect(panel).not.toHaveTextContent("His Timing");
    expect(panel).not.toHaveTextContent("Game Length");
    // One dangerous enemy needs no row of tiles.
    expect(screen.queryByRole("list", { name: "Dangerous Enemies" })).toBeNull();
  });

  it("gives the average carry line only next to a carry", () => {
    render(<ThreatPlanPanel threats={[threat([], { position: 3 })]} hero={hero} />);
    expect(screen.getByRole("region", { name: "Game Plan Against Hero 8" })).not.toHaveTextContent("The average carry");
  });

  it("switches the plan from the row of dangerous enemies", async () => {
    const other = threat([], { hero: 9, position: 3, plan: { ...threat([]).plan, hero: 9 } });
    render(<ThreatPlanPanel threats={[threat([1, 2]), other]} hero={hero} />);
    const tiles = within(screen.getByRole("list", { name: "Dangerous Enemies" })).getAllByRole("button");
    expect(tiles.map((t) => t.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    await userEvent.click(tiles[1]!);
    expect(screen.getByRole("region", { name: "Game Plan Against Hero 9" })).toHaveTextContent("You have none of his answers.");
  });
});
