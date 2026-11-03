import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchupRequest } from "@/lib/matchup-games";
import { RETRY_MS, SETTLE_MS, useMatchupGames } from "@/lib/use-matchup-games";

const invoke = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    functions: { invoke },
  }),
}));

const request: MatchupRequest = {
  ours: [1, 2, 3, 4, 5].map((hero, i) => ({ hero, position: i + 1 })),
  theirs: [6, 7, 8, 9, 10],
  version: 184,
};
const game = { match: 1, account: 1, won: true, level: 16, version: 184, points: [] };
const signedIn = { data: { session: { user: { id: "u" } } }, error: null };
const httpError = (status: number) => ({ context: new Response(null, { status }) });

/** Lets the settle timer run and the awaited calls finish. */
async function settle(ms = SETTLE_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  invoke.mockReset();
  getSession.mockReset().mockResolvedValue(signedIn);
});
afterEach(() => vi.useRealTimers());

describe("useMatchupGames", () => {
  it("waits for the draft to settle, then gives each hero its games", async () => {
    invoke.mockResolvedValue({ data: { slices: [{ hero: 1, games: [game] }] }, error: null });
    const { result } = renderHook(() => useMatchupGames(request));
    expect(result.current).toBeUndefined();
    await settle();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ 1: [game], 2: [], 3: [], 4: [], 5: [] });
  });

  it("asks a signed-out viewer to sign in without calling the function", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useMatchupGames(request));
    await settle();
    expect(result.current).toBe("sign-in");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("gives null on an error or the hourly limit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    invoke.mockResolvedValue({ data: null, error: httpError(429) });
    const { result } = renderHook(() => useMatchupGames(request));
    await settle();
    expect(result.current).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("asks once more when a teammate is fetching the games", async () => {
    invoke
      .mockResolvedValueOnce({ data: { slices: [], pending: [{ hero: 1 }], reasons: ["fetching-elsewhere"] }, error: null })
      .mockResolvedValueOnce({ data: { slices: [{ hero: 1, games: [game] }] }, error: null });
    const { result } = renderHook(() => useMatchupGames(request));
    await settle();
    expect(result.current).toBeUndefined();
    await settle(RETRY_MS);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ 1: [game] });
  });

  it("asks only for the draft as it settles, not every change on the way", async () => {
    invoke.mockResolvedValue({ data: { slices: [] }, error: null });
    const other = { ...request, theirs: [6, 7, 8, 9, 11] };
    const { result, rerender } = renderHook(({ r }) => useMatchupGames(r), { initialProps: { r: request } });
    await settle(SETTLE_MS / 2);
    rerender({ r: other });
    // A new object with the same content is the same request.
    rerender({ r: { ...other } });
    await settle();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0]?.[1]).toEqual({ body: other });
    expect(result.current).toEqual({ 1: [], 2: [], 3: [], 4: [], 5: [] });
  });

  it("is null without a finished draft", () => {
    const { result } = renderHook(() => useMatchupGames(null));
    expect(result.current).toBeNull();
  });
});
