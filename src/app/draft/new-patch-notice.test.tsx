import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NewPatchNotice } from "./new-patch-notice";

describe("NewPatchNotice", () => {
  it("names the patch and its day, the patch games, and the share of pick data from it", () => {
    render(
      <NewPatchNotice
        notice={{ name: "7.42", day: 3, patchGames: 884555, share: 0.643 }}
      />,
    );
    expect(
      screen.getByRole("region", { name: "New Patch 7.42" }),
    ).toBeInTheDocument();
    expect(screen.getByText("New Patch, Day 3")).toBeInTheDocument();
    expect(screen.getByText("884,555")).toBeInTheDocument();
    expect(
      screen.getByRole("meter", { name: "Pick data from 7.42" }),
    ).toHaveAttribute("aria-valuenow", "64");
  });
});
