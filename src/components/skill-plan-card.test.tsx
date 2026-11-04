import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { SkillPlan } from "@/lib/engine/skill-plan";
import { SkillPlanCard, skillRows } from "./skill-plan-card";

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

describe("SkillPlanCard", () => {
  it("shows the order as the game's grid: a row per ability in hotkey order, the attribute bonus and the talents", () => {
    const order = { ...plan, levels: [1, 2, 1, 2, 1, 3, 1, 2, 2, 10, 3, 99] };
    const abilities = {
      abilities: [
        { id: 1, key: "sven_storm_bolt", name: "Storm Hammer", slot: 1, maxLevel: 4, ultimate: false },
        { id: 2, key: "sven_great_cleave", name: "Great Cleave", slot: 2, maxLevel: 4, ultimate: false },
        { id: 4, key: "sven_warcry", name: "Warcry", slot: 3, maxLevel: 4, ultimate: false },
        { id: 3, key: "sven_gods_strength", name: "God's Strength", slot: 6, maxLevel: 3, ultimate: true },
      ],
      talents: [],
    };
    const names = { ...plan.names, 2: "Great Cleave", 3: "God's Strength", 4: "Warcry" };
    render(<SkillPlanCard plan={{ ...order, names }} abilities={abilities} />);
    const grid = screen.getByRole("table", { name: "Skill order" });
    const rows = within(grid).getAllByRole("rowheader").map((th) => th.textContent?.replace(/^[+T](?=[A-Z])/, ""));
    expect(rows).toEqual([
      "Storm Hammer, levels 1, 3, 5, 7",
      "Great Cleave, levels 2, 4, 8, 9",
      "Warcry, no points",
      "God's Strength, levels 6, 11",
      "Attributes, levels 12",
      "Talents, levels 10",
    ]);
    // Each row has a cell per level, numbered where the point goes.
    const storm = within(grid).getAllByRole("row")[1]!; // Row 0 is the header.
    expect(within(storm).getAllByRole("cell").map((td) => td.textContent)).toEqual(["1", "", "3", "", "5", "", "7", "", "", "", "", ""]);
    expect(screen.getByText(plan.buildReason)).toBeInTheDocument();
  });

  it("shows no grid without a build", () => {
    render(<SkillPlanCard plan={{ ...plan, levels: null }} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(skillRows({ ...plan, levels: null })).toEqual([]);
  });

  it("puts level 25 on top, underlines this game's talent and gives the odds, never raw wins and losses", () => {
    render(<SkillPlanCard plan={plan} />);
    const tiers = within(screen.getByRole("list", { name: "Talent tree" })).getAllByRole("listitem");
    expect(within(tiers[0]!).getByRole("button").textContent).toBe("+20% CleaveLevel 15+8 Strength"); // Two tiers.
    expect(within(tiers[1]!).getByRole("button", { name: "Level 10: +2 Mana Regen or +15 Damage, take +15 Damage, 5.6x the odds · 130 games" })).toBeInTheDocument();
    expect(tiers[1]!.textContent).toBe("+2 Mana RegenUsual PickLevel 10+15 Damage (take this)5.6x the odds · 130 games");
    expect(tiers[1]!.textContent).not.toMatch(/\d+ won|lost/); // Two tiers above.
    // No usual pick at level 15, so neither side is marked.
    expect(within(tiers[0]!).queryByText("(take this)")).toBeNull(); // Two tiers above.
    expect(screen.queryByText(/Loading|Sign in/)).toBeNull();
  });

  it("shows why for the tier this game changes, and for any level picked", async () => {
    render(<SkillPlanCard plan={plan} />);
    expect(screen.getByText("Why +15 Damage at 10:").parentElement).toHaveTextContent(plan.talents[0]!.reason); // Set above.
    await userEvent.click(screen.getByRole("button", { name: /^Level 15/ }));
    expect(screen.getByText("Level 15:").parentElement).toHaveTextContent("No talent picks recorded for level 15");
    expect(screen.getByRole("button", { name: /^Level 15/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("puts the odds under the other talent when the games only lean to it", () => {
    const leaning = { ...plan.talents[0]!, pick: 10, result: "leaning" as const }; // Set above.
    render(<SkillPlanCard plan={{ ...plan, talents: [leaning] }} />);
    const tier = within(screen.getByRole("list", { name: "Talent tree" })).getByRole("listitem");
    expect(tier.textContent).toBe("+2 Mana Regen (take this)Usual PickLevel 10+15 Damage5.6x the odds · 130 games");
  });

  it("says once while the games load, and when the viewer must sign in", () => {
    const { rerender } = render(<SkillPlanCard plan={{ ...plan, live: "loading", note: undefined }} />);
    expect(screen.getAllByText("Loading games against these enemies…")).toHaveLength(1);
    rerender(<SkillPlanCard plan={{ ...plan, live: "sign-in", note: undefined }} />);
    expect(screen.getByText("Sign in to compare talents against these enemies.")).toBeInTheDocument();
  });
});
