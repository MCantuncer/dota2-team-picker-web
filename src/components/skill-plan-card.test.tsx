import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SkillPlan } from "@/lib/engine/skill-plan";
import { SkillPlanCard } from "./skill-plan-card";

const plan: SkillPlan = {
  levels: [1, 2, 0, 10, 99],
  names: { 1: "Storm Hammer", 2: "Great Cleave", 10: "+2 Mana Regen", 11: "+15 Damage", 12: "+20% Cleave", 13: "+8 Strength" },
  buildReason: "78 of 120 high-rank wins this patch (65%) used this order, and the wider totals agree.",
  talents: [
    {
      tier: 0,
      level: 10,
      options: [
        { id: 10, name: "+2 Mana Regen" },
        { id: 11, name: "+15 Damage" },
      ],
      pick: 11,
      usual: 10,
      result: "recommended",
      reason: "Take +15 Damage against Lion or Zeus: it did better than +2 Mana Regen, which most players take (55% of 110 recent games).",
      odds: "5.6x the odds · 130 games",
    },
    {
      tier: 1,
      level: 15,
      options: [
        { id: 12, name: "+20% Cleave" },
        { id: 13, name: "+8 Strength" },
      ],
      pick: null,
      usual: null,
      result: "no-data",
      reason: "No talent picks recorded for level 15 yet, so there is no usual pick.",
    },
  ],
  note: "Odds compare the two talents in high-rank games against these heroes, adjusted toward all games when there are few.",
  live: "ready",
};
const abilities = {
  abilities: [{ id: 1, key: "sven_storm_bolt", name: "Storm Hammer", slot: 1, maxLevel: 4, ultimate: false }],
  talents: [],
};

describe("SkillPlanCard", () => {
  it("shows the order level by level, with icons where the ability is known", () => {
    render(<SkillPlanCard plan={plan} abilities={abilities} />);
    const order = within(screen.getByRole("list", { name: "Skill order" })).getAllByRole("listitem");
    expect(order.map((li) => li.textContent)).toEqual(["Level 1:1", "Level 2:G2", "Level 3:·3", "Level 4:T4", "Level 5:+5"]);
    expect(within(order[0]!).getByRole("img", { name: "Storm Hammer" })).toBeInTheDocument(); // Five levels above.
    expect(within(order[4]!).getByRole("img", { name: "Attributes" })).toBeInTheDocument(); // Five levels above.
    expect(screen.getByText(plan.buildReason)).toBeInTheDocument();
  });

  it("puts level 25 on top, marks this game's talent and the usual one, and gives each tier its reason", () => {
    render(<SkillPlanCard plan={plan} />);
    const tiers = within(screen.getByRole("list", { name: "Talent tree" })).getAllByRole("listitem");
    expect(tiers.map((li) => li.textContent?.slice(0, 8))).toEqual(["Level 15", "Level 10"]);
    expect(screen.getByText("(take this)").parentElement).toHaveTextContent("+15 Damage");
    expect(within(tiers[1]!).getByText("Usual")).toBeInTheDocument();
    // The odds, never raw wins and losses (Can 2026-11-02).
    expect(within(tiers[1]!).getByText("5.6x the odds · 130 games")).toBeInTheDocument();
    expect(tiers[1]!.textContent).not.toMatch(/\d+ won|lost/);
    expect(screen.getByText("Best for This Game")).toBeInTheDocument();
    // No usual pick at level 15, so neither side is marked.
    expect(within(tiers[0]!).queryByText("(take this)")).toBeNull();
    expect(screen.getByText("No Data")).toBeInTheDocument();
    expect(screen.queryByText(/Loading|Sign in/)).toBeNull();
  });

  it("names the talent a tier leans to", () => {
    const leaning = { ...plan.talents[0]!, pick: 10, result: "leaning" as const }; // Set above.
    render(<SkillPlanCard plan={{ ...plan, talents: [leaning] }} />);
    expect(screen.getByText("Leaning +15 Damage")).toBeInTheDocument();
  });

  it("says once while the games load, and when the viewer must sign in", () => {
    const { rerender } = render(<SkillPlanCard plan={{ ...plan, live: "loading", note: undefined }} />);
    expect(screen.getAllByText("Loading games against these enemies…")).toHaveLength(1);
    rerender(<SkillPlanCard plan={{ ...plan, live: "sign-in", note: undefined }} />);
    expect(screen.getByText("Sign in to compare talents against these enemies.")).toBeInTheDocument();
  });
});
