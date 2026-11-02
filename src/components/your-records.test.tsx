import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { YourRecords } from "./your-records";

describe("YourRecords", () => {
  it("lists picks by suggestion and teammates with their best positions", () => {
    render(
      <YourRecords
        records={{
          suggestions: [
            { bucket: "top3", games: 12, wins: 7 },
            { bucket: "in8", games: 0, wins: 0 },
            { bucket: "not_shown", games: 3, wins: 1 },
            { bucket: "no_list", games: 0, wins: 0 },
          ],
          teammates: [{ id: "b", name: "Bea", games: 20, wins: 11, byPosition: [{ mine: 2, theirs: 4, games: 12, wins: 9 }] }],
        }}
      />,
    );
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "Picked from the top 3 suggestions: 58% won in 12 games.",
      "Picked a hero we didn't suggest: 3 games, too few for a win rate.",
      "Bea: 55% won in 20 games. Best as Pos 2 with them Pos 4: 75% won in 12 games.",
    ]);
  });

  it("says when records start", () => {
    render(<YourRecords records={{ suggestions: [{ bucket: "top3", games: 0, wins: 0 }], teammates: [] }} />);
    expect(screen.getByText(/Records start after your first reported party game/)).toBeInTheDocument();
  });
});
