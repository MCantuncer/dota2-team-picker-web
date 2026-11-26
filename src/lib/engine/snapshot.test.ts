import { afterEach, describe, expect, it, vi } from "vitest";

/** A fresh copy of the module, so each test starts without a download in flight. */
const fresh = async () => {
  vi.resetModules();
  return import("./snapshot");
};

afterEach(() => vi.unstubAllGlobals());

describe("loadSnapshot", () => {
  it("downloads the hero data once per page, however many boards ask", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ heroes: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const { loadSnapshot, SNAPSHOT_URL } = await fresh();
    const [a, b] = await Promise.all([loadSnapshot(), loadSnapshot()]);
    expect(await loadSnapshot()).toBe(a);
    expect(b).toBe(a);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(SNAPSHOT_URL);
  });

  it("tries again after a failed download instead of keeping the failure", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ heroes: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const { loadSnapshot } = await fresh();
    await expect(loadSnapshot()).rejects.toThrow("Hero data download failed (503)");
    await expect(loadSnapshot()).resolves.toEqual({ heroes: {} });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("hands the data's game fact updates to the engine", async () => {
    const updates = { at: "2026-11-27T00:00:00.000Z", itemFacts: { bracer: { attack: true } } };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ heroes: {}, factUpdates: updates }), { status: 200 })));
    const { loadSnapshot } = await fresh();
    await loadSnapshot();
    // The same fresh module graph as the loader, so the engine reads the updates it was given.
    const { itemFact } = await import("./item-facts");
    expect(itemFact("bracer")).toEqual({ attack: true });
  });
});
