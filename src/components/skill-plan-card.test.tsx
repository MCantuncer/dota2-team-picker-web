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
      reason: "Against Lion or Zeus (any of them): +2 Mana Regen won 15 and lost 40, +15 Damage won 60 and lost 15.",
      sides: [
        { id: 10, wins: 15, losses: 40 },
        { id: 11, wins: 60, losses: 15 },
      ],
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
  note: "Games were picked as about half wins and half losses, so only the comparison between the two talents counts.",
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
    expect(within(tiers[1]!).getByText("Usual", { exact: false })).toHaveTextContent("15 won, 40 lost · Usual");
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
