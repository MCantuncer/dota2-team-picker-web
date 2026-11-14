import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteFromStack } from "./invite-from-stack";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

const owls = { id: "s1", name: "Night Owls" };
const mates = [
  { user_id: "me", display_name: "Can", avatar_url: null, role: "owner", rank_tier: null },
  { user_id: "u2", display_name: "Tusk", avatar_url: null, role: "player", rank_tier: null },
  { user_id: "u3", display_name: "Lina", avatar_url: null, role: "player", rank_tier: null },
  { user_id: "u4", display_name: "Axe", avatar_url: null, role: "player", rank_tier: null },
];

describe("InviteFromStack", () => {
  beforeEach(() => rpc.mockReset());

  it("lists Stack mates not in the party and invites the ticked ones", async () => {
    const onInvited = vi.fn();
    rpc.mockImplementation((name: string) =>
      Promise.resolve(name === "stack_members" ? { data: mates, error: null } : { data: null, error: null }),
    );
    render(<InviteFromStack stacks={[owls]} initialStack={null} memberIds={["me"]} openSeats={4} onInvited={onInvited} />);
    expect(rpc).toHaveBeenCalledWith("stack_members", { team: "s1" });
    await userEvent.click(await screen.findByRole("checkbox", { name: "Tusk" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Lina" }));
    expect(screen.queryByRole("checkbox", { name: "Can" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Invite 2 Players" }));
    expect(rpc).toHaveBeenCalledWith("invite_to_party", { target: "u2" });
    expect(rpc).toHaveBeenCalledWith("invite_to_party", { target: "u3" });
    expect(await screen.findByText("2 invites sent.")).toBeInTheDocument();
    expect(onInvited).toHaveBeenCalled();
  });

  it("stops ticking at the open seats", async () => {
    rpc.mockResolvedValue({ data: mates, error: null });
    render(<InviteFromStack stacks={[owls]} initialStack="s1" memberIds={["me"]} openSeats={1} onInvited={vi.fn()} />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Tusk" }));
    expect(screen.getByRole("checkbox", { name: "Lina" })).toBeDisabled();
  });

  it("names the players an invite could not reach", async () => {
    rpc.mockImplementation((name: string, args?: { target?: string }) =>
      Promise.resolve(
        name === "stack_members"
          ? { data: mates, error: null }
          : args?.target === "u4"
            ? { data: null, error: { message: "You can invite friends and teammates only" } }
            : { data: null, error: null },
      ),
    );
    render(<InviteFromStack stacks={[owls]} initialStack={null} memberIds={["me"]} openSeats={4} onInvited={vi.fn()} />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Tusk" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Axe" }));
    await userEvent.click(screen.getByRole("button", { name: "Invite 2 Players" }));
    expect(await screen.findByText("1 sent. Not sent to Axe: You can invite friends and teammates only")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Axe" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Tusk" })).not.toBeChecked();
  });

  it("switches Stacks with the picker", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    render(
      <InviteFromStack
        stacks={[owls, { id: "s2", name: "Duo" }]}
        initialStack="s2"
        memberIds={["me"]}
        openSeats={4}
        onInvited={vi.fn()}
      />,
    );
    expect(rpc).toHaveBeenCalledWith("stack_members", { team: "s2" });
    await userEvent.selectOptions(screen.getByLabelText("Stack"), "s1");
    expect(rpc).toHaveBeenLastCalledWith("stack_members", { team: "s1" });
  });
});
