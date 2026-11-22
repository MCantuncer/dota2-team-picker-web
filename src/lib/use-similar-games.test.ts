import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GAME } from "@/lib/similar-games.sample";
import type { SimilarRequest } from "@/lib/similar-games";
import {
  MAX_RETRIES,
  SETTLE_MS,
  useSimilarGames,
} from "@/lib/use-similar-games";

let sessionUser: { user: { id: string } } | null = { user: { id: "u" } };
const invoke = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession,
      // Supabase sends the session as the first event soon after subscribing.
      onAuthStateChange: (
        callback: (
          event: string,
          session: { user: { id: string } } | null,
        ) => void,
      ) => {
        callback("INITIAL_SESSION", sessionUser);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    functions: { invoke },
  }),
}));

const request: SimilarRequest = {
  ours: [8, 74, 129, 128, 5].map((hero, i) => ({ hero, position: i + 1 })),
  enemies: [2, 11, 14, 26, 44],
  heroes: [74],
};
const hero = (games = [GAME], pending = false) => ({
  hero: 74,
  level: 3,
  found: 140,
  games,
  pending,
});
const ok = (data: object) => ({ data, error: null });
const httpError = (status: number) => ({
  data: null,
  error: { context: new Response(null, { status }) },
});

async function settle(ms = SETTLE_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  invoke.mockReset();
  getSession
    .mockReset()
    .mockResolvedValue({
      data: { session: { user: { id: "u" } } },
      error: null,
    });
  sessionUser = { user: { id: "u" } };
});
afterEach(() => vi.useRealTimers());

describe("useSimilarGames", () => {
  it("waits for the request to settle, then gives the hero's answer", async () => {
    invoke.mockResolvedValue(ok({ heroes: [hero()], reasons: [] }));
    const { result } = renderHook(() => useSimilarGames(request));
    expect(result.current).toEqual({ kind: "loading" });
    await settle();
    expect(invoke).toHaveBeenCalledWith("similar-games", { body: request });
    expect(result.current).toEqual({
      kind: "ready",
      answer: hero(),
      reasons: [],
    });
  });

  it("is null without a request", () => {
    expect(renderHook(() => useSimilarGames(null)).result.current).toBeNull();
  });

  it("asks a signed-out viewer to sign in without calling the function", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useSimilarGames(request));
    await settle();
    expect(result.current).toEqual({ kind: "sign-in" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("says when a limit or a failure stopped it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    invoke
      .mockResolvedValueOnce(httpError(429))
      .mockResolvedValueOnce(ok({ heroes: [], reasons: ["user-limit"] }));
    const limited = renderHook(() => useSimilarGames(request));
    await settle();
    expect(limited.result.current).toEqual({
      kind: "unavailable",
      reason: "limit",
    });
    const userLimit = renderHook(() => useSimilarGames(request));
    await settle();
    expect(userLimit.result.current).toEqual({
      kind: "unavailable",
      reason: "limit",
    });
    expect(console.error).not.toHaveBeenCalled();
    invoke.mockResolvedValueOnce(ok({ heroes: "no" }));
    const odd = renderHook(() => useSimilarGames(request));
    await settle();
    expect(odd.result.current).toEqual({
      kind: "unavailable",
      reason: "failed",
    });
  });

  it("shows the games so far, asks again while more are read, and keeps them if a retry fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    invoke
      .mockResolvedValueOnce(
        ok({ heroes: [hero([GAME], true)], reasons: ["time"] }),
      )
      .mockResolvedValueOnce(httpError(500));
    const { result } = renderHook(() => useSimilarGames(request));
    await settle();
    expect(result.current).toMatchObject({
      kind: "ready",
      answer: { pending: true },
    });
    await settle(3000);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({
      kind: "ready",
      answer: { games: [GAME], pending: true },
    });
  });

  it("waits for another browser's search, and gives up after its retries", async () => {
    invoke.mockResolvedValue(
      ok({ heroes: [], reasons: ["searching-elsewhere"], retryIn: 10 }),
    );
    const { result } = renderHook(() => useSimilarGames(request));
    await settle();
    expect(result.current).toEqual({ kind: "loading" });
    for (let i = 0; i < MAX_RETRIES; i++) await settle(10_000);
    expect(invoke).toHaveBeenCalledTimes(MAX_RETRIES + 1);
    expect(result.current).toEqual({ kind: "unavailable", reason: "failed" });
  });
});
