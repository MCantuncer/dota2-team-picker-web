import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BetterChance, type DraftOdds, rangeText } from "./better-chance";

const odds = (edge: number, chance: number | null = null): DraftOdds => ({
  edge,
  parts: { rates: edge - 1.4, matchups: 1.4, synergy: 0 },
  chance,
});

describe("BetterChance", () => {
  it("is hidden until a hero is picked on either side", () => {
    const { container } = render(<BetterChance now={odds(0)} plan={null} picked={0} side="radiant" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the draft edge now and with the plan, split into its parts, and names the favored side", () => {
    render(<BetterChance now={odds(14.2)} plan={odds(23.8)} picked={4} side="radiant" />);
    const band = screen.getByRole("region", {
      name: "Who Has the Better Chance",
    });
    expect(band).toHaveTextContent("Your Team Favored");
    expect(band).toHaveTextContent("Draft Edge Now, 4 Picks In");
    expect(screen.getByTestId("edge-now")).toHaveTextContent("+14.2");
    expect(screen.getByTestId("edge-plan")).toHaveTextContent("+23.8");
    expect(band).toHaveTextContent("Win Rates+12.8");
    expect(band).toHaveTextContent("Plan +22.4");
    expect(band).toHaveTextContent("A win percentage appears once the win model passes its check");
    expect(
      screen.getByRole("img", {
        name: "Your Team Favored: +14.2 now, +23.8 with the plan",
      }),
    ).toBeInTheDocument();
  });

  it("names the enemy when they are ahead, with a real minus sign, and leaves the plan out without one", () => {
    render(<BetterChance now={odds(-3.4)} plan={null} picked={1} side="dire" />);
    expect(screen.getByText("Enemy Favored")).toBeInTheDocument();
    expect(screen.getByTestId("edge-now")).toHaveTextContent("−3.4");
    expect(screen.getByText("Draft Edge Now, 1 Pick In")).toBeInTheDocument();
    expect(screen.queryByTestId("edge-plan")).not.toBeInTheDocument();
  });

  it("shows the win percentage instead once the win model gives one", () => {
    render(<BetterChance now={odds(2, 0.541)} plan={odds(4, 0.562)} picked={4} side="radiant" />);
    expect(screen.getByTestId("edge-now")).toHaveTextContent("54.1%");
    expect(screen.getByTestId("edge-plan")).toHaveTextContent("56.2%");
    expect(screen.getByText("Your Win Chance, 4 Picks In")).toBeInTheDocument();
    expect(screen.queryByText(/win percentage appears/)).not.toBeInTheDocument();
  });

  it("keeps my team on the left on Radiant, with the bar leaning left when my team is ahead", () => {
    render(<BetterChance now={odds(5)} plan={null} picked={4} side="radiant" />);
    expect(screen.getByTestId("chance-left")).toHaveTextContent("Your Team");
    expect(screen.getByTestId("chance-left")).toHaveClass("text-radiant");
    expect(screen.getByTestId("chance-right")).toHaveTextContent("Enemy");
    expect(screen.getByTestId("chance-fill")).toHaveClass("right-1/2", "bg-radiant-strong");
    expect(parseFloat(screen.getByTestId("chance-now").style.left)).toBeLessThan(50);
  });

  it("mirrors the bar on Dire: Enemy (Radiant) on the left, my team on the right, leaning right when I am ahead", () => {
    render(<BetterChance now={odds(5)} plan={null} picked={4} side="dire" />);
    expect(screen.getByTestId("chance-left")).toHaveTextContent("Enemy");
    expect(screen.getByTestId("chance-left")).toHaveClass("text-radiant");
    expect(screen.getByTestId("chance-right")).toHaveTextContent("Your Team");
    expect(screen.getByTestId("chance-right")).toHaveClass("text-dire");
    expect(screen.getByTestId("chance-fill")).toHaveClass("left-1/2", "bg-dire-strong");
    expect(parseFloat(screen.getByTestId("chance-now").style.left)).toBeGreaterThan(50);
  });

  it("leans toward the enemy on the left on Dire when the enemy is ahead", () => {
    render(<BetterChance now={odds(-5)} plan={null} picked={4} side="dire" />);
    expect(screen.getByTestId("chance-fill")).toHaveClass("right-1/2", "bg-radiant-strong");
    expect(parseFloat(screen.getByTestId("chance-now").style.left)).toBeLessThan(50);
  });

  it("puts the win range up front once the draft is full, with the range drawn on the bar and no plan", () => {
    const range = { won: 0.61, low: 0.6, high: 0.62, games: 1377 };
    render(<BetterChance now={odds(14)} plan={odds(20)} picked={10} side="radiant" range={range} />);
    expect(screen.getByText("Teams With Drafts Like This Won")).toBeInTheDocument();
    expect(screen.getByTestId("edge-now")).toHaveTextContent("60% to 62%");
    expect(screen.getByText("Draft edge +14.0 points, from 1,377 ranked games")).toBeInTheDocument();
    expect(screen.getByText("Your Team Favored")).toBeInTheDocument();
    expect(screen.queryByTestId("edge-plan")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Your Team Favored: teams with drafts like this won 60% to 62%" }),
    ).toBeInTheDocument();
    // On Radiant my team is on the left: 61% puts the dot 11% left of the middle, the box from 10% to 12% left of it.
    expect(parseFloat(screen.getByTestId("chance-now").style.left)).toBeCloseTo(39);
    expect(parseFloat(screen.getByTestId("chance-range").style.left)).toBeCloseTo(38);
    expect(parseFloat(screen.getByTestId("chance-range").style.width)).toBeCloseTo(2);
    expect(screen.getByText("What Moves It")).toBeInTheDocument();
    expect(screen.queryByText(/appears once/)).not.toBeInTheDocument();
  });

  it("names the enemy when teams like mine lost more than they won, and mirrors the range on Dire", () => {
    const range = { won: 0.42, low: 0.4, high: 0.44, games: 925 };
    render(<BetterChance now={odds(-9)} plan={null} picked={10} side="dire" range={range} />);
    expect(screen.getByText("Enemy Favored")).toBeInTheDocument();
    expect(screen.getByTestId("edge-now")).toHaveTextContent("40% to 44%");
    // On Dire my team is on the right, so losing more than winning moves the dot left of the middle.
    expect(parseFloat(screen.getByTestId("chance-now").style.left)).toBeCloseTo(42);
  });

  it("says when the range will show while the draft is not full", () => {
    render(<BetterChance now={odds(3)} plan={null} picked={6} side="radiant" rangeLater />);
    expect(screen.getByText(/Once all 10 heroes are in and your side is set/)).toBeInTheDocument();
  });
});

describe("rangeText", () => {
  it("gives whole percents, or one number when both ends round the same", () => {
    expect(rangeText({ won: 0.553, low: 0.541, high: 0.566, games: 1 })).toBe("54% to 57%");
    expect(rangeText({ won: 0.553, low: 0.551, high: 0.554, games: 1 })).toBe("About 55%");
  });
});
