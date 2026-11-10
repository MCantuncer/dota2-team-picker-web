import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Seat } from "@/lib/stack-seats";
import { StackBanner } from "./stack-banner";
import { StackLineup } from "./stack-lineup";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const seat = (id: string, over: Partial<Seat> = {}): Seat => ({
  id,
  name: id,
  avatarUrl: null,
  role: "player",
  rankTier: 73,
  position: 1,
  played: null,
  positions: [1],
  heroes: [8, 44, 114, 1],
  shared: true,
  ...over,
});

const stack = { id: "s1", name: "Night Shift", ownerName: "Can", games: 14, openToRequests: true, myRole: "owner" as const };

describe("StackBanner", () => {
  it("shows the badges, icon stats and actions for the owner", () => {
    render(<StackBanner stack={stack} seats={[seat("can", { role: "owner" }), seat("deniz")]} waiting={2} inviteHref="#invite" onError={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Night Shift" })).toBeInTheDocument();
    expect(screen.getByText("Your Stack")).toBeInTheDocument();
    expect(screen.getByText("Open to Requests")).toBeInTheDocument();
    expect(screen.getByLabelText("2 players")).toBeInTheDocument();
    expect(screen.getByLabelText("14 games together in the last 2 weeks")).toBeInTheDocument();
    expect(screen.getByLabelText("Average rank Divine III")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Draft for Night Shift/ })).toHaveAttribute("href", "/draft?stack=s1");
    expect(screen.getByRole("link", { name: "Stack Page, 2 players want to join" })).toHaveAttribute("href", "/stacks/s1");
    expect(screen.getByRole("link", { name: "Invite Players" })).toHaveAttribute("href", "#invite");
    expect(screen.getByRole("button", { name: "Rename Stack" })).toBeInTheDocument();
  });

  it("lets only the owner rename, and hides planning from players", () => {
    render(<StackBanner stack={{ ...stack, myRole: "player" }} seats={[seat("can")]} onError={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Rename Stack" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Draft for/ })).toBeNull();
    expect(screen.getByText("Owned by Can")).toBeInTheDocument();
  });
});

describe("StackLineup", () => {
  it("shows each player's top hero, the You tag, and who covers each position", () => {
    render(
      <StackLineup
        seats={[seat("deniz"), seat("can", { role: "owner", shared: false, position: null, positions: [], heroes: [] })]}
        hero={(id) => ({ name: `Hero ${id}` })}
        youId="deniz"
      />,
    );
    expect(screen.getByText("Hero 8")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("Heroes not shared")).toBeInTheDocument();
    expect(screen.getByLabelText("Played by deniz")).toBeInTheDocument();
    expect(screen.getAllByText("Nobody yet")).toHaveLength(4);
  });
});
