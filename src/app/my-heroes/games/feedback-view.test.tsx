import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Finding, PlayerFeedback } from "@/lib/player-feedback";
import { FeedbackView } from "./feedback-view";

const problem: Finding = {
  kind: "early_deaths",
  tone: "problem",
  headline: "Early deaths are costing your lanes",
  happened: ["Lina: died at 6:20 to Ember Spirit (210 gold lost, 18s dead)"],
  pattern: "4 of your 6 early deaths came after a power rune spawn (6:00, 8:00), with the enemy mid getting the kill.",
  cost: "1260 gold lost and 108 seconds dead before 10 minutes.",
  change: "Most early deaths came from Ember Spirit.",
  matchIds: [1],
};
const strength: Finding = {
  kind: "farm",
  tone: "strength",
  headline: "Strong farm",
  happened: [],
  pattern: "Across 5 games on Lina, you had higher farm than 80% of games on these heroes on OpenDota (all ranks).",
  cost: null,
  change: null,
  matchIds: [1],
};
const feedback = (over: Partial<PlayerFeedback> = {}): PlayerFeedback => ({
  strengths: [strength],
  problems: [problem],
  improved: [],
  games: 6,
  parsedGames: 5,
  firstGameAt: "2026-10-25T10:00:00Z",
  lastGameAt: "2026-11-02T10:00:00Z",
  updatedAt: "2026-11-03T01:00:00Z",
  ...over,
});

describe("FeedbackView", () => {
  it("shows strengths and problems with the layers behind each problem", () => {
    render(<FeedbackView feedback={feedback()} />);
    const strengths = screen.getByRole("region", { name: "Strengths" });
    expect(within(strengths).getByRole("heading", { name: "Strong farm" })).toBeTruthy();
    const problems = screen.getByRole("region", { name: "Problems" });
    expect(within(problems).getByText(problem.pattern!)).toBeTruthy();
    for (const part of ["What Happened", "What It Cost", "What to Change"]) {
      expect(within(problems).getByRole("heading", { name: part })).toBeTruthy();
    }
    expect(within(problems).getByText(problem.change!)).toBeTruthy();
  });

  it("lists last week's problems that are gone", () => {
    render(
      <FeedbackView
        feedback={feedback({
          improved: [{ kind: "deaths", headline: "Too many deaths" }],
        })}
      />,
    );
    const improved = screen.getByRole("region", {
      name: "Better Than Last Week",
    });
    expect(improved.textContent).toContain("Too many deaths: gone this week");
  });

  it("says so when nothing stood out", () => {
    render(<FeedbackView feedback={feedback({ strengths: [], problems: [] })} />);
    expect(screen.getByRole("status").textContent).toContain("Nothing stood out in these games");
    expect(screen.queryByRole("region", { name: "Problems" })).toBeNull();
  });
});
