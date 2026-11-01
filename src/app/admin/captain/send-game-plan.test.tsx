import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SendGamePlan } from "./send-game-plan";

const insert = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: () => ({ insert }) }) }));

const props = {
  teamId: "team-1",
  userId: "me",
  picks: [1, 2, 3, 4, 5],
  enemies: [6, 7, 8, 9, 10],
  bans: [11],
  rank: 5,
  players: ["me", null, "friend", null, null],
};

describe("SendGamePlan", () => {
  beforeEach(() => insert.mockReset());

  it("sends the finished draft with who plays each position", async () => {
    insert.mockResolvedValue({ error: null });
    render(<SendGamePlan {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Send to team" }));
    expect(await screen.findByRole("button", { name: "Sent to team" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Your team sees it on their Party page");
    expect(insert).toHaveBeenCalledWith({
      team_id: "team-1",
      sent_by: "me",
      picks: [1, 2, 3, 4, 5],
      enemies: [6, 7, 8, 9, 10],
      bans: [11],
      rank_bracket: 5,
      players: ["me", null, "friend", null, null],
    });
  });

  it("says so and lets the captain retry when sending fails", async () => {
    insert.mockResolvedValue({ error: { message: "denied" } });
    render(<SendGamePlan {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Send to team" }));
    expect(await screen.findByText("Couldn't send the plan. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send to team" })).toBeEnabled();
  });
});
