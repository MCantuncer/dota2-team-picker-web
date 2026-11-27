import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageStage } from "./page-stage";

const PORTRAIT = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/meepo.png";

describe("PageStage", () => {
  it("makes the finding the page's heading, with the page's name read first", () => {
    render(
      <PageStage name="Meta" title="Meepo Leads Mid at 57.0%" facts={<span>New Patch, Day 4</span>}>
        Up 2.7 points since 7.41.
      </PageStage>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Meta: Meepo Leads Mid at 57.0%" })).toBeInTheDocument();
    expect(screen.getByText("New Patch, Day 4")).toBeInTheDocument();
    expect(screen.getByText("Up 2.7 points since 7.41.")).toBeInTheDocument();
  });

  it("shows the named hero's render as decoration, and none without a hero", () => {
    const { container, rerender } = render(<PageStage name="Meta" title="Meepo Leads Mid at 57.0%" portrait={PORTRAIT} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain("renders");
    expect(img).toHaveAttribute("aria-hidden", "true");
    rerender(<PageStage name="Meta" title="Meepo Leads Mid at 57.0%" />);
    expect(container.querySelector("img")).toBeNull();
  });
});
