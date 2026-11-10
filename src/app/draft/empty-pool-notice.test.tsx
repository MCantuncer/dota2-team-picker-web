import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyPoolNotice } from "./empty-pool-notice";

describe("EmptyPoolNotice", () => {
  it("says the position has no heroes yet and links to My Heroes", () => {
    render(<EmptyPoolNotice position={1} reason="none" />);
    expect(screen.getByText("No Carry Heroes Yet")).toBeInTheDocument();
    expect(screen.getByText("Picks come from every hero.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add Carry Heroes" })).toHaveAttribute("href", "/my-heroes");
  });

  it("says when every hero for the position is picked or banned", () => {
    render(<EmptyPoolNotice position={4} reason="used" />);
    expect(screen.getByText("All Your Soft Support Heroes Are Taken")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add More Soft Support Heroes" })).toHaveAttribute("href", "/my-heroes");
  });
});
