import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JoinPartyButton } from "./join-party-button";

const rpc = vi.fn();
const push = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

describe("JoinPartyButton", () => {
  beforeEach(() => {
    rpc.mockReset();
    push.mockReset();
  });

  it("joins by the link's code and opens the lobby", async () => {
    rpc.mockResolvedValue({ data: "party-1", error: null });
    render(<JoinPartyButton code="0123456789abcdef" />);
    await userEvent.click(screen.getByRole("button", { name: "Join Party" }));
    expect(rpc).toHaveBeenCalledWith("join_party_by_link", { code: "0123456789abcdef" });
    expect(push).toHaveBeenCalledWith("/draft");
  });

  it("shows why joining failed and stays on the page", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "The party is full" } });
    render(<JoinPartyButton code="0123456789abcdef" />);
    await userEvent.click(screen.getByRole("button", { name: "Join Party" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The party is full");
    expect(screen.getByRole("button", { name: "Join Party" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });
});
