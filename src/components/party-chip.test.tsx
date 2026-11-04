import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartyChip } from "./party-chip";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("PartyChip", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("shows the party size while you're in a party", () => {
    render(<PartyChip size={1} />);
    const link = screen.getByRole("link", { name: "In Party 1/5" });
    expect(link).toHaveAttribute("href", "/party");
  });

  it("asks you to create a party when you're not in one", () => {
    render(<PartyChip size={null} />);
    expect(screen.getByRole("link", { name: "Create Party" })).toHaveAttribute("href", "/party");
    expect(screen.queryByText(/In Party/)).not.toBeInTheDocument();
  });

  it("leaves the nudge to the Party page's own Start a Party button", () => {
    pathname = "/party";
    const { container } = render(<PartyChip size={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
