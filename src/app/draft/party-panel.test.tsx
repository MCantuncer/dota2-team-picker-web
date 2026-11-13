import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Party } from "@/lib/party";
import type { PartySeat } from "@/lib/party-seats";
import { PartyPanel } from "./party-panel";

const rpc = vi.fn();
const refreshPage = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshPage }) }));

const party = (captainId: string | null, online = true): Party => ({
  id: "p",
  leaderId: "can",
  teamId: null,
  captain: { id: captainId, online, requestBy: null, requestMsLeft: 0 },
  members: [
    { id: "can", name: "Can", avatarUrl: null, position: 2, positionSetBy: null, askWaitMs: 0 },
    { id: "deniz", name: "Deniz", avatarUrl: null, position: 1, positionSetBy: null, askWaitMs: 0 },
  ],
});

const twoSeats: PartySeat[] = [
  { position: 1, id: "deniz", name: "Deniz", avatarUrl: null, status: "in" },
  { position: 2, id: "can", name: "Can", avatarUrl: null, status: "in" },
];

function setup(p: Party, userId: string, seats: PartySeat[] = twoSeats, planner: string | null = "can") {
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(
    <PartyPanel
      party={p}
      seats={seats}
      planner={planner}
      stacks={[]}
      userId={userId}
      hero={() => ({ name: "" })}
      heroAt={() => null}
      refresh={refresh}
    />,
  );
  return refresh;
}

describe("PartyPanel", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ error: null });
    refreshPage.mockReset();
  });

  it("names the party after its leader and lets a member ask the captain", async () => {
    setup(party("can"), "deniz");
    expect(screen.getByRole("region", { name: "Team Seats" })).toHaveTextContent("Can's Party2 in Party");
    await userEvent.click(screen.getByRole("button", { name: "Ask Can for Captain" }));
    expect(rpc).toHaveBeenCalledWith("become_captain");
  });

  it("leaves the party and loads the page again as the player's own draft", async () => {
    setup(party(null), "can");
    await userEvent.click(screen.getByRole("button", { name: "Leave Party" }));
    expect(rpc).toHaveBeenCalledWith("leave_party");
    expect(refreshPage).toHaveBeenCalled();
  });

  it("says who moved the player's seat", () => {
    const moved = party(null);
    moved.members[1] = { ...moved.members[1]!, positionSetBy: "can" };
    setup(moved, "deniz");
    expect(screen.getByText("Can moved you to Carry.")).toBeInTheDocument();
  });

  it("stays quiet when the player picked their own seat", () => {
    const self = party(null);
    self.members[1] = { ...self.members[1]!, positionSetBy: "deniz" };
    setup(self, "deniz");
    expect(screen.queryByText(/moved you/)).not.toBeInTheDocument();
  });

  it("lets the leader invite a friend into an open seat", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "lineup_players"
        ? { data: [{ user_id: "mert", display_name: "Mert", avatar_url: null, rank_tier: null, positions: [5], favorites: {}, hero_stats: {}, top: {}, stacks: [], is_friend: true, shared: true }], error: null }
        : { error: null },
    );
    setup(party(null), "can");
    await userEvent.click(screen.getByRole("button", { name: "Add Player to Pos 5" }));
    await userEvent.click(await screen.findByRole("option", { name: /Mert/ }));
    expect(rpc).toHaveBeenCalledWith("invite_to_party", { target: "mert", seat: 5 });
  });

  it("lets the planner swap a member into another seat, and the leader free a waiting seat", async () => {
    const seats: PartySeat[] = [...twoSeats, { position: 4, id: "mert", name: "Mert", avatarUrl: null, status: "away" }];
    setup(party(null), "can", seats);
    await userEvent.click(screen.getByRole("button", { name: "More for Deniz" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Swap Someone In" }));
    await userEvent.click(screen.getByRole("option", { name: /Mert/ }));
    expect(rpc).toHaveBeenCalledWith("set_member_position", { target: "mert", want: 1 });

    await userEvent.click(screen.getByRole("button", { name: "More for Mert" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Invite Again" }));
    expect(rpc).toHaveBeenCalledWith("invite_to_party", { target: "mert" });
    await userEvent.click(screen.getByRole("button", { name: "More for Mert" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Free Seat" }));
    expect(rpc).toHaveBeenCalledWith("unseat_player", { target: "mert" });
    await userEvent.click(screen.getByRole("button", { name: "More for Deniz" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Remove from Party" }));
    expect(rpc).toHaveBeenCalledWith("remove_from_party", { target: "deniz" });
  });

  it("gives a member no seat controls", () => {
    setup(party(null), "deniz");
    expect(screen.queryByRole("button", { name: /Add Player|More for/ })).not.toBeInTheDocument();
  });

  it("shows a failed leave and stays", async () => {
    rpc.mockResolvedValue({ error: { message: "network down" } });
    setup(party(null), "can");
    await userEvent.click(screen.getByRole("button", { name: "Leave Party" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not leave: network down");
    expect(refreshPage).not.toHaveBeenCalled();
  });
});
