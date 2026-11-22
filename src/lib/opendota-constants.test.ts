import { afterEach, describe, expect, it, vi } from "vitest";
import { getHeroes } from "./heroes";
import { getItems } from "./items";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("OpenDota hero and item lists", () => {
  it("use OpenDota's lists when it answers", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ "1": { id: 1, localized_name: "Test Hero", img: "/h.png?", icon: "/i.png?", primary_attr: "agi", roles: [] } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect((await getHeroes()).map((h) => h.name)).toEqual(["Test Hero"]);
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("use the shipped copy when OpenDota fails or stalls", async () => {
    const log = quiet();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 521 })));
    expect((await getHeroes()).find((h) => h.id === 1)?.name).toBe("Anti-Mage");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new DOMException("timed out", "TimeoutError"))));
    expect((await getItems()).get(145)?.name).toBe("Battle Fury");
    expect(log).toHaveBeenCalledTimes(2);
  });

  it("use only the shipped copy in browser tests", async () => {
    vi.stubEnv("OPENDOTA_CONSTANTS", "bundled");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const heroes = await getHeroes();
    expect(heroes.length).toBeGreaterThan(120);
    expect(heroes[0].image).toMatch(/^https:\/\/cdn\.cloudflare\.steamstatic\.com\/apps\/dota2\/images\/dota_react\/heroes\/\w+\.png$/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
