import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankMedal } from "./rank-medal";

describe("RankMedal", () => {
  it("names the rank for screen readers and layers the stars on the medal", () => {
    const { container } = render(<RankMedal rankTier={54} size={48} />);
    expect(screen.getByRole("img", { name: "Legend IV" })).toBeInTheDocument();
    const images = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(images).toHaveLength(2);
    expect(images[0]).toContain("rank_icon_5");
    expect(images[1]).toContain("rank_star_4");
  });

  it("shows Immortal without stars", () => {
    const { container } = render(<RankMedal rankTier={80} size={48} />);
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("renders nothing for an unknown rank", () => {
    const { container } = render(<RankMedal rankTier={0} size={48} />);
    expect(container).toBeEmptyDOMElement();
  });
});
