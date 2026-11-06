import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SOLO_ME } from "@/lib/solo-queue";
import { teamStorageKey } from "@/lib/team-lineup";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

import { useTeamLineup } from "./use-team-lineup";

const stacks = [{ id: "s1", name: "Night Owls" }];
const row = (user_id: string, more: object = {}) => ({
  user_id,
  display_name: user_id,
  avatar_url: null,
  rank_tier: null,
  positions: [],
  favorites: {},
  hero_stats: {},
  stacks: [],
  is_friend: true,
  shared: true,
  ...more,
});
const props = (userId: string | null) => ({ userId, enabled: true, stacks, myPosition: 2 as const, myHeroes: {}, personal: {} });

describe("useTeamLineup", () => {
  beforeEach(() => {
    rpc.mockReset();
    localStorage.clear();
    window.history.replaceState(null, "", "/draft");
  });

  it("starts fresh from the Stack in the address, then drops it from the address", async () => {
    window.history.replaceState(null, "", "/draft?stack=s1");
    rpc.mockResolvedValue({
      data: [row("tusk", { positions: [3], stacks: [{ id: "s1", name: "Night Owls", joined_at: "2026-11-01", role: "player" }] })],
      error: null,
    });
    const { result } = renderHook(() => useTeamLineup(props("u1")));
    await waitFor(() => expect(result.current.seats).toHaveLength(2));
    expect(result.current.seats).toEqual([
      { id: SOLO_ME, position: 2 },
      { id: "tusk", position: 3 },
    ]);
    expect(window.location.search).toBe("");
    expect(result.current.plan!.names.tusk).toBe("tusk");
  });

  it("adds the friend from Plan a Draft to the saved Team, then drops them from the address", async () => {
    const saved = { mode: "team", seats: [{ id: SOLO_ME, position: 1 }, { id: "tusk", position: 4 }] };
    localStorage.setItem(teamStorageKey("u1"), JSON.stringify(saved));
    window.history.replaceState(null, "", "/draft?with=pal");
    rpc.mockResolvedValue({ data: [row("tusk"), row("pal", { positions: [3] })], error: null });
    const { result } = renderHook(() => useTeamLineup(props("u1")));
    await waitFor(() => expect(result.current.seats).toHaveLength(3));
    expect(result.current.seats).toContainEqual({ id: "pal", position: 3 });
    expect(result.current.notice).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("says so when the friend from Plan a Draft can't be planned for", async () => {
    window.history.replaceState(null, "", "/draft?with=gone");
    rpc.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useTeamLineup(props("u1")));
    await waitFor(() => expect(result.current.notice).toMatch(/no longer yours/));
    expect(result.current.mode).toBe("team");
    expect(result.current.seats).toEqual([{ id: SOLO_ME, position: 2 }]);
  });

  it("keeps the saved seats when the players don't load", async () => {
    const saved = { mode: "team", seats: [{ id: SOLO_ME, position: 1 }, { id: "pal", position: 4 }] };
    localStorage.setItem(teamStorageKey("u1"), JSON.stringify(saved));
    rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    const { result } = renderHook(() => useTeamLineup(props("u1")));
    await waitFor(() => expect(result.current.notice).toMatch(/offline/));
    expect(result.current.seats).toEqual(saved.seats);
    expect(JSON.parse(localStorage.getItem(teamStorageKey("u1"))!)).toEqual(saved);
  });

  it("opens the seat of someone no longer listed and says so", async () => {
    localStorage.setItem(teamStorageKey("u1"), JSON.stringify({ mode: "team", seats: [{ id: SOLO_ME, position: 1 }, { id: "gone", position: 4 }] }));
    rpc.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useTeamLineup(props("u1")));
    await waitFor(() => expect(result.current.notice).toMatch(/no longer yours/));
    expect(result.current.seats).toEqual([{ id: SOLO_ME, position: 1 }]);
    expect(result.current.plan!.members.find((m) => m.position === 4)!.id).toBe("teammate-4");
  });

  it("works signed out without asking for players", async () => {
    const { result } = renderHook(() => useTeamLineup(props(null)));
    act(() => result.current.team());
    expect(result.current.plan!.myPosition).toBe(2);
    await waitFor(() => expect(localStorage.getItem(teamStorageKey(null))).not.toBeNull());
    expect(rpc).not.toHaveBeenCalled();
    act(() => result.current.justMe());
    expect(result.current.plan).toBeNull();
  });
});
