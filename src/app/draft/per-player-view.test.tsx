import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Suggestion } from "@/lib/engine/types";
import { PerPlayerView } from "./per-player-view";

const suggestion = (
  heroId: number,
  name: string,
  reasons: string[],
): Suggestion =>
  ({
    heroId,
    name,
    score: 2.4,
    reasons,
    summary: "",
    tags: [],
    hardCounters: [],
  }) as unknown as Suggestion;

describe("PerPlayerView", () => {
  it("shows one column per player and picks for that player's position", async () => {
    const onPicked = vi.fn();
    const onBanned = vi.fn();
    render(
      <PerPlayerView
        columns={[
          {
            playerId: "ali",
            position: 2,
            suggestions: [
              suggestion(11, "Shadow Fiend", [
                "Beats Pudge mid (+1.8)",
                "Your record 12-8",
                "Watch out: loses to Lina (-1.2)",
              ]),
              suggestion(17, "Storm Spirit", ["Fast into Lina (+0.9)", "x"]),
            ],
            outside: new Set([17]),
            weak: new Set(),
          },
        ]}
        names={{ ali: "Ali" }}
        draftKey="[]"
        heroes={[{ id: 25, name: "Lina" }]}
        portrait={() => null}
        onPicked={onPicked}
        onBanned={onBanned}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Ali Pos 2 Mid/ }),
    ).toBeVisible();
    expect(screen.getByText("Your record 12-8")).toBeVisible();
    // A closed card shows its main reason; opening it shows the rest.
    expect(screen.getByText("Fast into Lina (+0.9)")).toBeVisible();
    expect(screen.queryByText("X")).toBeNull();
    const storm = screen.getByRole("button", {
      name: /Storm Spirit/,
      expanded: false,
    });
    await userEvent.click(storm);
    expect(storm).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("X")).toBeVisible();
    expect(screen.getByText("Watch Out")).toBeVisible();
    expect(screen.getByText("Loses to Lina")).toBeVisible();
    expect(screen.getByText("-1.2")).toBeVisible();
    // Rows are labeled with the score part they explain; warnings read as Watch Out.
    expect(screen.getAllByText("Counters").length).toBeGreaterThan(0);

    expect(screen.getByText("Outside Pool")).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "Picked Storm Spirit for Ali" }),
    );
    expect(onPicked).toHaveBeenCalledWith(17, 2);
    await userEvent.click(
      screen.getByRole("button", { name: "Banned Shadow Fiend" }),
    );
    expect(onBanned).toHaveBeenCalledWith(11);
  });

  it("says so when everyone has a hero", () => {
    render(
      <PerPlayerView
        columns={[]}
        names={{}}
        draftKey="[]"
        heroes={[{ id: 25, name: "Lina" }]}
        portrait={() => null}
        onPicked={vi.fn()}
        onBanned={vi.fn()}
      />,
    );
    expect(screen.getByText("Everyone in the party has a hero.")).toBeVisible();
  });
});
