import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchupRequest } from "@/lib/matchup-games";
import { BUSY_RETRIES, RETRY_MS, SETTLE_MS, useMatchupGames } from "@/lib/use-matchup-games";

let sessionUser: { user: { id: string } } | null = { user: { id: "u" } };
const invoke = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession,
      // Supabase sends the session as the first event soon after subscribing.
      onAuthStateChange: (callback: (event: string, session: { user: { id: string } } | null) => void) => {
        callback("INITIAL_SESSION", sessionUser);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
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
  sessionUser = { user: { id: "u" } };
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

  it("treats a 401 as signed out", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(401) });
    const { result } = renderHook(() => useMatchupGames(request));
    await settle();
    expect(result.current).toBe("sign-in");
  });

  it("skips the second ask and sets nothing when the card goes away during the wait", async () => {
    invoke.mockResolvedValue({ data: { slices: [], pending: [{ hero: 1 }], reasons: ["fetching-elsewhere"] }, error: null });
    const { result, unmount } = renderHook(() => useMatchupGames(request));
    await settle();
    unmount();
    await settle(RETRY_MS);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.current).toBeUndefined();
  });

  it("shows what it has while STRATZ is busy, then asks again at the time given", async () => {
    const busy = () => ({
      data: { slices: [], pending: [{ hero: 1 }], reasons: ["stratz-busy"], retryAt: new Date(Date.now() + 60_000).toISOString() },
      error: null,
    });
    invoke.mockImplementationOnce(() => Promise.resolve(busy())).mockResolvedValueOnce({ data: { slices: [{ hero: 1, games: [game] }] }, error: null });
    const { result } = renderHook(() => useMatchupGames(request));
    await settle();
    expect(result.current).toMatchObject({ 1: null, 2: [] });
    await settle(59_000);
    expect(invoke).toHaveBeenCalledTimes(1);
    await settle(1_000);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ 1: [game] });
  });

  const busyAnswer = (retryIn?: number) => ({
    data: { slices: [{ hero: 2, games: [game] }], pending: [{ hero: 1 }], reasons: ["stratz-busy"], retryIn },
    error: null,
  });

  it("stops asking after a few busy answers", async () => {
    invoke.mockImplementation(() => Promise.resolve(busyAnswer(60)));
    renderHook(() => useMatchupGames(request));
    await settle();
    for (let i = 0; i < BUSY_RETRIES + 2; i++) await settle(60_000);
    expect(invoke).toHaveBeenCalledTimes(1 + BUSY_RETRIES);
  });

  it("doesn't ask again when the card goes away or the draft changes before the retry", async () => {
    invoke.mockImplementation(() => Promise.resolve(busyAnswer(60)));
    const { unmount } = renderHook(() => useMatchupGames(request));
    await settle();
    unmount();
    await settle(60_000);
    expect(invoke).toHaveBeenCalledTimes(1);

    invoke.mockClear();
    const other = { ...request, theirs: [6, 7, 8, 9, 11] };
    const { rerender } = renderHook(({ r }) => useMatchupGames(r), { initialProps: { r: request } });
    await settle();
    rerender({ r: other });
    await settle();
    await settle(60_000);
    // The first draft, the second, and the second's own retry: never the first's retry.
    // The invoke mock is untyped; the hook always sends { body: request }.
    expect(invoke.mock.calls.map((c) => (c[1] as { body: MatchupRequest }).body.theirs.at(-1))).toEqual([10, 11, 11]);
  });

  it("keeps the games already shown when a retry fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    invoke.mockResolvedValueOnce(busyAnswer(60)).mockResolvedValueOnce({ data: null, error: httpError(500) });
    const { result } = renderHook(() => useMatchupGames(request));
    await settle();
    await settle(60_000);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ 1: null, 2: [game] });
  });

  it("doesn't ask again for a busy answer with no time, or one too far out", async () => {
    for (const retryIn of [undefined, 3600]) {
      invoke.mockReset().mockResolvedValue(busyAnswer(retryIn));
      const { unmount } = renderHook(() => useMatchupGames(request));
      await settle();
      await settle(61 * 60_000);
      expect(invoke).toHaveBeenCalledTimes(1);
      unmount();
    }
  });

  it("is null without a finished draft", () => {
    const { result } = renderHook(() => useMatchupGames(null));
    expect(result.current).toBeNull();
  });
});
