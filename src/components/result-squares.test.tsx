import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultSquares } from "./result-squares";

const results = (n: number) => Array.from({ length: n }, (_, i) => i % 2 === 0);

describe("ResultSquares", () => {
  it("reads the results out newest first", () => {
    render(<ResultSquares results={[true, false, true]} />);
    expect(screen.getByText("Newest first: won, lost, won")).toBeInTheDocument();
  });

  it("puts Newest and Oldest under the ends of a long row", () => {
    render(<ResultSquares results={results(7)} />);
    expect(screen.getByText("Newest")).toBeInTheDocument();
    expect(screen.getByText("Oldest")).toBeInTheDocument();
  });

  it("says Newest First under a short row, where the two words would touch", () => {
    render(<ResultSquares results={results(6)} />);
    expect(screen.getByText("Newest First")).toBeInTheDocument();
    expect(screen.queryByText("Oldest")).not.toBeInTheDocument();
  });

  it("puts no words under one square", () => {
    render(<ResultSquares results={[true]} />);
    expect(screen.queryByText("Newest First")).not.toBeInTheDocument();
  });
});
