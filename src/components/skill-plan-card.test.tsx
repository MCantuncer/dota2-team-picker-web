import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SkillPlan } from "@/lib/engine/skill-plan";
import { SkillPlanCard } from "./skill-plan-card";

const plan: SkillPlan = {
  levels: [1, 2, 0, 10],
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
    expect(order.map((li) => li.getAttribute("title"))).toEqual([
      "Level 1: Storm Hammer",
      "Level 2: Great Cleave",
      "Level 3: No point",
      "Level 4: +2 Mana Regen",
    ]);
    expect(within(order[0]!).getByRole("img", { name: "Storm Hammer" })).toBeInTheDocument(); // Four levels above.
    expect(screen.getByText(plan.buildReason)).toBeInTheDocument();
  });

  it("marks this game's talent and gives each tier its reason", () => {
    render(<SkillPlanCard plan={plan} />);
    expect(screen.getByText("+15 Damage")).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("+2 Mana Regen")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Best for This Game.")).toBeInTheDocument();
    expect(screen.getByText(/\+15 Damage won 60 and lost 15/)).toBeInTheDocument();
    // No usual pick at level 15, so neither side is marked.
    expect(screen.getByText("+8 Strength")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("No Data.")).toBeInTheDocument();
    expect(screen.getByText(plan.note!)).toBeInTheDocument(); // Set above.
  });

  it("says while the games against these enemies load", () => {
    render(<SkillPlanCard plan={{ ...plan, live: "loading", note: undefined }} />);
    expect(screen.getByText("Loading games against these enemies…")).toBeInTheDocument();
  });
});
