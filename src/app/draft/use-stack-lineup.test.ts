import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lineupStorageKey } from "@/lib/stack-lineup";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

import { useStackLineup } from "./use-stack-lineup";

const stacks = [{ id: "s1", name: "Night Owls" }];
const member = (user_id: string, display_name: string, role = "player") => ({ user_id, display_name, role, avatar_url: null, rank_tier: null });
const stats = (user_id: string, positions: number[] = []) => ({
  user_id,
  display_name: user_id,
  rank_tier: null,
  positions,
  favorites: {},
  hero_stats: {},
});

function respond(members: unknown[], rows: unknown[]) {
  rpc.mockImplementation((name: string) =>
    Promise.resolve({ data: name === "stack_members" ? members : rows, error: null }),
  );
}

describe("useStackLineup", () => {
  beforeEach(() => {
    rpc.mockReset();
    localStorage.clear();
  });

  it("ticks the player at their favorite free position once the Stack loads", async () => {
    respond([member("me", "Mirana", "owner"), member("tusk", "Tusk")], [stats("me", [4]), stats("tusk", [3])]);
    const { result } = renderHook(() => useStackLineup("me", stacks));
    act(() => result.current.choose("s1"));
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    expect(result.current.picks).toEqual([{ id: "me", position: 4 }]);
    expect(result.current.plan!.myPosition).toBe(4);
    expect(result.current.people!.map((p) => p.name)).toEqual(["You", "Tusk"]);
  });

  it("shows people whose heroes aren't shared, but they can't play", async () => {
    // A Manager: the owner is in the Stack but stack_player_stats leaves them out.
    respond([member("own", "Mirana", "owner"), member("me", "Lina", "co_captain")], [stats("me")]);
    const { result } = renderHook(() => useStackLineup("me", stacks));
    act(() => result.current.choose("s1"));
    await waitFor(() => expect(result.current.people).not.toBeNull());
    expect(result.current.people!.find((p) => p.id === "own")!.canPlay).toBe(false);
  });

  it("falls back to Just Me and clears the saved lineup when the player no longer runs the Stack", async () => {
    localStorage.setItem(lineupStorageKey("me"), JSON.stringify({ stackId: "s1", picks: [{ id: "me", position: 1 }] }));
    respond([member("me", "Lina")], []);
    const { result } = renderHook(() => useStackLineup("me", stacks));
    await waitFor(() => expect(result.current.notice).toMatch(/no longer yours to plan/));
    expect(result.current.stackId).toBe("");
    expect(result.current.plan).toBeNull();
    expect(localStorage.getItem(lineupStorageKey("me"))).toBeNull();
  });

  it("restores a saved lineup and ignores one for a Stack the player doesn't run", async () => {
    respond([member("me", "Mirana", "owner"), member("tusk", "Tusk")], [stats("me"), stats("tusk")]);
    localStorage.setItem(lineupStorageKey("me"), JSON.stringify({ stackId: "s1", picks: [{ id: "tusk", position: 2 }] }));
    const { result } = renderHook(() => useStackLineup("me", stacks));
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    expect(result.current.plan!.members).toEqual([{ id: "tusk", position: 2 }]);
    expect(result.current.plan!.myPosition).toBeNull();

    localStorage.setItem(lineupStorageKey("other"), JSON.stringify({ stackId: "gone", picks: [] }));
    const other = renderHook(() => useStackLineup("other", stacks));
    await waitFor(() => expect(other.result.current.stackId).toBe(""));
  });
});
