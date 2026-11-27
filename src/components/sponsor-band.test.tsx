import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SponsorBand } from "./sponsor-band";

const sponsor = { name: "Aegis Gear", href: "https://example.com/dota", wide: "/sponsors/aegis-728.webp", phone: "/sponsors/aegis-320.webp" };

describe("SponsorBand", () => {
  it("draws nothing when no sponsor is booked", () => {
    const { container } = render(<SponsorBand sponsor={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("labels the slot Sponsor and marks the link as paid", () => {
    render(<SponsorBand sponsor={sponsor} />);
    expect(screen.getByRole("complementary", { name: "Sponsor" })).toBeVisible();
    const link = screen.getByRole("link", { name: "Aegis Gear, opens in a new tab" });
    expect(link).toHaveAttribute("href", "https://example.com/dota");
    expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("keeps each picture's room with its real size", () => {
    const { container } = render(<SponsorBand sponsor={sponsor} />);
    const sizes = [...container.querySelectorAll("img")].map((img) => `${img.getAttribute("width")}x${img.getAttribute("height")}`);
    expect(sizes).toEqual(["320x100", "728x90"]);
  });
});
