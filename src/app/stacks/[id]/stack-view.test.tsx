import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Seat } from "@/lib/stack-seats";
import { StackView, type JoinRequest, type StackSummary } from "./stack-view";

const rpc = vi.fn();
const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const refresh = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc, from: () => ({ update }) }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));

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
const seat = (id: string, role: Seat["role"], heroes: number[] = []): Seat => ({
  id,
  name: id,
  avatarUrl: null,
  role,
  rankTier: null,
  position: heroes.length ? 1 : null,
  positions: heroes.length ? [1] : [],
  heroes,
  shared: heroes.length > 0,
});
const seats = [seat("Ana", "owner", [8]), seat("Bo", "co_captain")];
const asker: JoinRequest = { id: "r1", name: "Axe", avatarUrl: null, rankTier: null, askedAt: "2026-11-03T10:00:00Z" };

describe("StackView", () => {
  beforeEach(() => {
    rpc.mockReset();
    eq.mockReset();
    refresh.mockReset();
  });

  it("hides who is in the Stack from outsiders and lets them ask to join", async () => {
    rpc.mockResolvedValue({ data: "r9", error: null });
    render(<StackView stack={base} seats={[]} youId="me" requests={[]} />);
    expect(screen.getByRole("heading", { level: 1, name: "Night Owls" })).toBeInTheDocument();
    expect(screen.getByText("Owned by Ana")).toBeInTheDocument();
    expect(screen.getByLabelText("3 players")).toBeInTheDocument();
    expect(screen.getByLabelText("4 games together in the last 2 weeks")).toBeInTheDocument();
    expect(screen.getByText("Only players in this Stack see who is in it.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Players Who Want to Join/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Draft for/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ask to Join" }));
    expect(rpc).toHaveBeenCalledWith("ask_to_join_team", { team: "s1" });
    expect(await screen.findByText("Asked, waiting for the owner")).toBeInTheDocument();
  });

  it("offers no Ask to Join on a Stack closed to requests", () => {
    render(<StackView stack={{ ...base, openToRequests: false }} seats={[]} youId="me" requests={[]} />);
    expect(screen.queryByRole("button", { name: "Ask to Join" })).not.toBeInTheDocument();
  });

  it("shows the Lineup with Manager for co-captains and the You tag", () => {
    render(<StackView stack={{ ...base, myRole: "player" }} seats={seats} youId="Bo" requests={[]} />);
    const bo = screen.getByText("Bo").closest("li")!;
    expect(within(bo).getByText("Manager")).toBeInTheDocument();
    expect(within(bo).getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Hero 8")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
  });

  it("shows waiting requests to the owner and accepts one", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    render(<StackView stack={{ ...base, myRole: "owner" }} seats={seats} youId="Bo" requests={[asker]} />);
    expect(screen.getByRole("heading", { name: /Players Who Want to Join/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Draft for Night Owls/ })).toHaveAttribute("href", "/draft?stack=s1");
    const row = screen.getByText("Axe").closest("li")!;
    expect(within(row).getByText("Asked 3 Nov")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Accept" }));
    expect(rpc).toHaveBeenCalledWith("answer_join_request", { request: "r1", accept: true });
    expect(await screen.findByText("No one is waiting. Requests from Find a Stack show up here.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("lets the owner close the Stack to requests", async () => {
    eq.mockResolvedValue({ error: null });
    render(<StackView stack={{ ...base, myRole: "owner" }} seats={seats} youId="Bo" requests={[]} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Open to Requests/ }));
    expect(update).toHaveBeenCalledWith({ open_to_requests: false });
    expect(await screen.findByText("Hidden from Find a Stack.")).toBeInTheDocument();
  });

  it("shows an empty Latest Activity for now", () => {
    render(<StackView stack={{ ...base, myRole: "player" }} seats={seats} youId="Bo" requests={[]} />);
    expect(screen.getByText("Games this Stack plays together will show up here.")).toBeInTheDocument();
  });
});
