import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoveMark, PickWhy } from "./pick-why";

describe("PickWhy", () => {
  it("shows every line, the tags and the score split", () => {
    render(
      <PickWhy
        suggestion={{
          reasons: ["Beats Axe (+3.1, likely your lane)", "Watch out: loses to Viper (-2.2)"],
          tags: ["Favorite (+1.5)"],
          summary: "Score +7.0: +3.5 from this draft, +3.5 from meta, role and comfort",
        }}
      />,
    );
    expect(screen.getByText("Beats Axe (+3.1, likely your lane)")).toBeTruthy();
    expect(screen.getByText("Watch out: loses to Viper (-2.2)").className).toContain("text-warn");
    expect(screen.getByText("Favorite (+1.5)")).toBeTruthy();
    expect(screen.getByText(/from this draft/)).toBeTruthy();
  });

  it("shows a move mark only when the hero moved", () => {
    const { container } = render(<MoveMark move={undefined} />);
    expect(container.textContent).toBe("");
    render(<MoveMark move="Up 2" />);
    expect(screen.getByText("Up 2")).toBeTruthy();
  });
});
