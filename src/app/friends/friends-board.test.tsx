import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Friend, SharedGame } from "@/lib/friends";
import { localGameTime } from "./friend-detail";
import { FriendsBoard, timeAgo } from "./friends-board";

const rpc = vi.fn();
const refresh = vi.fn();
const replace = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace }) }));

const NOW = Date.parse("2026-11-06T15:00:00Z");
const deniz: Friend = {
  id: "d",
  name: "Deniz",
  avatarUrl: null,
  rankTier: 75,
  positions: [1, 3],
  heroStats: { 8: { games: 48, wins: 27 }, 44: { games: 31, wins: 18 } },
  shared: true,
  party: null,
  partySize: null,
  together: { games: 18, wins: 12 },
  without: { games: 25, wins: 13 },
  lastTogether: "2026-11-06T12:12:00Z",
  lastGame: "2026-11-06T13:00:00Z",
};
const emre: Friend = { ...deniz, id: "e", name: "Emre", party: "yours", partySize: 2, together: { games: 9, wins: 4 } };
const selin: Friend = { ...deniz, id: "s", name: "Selin", shared: false, rankTier: null, positions: [], heroStats: {}, together: { games: 0, wins: 0 } };
const games: SharedGame[] = [
  { matchId: 1, startedAt: "2026-11-06T12:12:00Z", gameMode: 22, lobbyType: 7, won: true, myHeroId: 74, friendHeroId: 8 },
  { matchId: 2, startedAt: "2026-11-05T20:05:00Z", gameMode: 23, lobbyType: 0, won: false, myHeroId: 13, friendHeroId: 44 },
];
const heroes = { 8: { name: "Juggernaut" }, 44: { name: "Phantom Assassin" }, 74: { name: "Invoker" }, 13: { name: "Puck" } };

const show = (props: Partial<Parameters<typeof FriendsBoard>[0]> = {}) =>
  render(
    <FriendsBoard
      friendCode="abc123"
      friends={[deniz, emre, selin]}
      requests={[{ id: "a", name: "Arda", avatarUrl: null, incoming: true }]}
      suggestions={[]}
      selected={deniz}
      opened={false}
      games={games}
      heroes={heroes}
      partyRole={null}
      now={NOW}
      {...props}
    />,
  );

describe("FriendsBoard", () => {
  beforeEach(() => {
    rpc.mockReset();
    refresh.mockReset();
  });

  it("groups friends: requests, in your party, then the rest", () => {
    show();
    const list = screen.getByRole("complementary", { name: "Your friends" });
    expect(within(list).getByRole("region", { name: "Requests" })).toHaveTextContent("Arda");
    expect(within(list).getByRole("region", { name: "In Your Party" })).toHaveTextContent("Emre");
    const rest = within(list).getByRole("region", { name: "Friends" });
    expect(rest).toHaveTextContent("Deniz");
    expect(rest).toHaveTextContent("Rank hidden");
    expect(within(rest).getByRole("link", { name: /Deniz/ })).toHaveAttribute("aria-current", "page");
    expect(within(rest).getByRole("link", { name: /Deniz/ })).toHaveTextContent("67%in 18 games");
  });

  it("opens the selected friend with their heroes, your record together and your games", () => {
    show();
    const detail = screen.getByRole("region", { name: "Deniz" });
    expect(detail).toHaveTextContent("Juggernaut");
    expect(detail).toHaveTextContent("Most Played");
    expect(detail).toHaveTextContent("Last game 2 hours ago");
    expect(detail).toHaveTextContent("67%");
    expect(detail).toHaveTextContent("52% without");
    expect(detail).toHaveTextContent("Ranked All Pick");
    expect(detail).toHaveTextContent("Turbo");
    expect(within(detail).getByRole("link", { name: "Plan a Draft" })).toHaveAttribute("href", "/draft?with=d");
  });

  it("starts a party first when you have none, then invites", async () => {
    rpc.mockResolvedValue({ error: null });
    show();
    await userEvent.click(screen.getByRole("button", { name: "Invite to Party" }));
    expect(rpc).toHaveBeenNthCalledWith(1, "start_party");
    expect(rpc).toHaveBeenNthCalledWith(2, "invite_to_party", { target: "d" });
    expect(await screen.findByRole("button", { name: "Invite Sent" })).toBeDisabled();
  });

  it("only lets the party leader invite", () => {
    show({ partyRole: "member" });
    expect(screen.getByRole("button", { name: "Invite to Party" })).toBeDisabled();
    expect(screen.getByText("Only your party leader can invite.")).toBeInTheDocument();
  });

  it("shows Open Party for a friend already in your party", () => {
    show({ selected: emre });
    expect(screen.getByRole("link", { name: "Open Party" })).toHaveAttribute("href", "/party");
  });

  it("says why a friend who doesn't share has no rank, and shows what you played together", () => {
    show({ selected: selin, games: [games[0]!] });
    const detail = screen.getByRole("region", { name: "Selin" });
    expect(detail).toHaveTextContent("Rank hidden");
    expect(detail).toHaveTextContent("Most Played With You");
  });

  it("asks to add your squad when you have no friends yet", () => {
    show({ friends: [], requests: [], selected: null, games: [] });
    expect(screen.getByText(/No friends yet/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Your Squad" })).toBeInTheDocument();
  });

  it("shows the error when a request can't be accepted", async () => {
    rpc.mockResolvedValue({ error: { message: "Not allowed" } });
    show();
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Request not accepted: Not allowed");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("times", () => {
  it("says how long ago, in plain words", () => {
    expect(timeAgo("2026-11-06T14:59:30Z", NOW)).toBe("just now");
    expect(timeAgo("2026-11-06T13:00:00Z", NOW)).toBe("2 hours ago");
    expect(timeAgo("2026-11-05T15:00:00Z", NOW)).toBe("yesterday");
    expect(timeAgo("2026-11-03T15:00:00Z", NOW)).toBe("3 days ago");
  });

  it("names today and yesterday, then the date", () => {
    const now = new Date(2026, 10, 6, 18, 0);
    expect(localGameTime(new Date(2026, 10, 6, 15, 12), now)).toBe("Today, 15:12");
    expect(localGameTime(new Date(2026, 10, 5, 23, 5), now)).toBe("Yesterday, 23:05");
    expect(localGameTime(new Date(2026, 10, 3, 21, 40), now)).toBe("3 Nov, 21:40");
  });
});
