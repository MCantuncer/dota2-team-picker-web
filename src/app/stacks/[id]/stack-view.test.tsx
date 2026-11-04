import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StackView, type JoinRequest, type StackMember, type StackSummary } from "./stack-view";

const rpc = vi.fn();
const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const refresh = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc, from: () => ({ update }) }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const base: StackSummary = {
  id: "s1",
  name: "Night Owls",
  ownerName: "Ana",
  members: 3,
  games: 4,
  openToRequests: true,
  myRole: null,
  myRequest: null,
};
const members: StackMember[] = [
  { id: "u1", name: "Ana", avatarUrl: null, role: "owner", rankTier: null },
  { id: "u2", name: "Bo", avatarUrl: null, role: "co_captain", rankTier: null },
];
const asker: JoinRequest = { id: "r1", name: "Axe", avatarUrl: null, rankTier: null, askedAt: "2026-11-03T10:00:00Z" };

describe("StackView", () => {
  beforeEach(() => {
    rpc.mockReset();
    eq.mockReset();
    refresh.mockReset();
  });

  it("hides who is in the Stack from outsiders and lets them ask to join", async () => {
    rpc.mockResolvedValue({ data: "r9", error: null });
    render(<StackView stack={base} members={[]} requests={[]} />);
    expect(screen.getByText(/Owned by Ana/)).toHaveTextContent("Owned by Ana · 3 players · 4 games together in 2 weeks");
    expect(screen.getByText("Only players in this Stack see who is in it.")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Players Who Want to Join/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ask to Join" }));
    expect(rpc).toHaveBeenCalledWith("ask_to_join_team", { team: "s1" });
    expect(await screen.findByText("Asked, waiting for the owner")).toBeInTheDocument();
  });

  it("offers no Ask to Join on a Stack closed to requests", () => {
    render(<StackView stack={{ ...base, openToRequests: false }} members={[]} requests={[]} />);
    expect(screen.queryByRole("button", { name: "Ask to Join" })).not.toBeInTheDocument();
  });

  it("shows members with Manager for co-captains", () => {
    render(<StackView stack={{ ...base, myRole: "player" }} members={members} requests={[]} />);
    const bo = screen.getByText("Bo").closest("li")!;
    expect(within(bo).getByText("Manager")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
  });

  it("opens on waiting requests for the owner and accepts one", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    render(<StackView stack={{ ...base, myRole: "owner" }} members={members} requests={[asker]} />);
    expect(screen.getByRole("tab", { name: /Players Who Want to Join/ })).toHaveAttribute("aria-selected", "true");
    const row = screen.getByText("Axe").closest("li")!;
    expect(within(row).getByText("Asked 3 Nov")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Accept" }));
    expect(rpc).toHaveBeenCalledWith("answer_join_request", { request: "r1", accept: true });
    expect(await screen.findByText("No one is waiting. Requests from Find a Stack show up here.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("lets the owner close the Stack to requests", async () => {
    eq.mockResolvedValue({ error: null });
    render(<StackView stack={{ ...base, myRole: "owner" }} members={members} requests={[]} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Open to Requests/ }));
    expect(update).toHaveBeenCalledWith({ open_to_requests: false });
    expect(await screen.findByText("Hidden from Find a Stack.")).toBeInTheDocument();
  });

  it("shows an empty Latest Activity for now", async () => {
    render(<StackView stack={{ ...base, myRole: "player" }} members={members} requests={[]} />);
    await userEvent.click(screen.getByRole("tab", { name: "Latest Activity" }));
    expect(screen.getByText("Games this Stack plays together will show up here.")).toBeInTheDocument();
  });
});
