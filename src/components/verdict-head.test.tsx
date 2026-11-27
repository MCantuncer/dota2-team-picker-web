import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerdictHead } from "./verdict-head";

describe("VerdictHead", () => {
  it("makes the finding the title, with the label read first and its facts beside it", () => {
    render(<VerdictHead label="Winners and Losers" facts="Win rate, every role" finding="Monkey King Is Up 5.5 Points" />);
    expect(screen.getByRole("heading", { level: 2, name: "Winners and Losers: Monkey King Is Up 5.5 Points" })).toBeInTheDocument();
    expect(screen.getByText("Win rate, every role")).toBeInTheDocument();
  });

  it("keeps the label as the title when the data gives no finding", () => {
    render(<VerdictHead label="Meta Map" facts="124 heroes" finding={null} note="Pick a hero." small />);
    expect(screen.getByRole("heading", { level: 3, name: "Meta Map" })).toBeInTheDocument();
    expect(screen.getByText("124 heroes")).toBeInTheDocument();
    expect(screen.getByText("Pick a hero.")).toBeInTheDocument();
  });
});
