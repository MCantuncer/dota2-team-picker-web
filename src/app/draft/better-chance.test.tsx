import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BetterChance, type DraftOdds } from "./better-chance";

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
    const band = screen.getByRole("region", { name: "Who Has the Better Chance" });
    expect(band).toHaveTextContent("Your Team Favored");
    expect(band).toHaveTextContent("Draft Edge Now, 4 Picks In");
    expect(screen.getByTestId("edge-now")).toHaveTextContent("+14.2");
    expect(screen.getByTestId("edge-plan")).toHaveTextContent("+23.8");
    expect(band).toHaveTextContent("Win Rates+12.8");
    expect(band).toHaveTextContent("Plan +22.4");
    expect(band).toHaveTextContent("A win percentage appears once the win model passes its check");
    expect(screen.getByRole("img", { name: "Your Team Favored: +14.2 now, +23.8 with the plan" })).toBeInTheDocument();
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
});
