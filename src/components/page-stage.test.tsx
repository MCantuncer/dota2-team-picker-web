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

  it("puts a page's own figure and button in place of the hero", () => {
    const { container } = render(
      <PageStage
        name="Do Our Picks Win?"
        title="Yes, by 5.1 Points"
        portrait={PORTRAIT}
        figure={<figure>54.6%</figure>}
        actions={<a href="/draft">Try a Draft</a>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Do Our Picks Win? Yes, by 5.1 Points" })).toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveTextContent("54.6%");
    expect(screen.getByRole("link", { name: "Try a Draft" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps room for the hero only when the title names one", () => {
    const { container, rerender } = render(<PageStage name="Meta" title="Meepo Leads Mid at 57.0%" portrait={PORTRAIT} />);
    expect(container.querySelector("section")?.className).toContain("lg:pr-80");
    rerender(<PageStage name="Meta" title="What Ranked Players Pick and Win With" />);
    expect(container.querySelector("section")?.className).not.toContain("lg:pr-80");
  });

  it("gives a corner button its own column beside the name's line", () => {
    render(<PageStage name="My Heroes" title="No Heroes in Your Pool Yet" facts={<span>0 heroes</span>} aside={<button type="button">Page Tour</button>} />);
    const button = screen.getByRole("button", { name: "Page Tour" });
    const row = button.parentElement?.parentElement;
    expect(row?.className).toContain("grid-cols-[minmax(0,1fr)_auto]");
    // The name and its facts are the row's other cell, so they wrap beside the button.
    expect(row?.firstElementChild).toHaveTextContent("My Heroes0 heroes");
  });
});
