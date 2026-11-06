import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextSkillShowcase, type SkillChoice } from "./next-skill-showcase";

const choice = (wex: number, exort: number): SkillChoice => ({
  level: 5,
  games: 20,
  players: "winning high-rank mid Invokers",
  against: "Pudge or Anti-Mage",
  wex: { orb: "wex", name: "Wex", took: wex },
  exort: { orb: "exort", name: "Exort", took: exort },
});

describe("NextSkillShowcase", () => {
  it("takes the orb most players took and says why with the numbers", () => {
    const { container } = render(<NextSkillShowcase choice={choice(3, 15)} />);
    const panel = screen.getByRole("region", { name: "Example skill choice" });
    expect(panel.textContent).toContain("Next Skill at Level 5");
    expect(panel.textContent).toContain("15 of 20 winning high-rank mid Invokers against Pudge or Anti-Mage took it.");
    expect(container.querySelector(".ns-row.ns-picked")?.textContent).toBe("Exort75%");
    expect(container.querySelector(".ns-orb-exort")?.classList).toContain("ns-picked");
    expect(container.querySelector(".ns-orb-wex")?.classList).toContain("ns-passed");
    expect(container.querySelector(".ns-leader")).not.toBeNull();
  });

  it("takes Wex when more players took Wex, without the line to the Exort orb", () => {
    const { container } = render(<NextSkillShowcase choice={choice(12, 6)} />);
    expect(container.querySelector(".ns-orb-wex")?.classList).toContain("ns-picked");
    expect(container.querySelector(".ns-row.ns-picked")?.textContent).toBe("Wex60%");
    expect(container.querySelector(".ns-leader")).toBeNull();
  });
});
