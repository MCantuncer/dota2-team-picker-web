import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StackBoard, type Friend, type OpenInvite } from "./stack-board";

const rpc = vi.fn();
const refresh = vi.fn();
const push = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const stack = { id: "s1", name: "Friday Five", owned: true };
const pal: Friend = { id: "u2", name: "Pal", avatarUrl: null };
const invite: OpenInvite = { id: "i1", stackName: "Night Owls", inviterName: "Ana", inviterAvatarUrl: null, members: 3 };

const show = (props: Partial<Parameters<typeof StackBoard>[0]> = {}) =>
  render(
    <StackBoard
      userId="u1"
      stacks={[]}
      joined={[]}
      current={null}
      members={[]}
      friendInvites={[]}
      openInvites={[]}
      friends={[]}
      icons={{}}
      {...props}
    />,
  );

describe("StackBoard", () => {
  beforeEach(() => {
    rpc.mockReset();
    refresh.mockReset();
  });

  it("explains what a Stack does when you have none", () => {
    show();
    expect(screen.getByRole("heading", { name: "Create Your First Stack" })).toBeInTheDocument();
    expect(screen.getByText(/Everyone you play with, saved in one place\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Stack" })).toBeDisabled();
  });

  it("joins a Stack from an invite", async () => {
    rpc.mockResolvedValue({ data: "s9", error: null });
    show({ openInvites: [invite] });
    const row = screen.getByText("Night Owls").closest("li")!;
    expect(within(row).getByText(/Ana invited you/)).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Join" }));
    expect(rpc).toHaveBeenCalledWith("answer_team_invite", { invite: "i1", accept: true });
    expect(refresh).toHaveBeenCalled();
  });

  it("invites a friend who is not in the Stack yet", async () => {
    rpc.mockResolvedValue({ data: "i7", error: null });
    show({ stacks: [stack], current: stack, friends: [pal] });
    const row = screen.getByText("Pal").closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: "Invite" }));
    expect(rpc).toHaveBeenCalledWith("invite_friend_to_team", { team: "s1", target: "u2" });
    expect(await within(row).findByText("Waiting")).toBeInTheDocument();
  });

  it("shows a refused invite in plain words", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Too many invites. Try again in a while." } });
    show({ stacks: [stack], current: stack, friends: [pal] });
    await userEvent.click(screen.getByRole("button", { name: "Invite" }));
    expect(await screen.findByText("Invite not sent: Too many invites. Try again in a while.")).toBeInTheDocument();
  });
});
