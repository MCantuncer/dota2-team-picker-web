import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StackCard } from "@/lib/stacks";
import { FindStacks } from "./find-stacks";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

const owls: StackCard = {
  id: "s1",
  name: "Night Owls",
  ownerName: "Ana",
  ownerAvatarUrl: null,
  members: 4,
  games: 6,
  averageRank: 54,
};
const duo: StackCard = { id: "s2", name: "Duo", ownerName: "Bo", ownerAvatarUrl: null, members: 2, games: 0, averageRank: null };
const row = (name: string) => screen.getByText(name).closest("li")!;

describe("FindStacks", () => {
  beforeEach(() => rpc.mockReset());

  it("lists Hot Stacks with their games together", () => {
    render(<FindStacks hot={[owls]} all={[]} mine={[]} requests={{}} />);
    const hot = screen.getByRole("region", { name: "Hot Stacks" });
    const card = within(hot).getByRole("listitem");
    expect(card).toHaveTextContent("Hot");
    expect(card).toHaveTextContent("Ana");
    expect(card).toHaveTextContent("Players4");
    expect(card).toHaveTextContent("Games in 2 Weeks6");
    expect(card).toHaveTextContent("Average RankLegend IV");
  });

  it("asks to join and can take the request back", async () => {
    rpc.mockResolvedValueOnce({ data: "r1", error: null }).mockResolvedValueOnce({ data: null, error: null });
    render(<FindStacks hot={[]} all={[duo]} mine={[]} requests={{}} />);
    await userEvent.click(within(row("Duo")).getByRole("button", { name: "Ask to Join" }));
    expect(rpc).toHaveBeenCalledWith("ask_to_join_team", { team: "s2" });
    await userEvent.click(await within(row("Duo")).findByRole("button", { name: "Cancel" }));
    expect(rpc).toHaveBeenLastCalledWith("cancel_join_request", { request: "r1" });
    expect(await within(row("Duo")).findByRole("button", { name: "Ask to Join" })).toBeInTheDocument();
  });

  it("shows a refused request in plain words", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "This Stack is not taking requests." } });
    render(<FindStacks hot={[]} all={[duo]} mine={[]} requests={{}} />);
    await userEvent.click(screen.getByRole("button", { name: "Ask to Join" }));
    expect(await screen.findByText("Request not sent: This Stack is not taking requests.")).toBeInTheDocument();
  });

  it("says when a Stack has no rank yet", () => {
    render(<FindStacks hot={[]} all={[duo]} mine={[]} requests={{}} />);
    expect(row("Duo")).toHaveTextContent("Average RankNo Rank");
  });

  it("has no Ask to Join on your own Stacks, and opens them instead", () => {
    render(<FindStacks hot={[]} all={[owls]} mine={["s1"]} requests={{}} />);
    expect(within(row("Night Owls")).getByText("Your Stack")).toBeInTheDocument();
    expect(within(row("Night Owls")).getByRole("link", { name: "Stack Page" })).toHaveAttribute("href", "/stacks/s1");
    expect(screen.queryByRole("button", { name: "Ask to Join" })).not.toBeInTheDocument();
  });

  it("searches by name and loads the next page", async () => {
    const page = Array.from({ length: 50 }, (_, i) => ({ id: `p${i}`, name: `Owls ${i}`, owner_name: "Ana", members: 2, games: 0 }));
    rpc.mockResolvedValueOnce({ data: page, error: null }).mockResolvedValueOnce({ data: [], error: null });
    render(<FindStacks hot={[]} all={[duo]} mine={[]} requests={{}} />);
    await userEvent.type(screen.getByLabelText("Search Stacks by name"), "owls");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(rpc).toHaveBeenCalledWith("browse_stacks", { search: "owls", page: 0 });
    await userEvent.click(await screen.findByRole("button", { name: "Show More" }));
    expect(rpc).toHaveBeenLastCalledWith("browse_stacks", { search: "owls", page: 1 });
    expect(await screen.findByText("Owls 49")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show More" })).not.toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    render(<FindStacks hot={[]} all={[duo]} mine={[]} requests={{}} />);
    await userEvent.type(screen.getByLabelText("Search Stacks by name"), "zzz");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText('No open Stack matches "zzz".')).toBeInTheDocument();
  });

  it("shows an empty card and no search box when there are no open Stacks", () => {
    render(<FindStacks hot={[]} all={[]} mine={[]} requests={{}} />);
    expect(screen.getByText("No Open Stacks Yet")).toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });
});
