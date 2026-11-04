import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FindingIcon, KIND_ICONS } from "./finding-icon";

describe("FindingIcon", () => {
  it("gives deaths one icon wherever they show", () => {
    expect(KIND_ICONS.early_deaths).toBe(KIND_ICONS.deaths);
  });

  it("tints the tile by tone and hides it from screen readers", () => {
    const { container } = render(<FindingIcon kind="farm" tone="strength" tile />);
    const tile = container.firstElementChild!;
    expect(tile.className).toContain("bg-radiant-tint");
    expect(tile.getAttribute("aria-hidden")).toBe("true");
    const problem = render(<FindingIcon kind={null} tone="problem" tile />).container.firstElementChild!;
    expect(problem.className).toContain("bg-dire-tint");
  });
});
