import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartyChip } from "./party-chip";

describe("PartyChip", () => {
  it("shows the party size while you're in a party, and opens Draft", () => {
    render(<PartyChip size={1} />);
    expect(screen.getByRole("link", { name: "In Party 1/5" })).toHaveAttribute("href", "/draft");
  });

  it("shows nothing out of a party: parties start from Draft's Team Seats", () => {
    const { container } = render(<PartyChip size={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
