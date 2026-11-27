import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RankRow, type RankChoice } from "./rank-row";

const CHOICES: RankChoice<number | null>[] = [
  { value: null, name: "All Ranks", short: "All" },
  { value: 1, name: "Herald", medal: 1 },
  { value: 2, name: "Guardian", medal: 2 },
  { value: 3, name: "Crusader", medal: 3 },
];

function row(value: number | null, onChange = vi.fn(), lockedWhy?: string) {
  render(
    <>
      <span id="rank">Rank</span>
      <RankRow labelledBy="rank" choices={CHOICES} value={value} onChange={onChange} lockedWhy={lockedWhy} />
    </>,
  );
  return within(screen.getByRole("group", { name: "Rank" }));
}

describe("RankRow", () => {
  it("is one group named by its label, with a button per choice named by the rank", () => {
    const group = row(null);
    expect(group.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["All Ranks", "Herald", "Guardian", "Crusader"]);
    expect(group.getByRole("button", { name: "All Ranks" })).toHaveAttribute("aria-pressed", "true");
    expect(group.getByRole("button", { name: "Crusader" })).toHaveAttribute("aria-pressed", "false");
  });

  it("writes the name only beside the chosen medal", () => {
    const group = row(3);
    expect(group.getByRole("button", { name: "Crusader" })).toHaveTextContent("Crusader");
    expect(group.getByRole("button", { name: "Herald" })).toHaveTextContent("");
    expect(group.getByRole("button", { name: "Herald" }).querySelector("img")).not.toBeNull();
  });

  it("keeps a short label for the choice without a medal, for phones", () => {
    const all = row(3).getByRole("button", { name: "All Ranks" });
    expect(all.querySelector(".sm\\:hidden")).toHaveTextContent("All");
    expect(all.querySelector(".max-sm\\:hidden")).toHaveTextContent("All Ranks");
  });

  it("tells the page which rank was chosen", async () => {
    const onChange = vi.fn();
    const group = row(null, onChange);
    await userEvent.click(group.getByRole("button", { name: "Guardian" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("locks every choice and says why", async () => {
    const onChange = vi.fn();
    const group = row(3, onChange, "Ali sets the party rank");
    for (const button of group.getAllByRole("button")) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Ali sets the party rank");
    }
    await userEvent.click(group.getByRole("button", { name: "Herald" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
