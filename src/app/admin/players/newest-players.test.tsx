import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminPlayer } from "@/lib/admin-players";
import { NewestPlayers } from "./newest-players";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

const NOW = Date.parse("2026-11-07T12:00:00Z");
const player = (i: number): AdminPlayer => ({
  userId: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
  name: `Player ${i}`,
  avatarUrl: null,
  steamId: `765611980000000${String(i).padStart(2, "0")}`,
  rankTier: 54,
  joinedAt: "2026-11-07T08:00:00Z",
  heroCount: i,
});

describe("NewestPlayers", () => {
  beforeEach(() => rpc.mockReset());

  it("shows each player's rank, heroes, join time in Turkey time and Steam page", () => {
    render(<NewestPlayers initial={[player(3)]} nowMs={NOW} />);
    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("Player 3");
    expect(row).toHaveTextContent("Legend IV");
    expect(row).toHaveTextContent("3 heroes");
    expect(row).toHaveTextContent("Today, 11:00");
    expect(screen.getByRole("link", { name: "Player 3 on Steam" })).toHaveAttribute(
      "href",
      "https://steamcommunity.com/profiles/76561198000000003",
    );
    expect(screen.queryByRole("button", { name: /Show More/ })).not.toBeInTheDocument();
  });

  it("loads the next page after the last row", async () => {
    const first = Array.from({ length: 20 }, (_, i) => player(i + 1));
    rpc.mockResolvedValue({
      data: [{ user_id: "00000000-0000-0000-0000-000000000099", display_name: "Late", avatar_url: null, steam_id: "76561198000000099", rank_tier: null, joined_at: "2026-11-05T08:00:00Z", hero_count: 0 }],
      error: null,
    });
    render(<NewestPlayers initial={first} nowMs={NOW} />);
    await userEvent.click(screen.getByRole("button", { name: /Show More/ }));
    expect(rpc).toHaveBeenCalledWith("admin_newest_players", { max_rows: 20, before_at: first[19]!.joinedAt, before_id: first[19]!.userId });
    expect(await screen.findByText("Late")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(21);
    expect(screen.queryByRole("button", { name: /Show More/ })).not.toBeInTheDocument();
  });

  it("says so when the next page fails and lets the admin try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<NewestPlayers initial={Array.from({ length: 20 }, (_, i) => player(i + 1))} nowMs={NOW} />);
    await userEvent.click(screen.getByRole("button", { name: /Show More/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load more players");
    expect(screen.getByRole("button", { name: /Show More/ })).toBeEnabled();
  });

  it("explains an empty list", () => {
    render(<NewestPlayers initial={[]} nowMs={NOW} />);
    expect(screen.getByText("No one has signed in with Steam yet.")).toBeInTheDocument();
  });
});
