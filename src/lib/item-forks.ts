/**
 * If a Key Item Is Late (Item Build tab, Can's go 2026-11-12 on the mockup): for each core item of the build
 * that the guide games have item paths for (skillBuilds[hero][position].itemPaths, from high-rank wins this
 * patch), how many wins had it by its late minute, how many didn't, and what those bought instead.
 * Wins only: it shows what winners did, not proof that a road wins.
 */
import type { ItemBuild } from "@/lib/engine/item-build";
import type { KeyPaths, Snapshot } from "@/lib/engine/types";

/** The late group needs this many wins before the backend looks for their path (item-paths.ts MIN_GROUP). */
export const MIN_GROUP = 12;
/** A key item needs this many wins still running at its late minute, so "2 of 3" never shows. */
export const MIN_RUNNING = 10;
/** The wins split in two lanes when at least this share of them didn't have the item on time; below it, one line. */
export const SPLIT_SHARE = 0.2;

/** One step of the late wins' path: the item, its median minute, and how many late wins bought it as their next big item. */
export interface ForkStep {
  itemId: number;
  name: string;
  img: string;
  minute: number;
  games: number;
}

/** One key item's split of the wins still running at its late minute. */
export interface ItemFork {
  itemId: number;
  name: string;
  img: string;
  late: number;
  running: number;
  onTime: number;
  /** Wins without it by `late`. */
  lateGames: number;
  /** How many of those bought it after `late`; only known when the late group had a common path. */
  keyLater?: number;
  /** False when so few wins were late that one line says it (SPLIT_SHARE). */
  split: boolean;
  /**
   * What the late wins bought next, leaving out items the build already has before this one (the key item
   * itself can be a step). Empty with `road` "earlier" when every step was one of those, "none" when no next item was common (or too few late
   * wins to look, `lateGames` under MIN_GROUP).
   */
  steps: ForkStep[];
  road: "own" | "earlier" | "none";
}

/** The forks of a build's core items, in build order. */
export function itemForks(
  build: Pick<ItemBuild, "core" | "timings">,
  paths: Record<string, KeyPaths> | undefined,
  items: Snapshot["items"],
): ItemFork[] {
  // Rough OpenDota minutes can't be put beside the guide games' late minute (as game-plan.ts itemJourney).
  if (!paths || build.timings === "around") return [];
  return build.core.flatMap((item, index): ItemFork[] => {
    const p = paths[item.itemId];
    if (!p || p.running < MIN_RUNNING) return [];
    const before = new Set(build.core.slice(0, index).map((i) => i.itemId));
    const steps = (p.path?.steps ?? []).flatMap(([itemId, minute, games]): ForkStep[] => {
      if (before.has(itemId)) return [];
      // The key item itself stays: late wins buying it next is part of their road. An item missing from the
      // shop list keeps its step with a plain name and no art.
      const info = items?.[itemId];
      return [{ itemId, name: info?.name ?? `Item ${itemId}`, img: info?.img ?? "", minute, games }];
    });
    const lateGames = p.running - p.onTime;
    const road = steps.length > 0 ? "own" : p.path ? "earlier" : "none";
    return [
      {
        itemId: item.itemId,
        name: item.name,
        img: item.img,
        late: p.late,
        running: p.running,
        onTime: p.onTime,
        lateGames,
        ...(p.path ? { keyLater: p.path.keyLater } : {}),
        split: lateGames >= p.running * SPLIT_SHARE,
        steps,
        road,
      },
    ];
  });
}
