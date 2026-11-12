import { describe, expect, it } from "vitest";
import type { BuildItem } from "@/lib/engine/item-build";
import type { KeyPaths, Snapshot } from "@/lib/engine/types";
import { itemForks } from "@/lib/item-forks";

const item = (itemId: number, name: string, minute: number): BuildItem => ({ itemId, name, img: `/i/${itemId}.png`, minute });
// Only the fields itemForks reads.
const items = {
  "48": { key: "travel_boots", name: "Boots of Travel", cost: 2500, img: "/i/48.png", components: [] },
  "116": { key: "black_king_bar", name: "Black King Bar", cost: 4050, img: "/i/116.png", components: [] },
  "1": { key: "blink", name: "Blink Dagger", cost: 2250, img: "/i/1.png", components: [] },
  "137": { key: "radiance", name: "Radiance", cost: 4700, img: "/i/137.png", components: [] },
} as Snapshot["items"];
// Doom's offlane build, in buy order.
const build = { timings: "rank" as const, core: [item(50, "Phase Boots", 8), item(1, "Blink Dagger", 18), item(137, "Radiance", 19), item(116, "Black King Bar", 28)] };

describe("itemForks", () => {
  it("splits a key item most wins skipped, and lists what they bought that the build doesn't have before it", () => {
    const paths: Record<string, KeyPaths> = {
      "137": { late: 18, running: 61, onTime: 15, path: { games: 46, keyLater: 4, steps: [[1, 14, 37], [116, 24, 24], [48, 26, 12]] } },
    };
    expect(itemForks(build, paths, items)).toEqual([
      {
        itemId: 137,
        name: "Radiance",
        img: "/i/137.png",
        late: 18,
        running: 61,
        onTime: 15,
        lateGames: 46,
        keyLater: 4,
        split: true,
        road: "own",
        // Blink Dagger comes before Radiance in the build, so it isn't a different road.
        steps: [
          { itemId: 116, name: "Black King Bar", img: "/i/116.png", minute: 24, games: 24 },
          { itemId: 48, name: "Boots of Travel", img: "/i/48.png", minute: 26, games: 12 },
        ],
      },
    ]);
  });

  it("keeps one line when few wins were late, and leaves the later count unknown without a path", () => {
    const [blink] = itemForks(build, { "1": { late: 20, running: 61, onTime: 50 } }, items);
    expect(blink).toMatchObject({ split: false, lateGames: 11, steps: [], road: "none" });
    expect(blink).not.toHaveProperty("keyLater");
  });

  it("marks a path made only of the build's earlier items", () => {
    const paths: Record<string, KeyPaths> = { "137": { late: 18, running: 61, onTime: 15, path: { games: 46, keyLater: 4, steps: [[50, 8, 40], [1, 14, 37]] } } };
    expect(itemForks(build, paths, items)[0]).toMatchObject({ steps: [], road: "earlier", keyLater: 4 });
  });

  it("keeps the key item as a step when late wins mostly bought it next, and unknown items with a plain name", () => {
    const paths: Record<string, KeyPaths> = { "137": { late: 18, running: 61, onTime: 15, path: { games: 46, keyLater: 30, steps: [[137, 24, 30], [999, 30, 20]] } } };
    expect(itemForks(build, paths, items)[0]).toMatchObject({
      road: "own",
      steps: [
        { itemId: 137, name: "Radiance", minute: 24, games: 30 },
        { itemId: 999, name: "Item 999", img: "", minute: 30, games: 20 },
      ],
    });
  });

  it("shows nothing for rough minutes", () => {
    expect(itemForks({ ...build, timings: "around" }, { "1": { late: 20, running: 61, onTime: 10 } }, items)).toEqual([]);
  });

  it("splits at a fifth of the wins", () => {
    expect(itemForks(build, { "1": { late: 20, running: 50, onTime: 40 } }, items)[0]?.split).toBe(true);
    expect(itemForks(build, { "1": { late: 20, running: 50, onTime: 41 } }, items)[0]?.split).toBe(false);
  });

  it("leaves out items with too few wins, items outside the build, and builds without paths", () => {
    expect(itemForks(build, { "1": { late: 20, running: 9, onTime: 2 } }, items)).toEqual([]);
    expect(itemForks(build, { "999": { late: 20, running: 60, onTime: 10 } }, items)).toEqual([]);
    expect(itemForks(build, undefined, items)).toEqual([]);
  });
});
