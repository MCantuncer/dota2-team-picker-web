import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Suggestion } from "@/lib/engine/types";
import { SuggestionRow } from "./suggestion-row";

const sven = {
  heroId: 18,
  name: "Sven",
  score: 10.6,
  reasons: ["Hard to punish: few heroes still open beat it (+0.6)", "7th best carry at Ancient"],
  summary: "Score +10.6, 2nd of 39 carries here",
  tags: ["Favorite (+1.5)"],
  hardCounters: [],
} as unknown as Suggestion;

function renderRow(actions = true) {
  const onPicked = vi.fn();
  const onBanned = vi.fn();
  render(
    <ol>
      <SuggestionRow
        suggestion={sven}
        portrait={null}
        rank={2}
        scoreText="+10.6"
        badges={null}
        gainText={null}
        counters={[]}
        onPicked={actions ? onPicked : undefined}
        onBanned={actions ? onBanned : undefined}
      />
    </ol>,
  );
  return { onPicked, onBanned };
}

describe("SuggestionRow", () => {
  it("shows only the main reason and no actions while closed", () => {
    renderRow();
    expect(screen.getByText("Other Picks")).toBeVisible();
    expect(screen.getByText("Hard to punish: few heroes still open beat it (+0.6)")).toBeVisible();
    expect(screen.queryByText("7th best carry at Ancient")).toBeNull();
    expect(screen.queryByRole("button", { name: "Picked Sven" })).toBeNull();
  });

  it("opens to every reason with Picked and Banned on their own line", async () => {
    const { onPicked, onBanned } = renderRow();
    const row = screen.getByRole("button", { name: /Sven/, expanded: false });
    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("7th best carry at Ancient")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Picked Sven" }));
    expect(onPicked).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Banned Sven" }));
    expect(onBanned).toHaveBeenCalledOnce();
  });

  it("leaves the actions out when the player can't change the draft", async () => {
    renderRow(false);
    await userEvent.click(screen.getByRole("button", { name: /Sven/ }));
    expect(screen.getByText("7th best carry at Ancient")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Picked Sven" })).toBeNull();
  });

  it("shows the verdict closed, with the record note on a line of its own", async () => {
    render(
      <ol>
        <SuggestionRow
          suggestion={sven}
          verdict={{
            heroId: 18,
            kind: "behind",
            text: "1.1 points behind: lower win rate (-4.0).",
            note: "You win more on Sven (63% of 38 games) than on Juggernaut (49% of 83). A good pick too.",
          }}
          portrait={null}
          rank={2}
          scoreText="+10.6"
          badges={null}
          gainText={null}
          counters={[]}
        />
      </ol>,
    );
    const text = "1.1 points behind: lower win rate (-4.0).";
    expect(screen.getByText(text)).toBeVisible();
    expect(screen.getByText(/^You win more on Sven/)).toBeVisible();
    expect(screen.queryByText("Hard to punish: few heroes still open beat it (+0.6)")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Sven/ }));
    expect(screen.getByText(text)).toBeVisible();
    expect(screen.getByText("Hard to punish: few heroes still open beat it (+0.6)")).toBeVisible();
  });
});
