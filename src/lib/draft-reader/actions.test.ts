import { describe, expect, it } from "vitest";
import { LiveReads, readActions } from "./actions";
import type { DraftRead } from "./reader";

const slot = (heroId: number | null) => ({ heroId, unsure: false });
const read: DraftRead = {
  radiant: [slot(5), slot(null), slot(null), slot(null), slot(null)],
  dire: [slot(26), slot(14), slot(null), slot(null), slot(null)],
  bans: [1, 11],
};

describe("readActions", () => {
  it("puts your side on your team and the other side on the enemy", () => {
    expect(readActions(read, "radiant", new Set())).toEqual([
      { kind: "ally", heroId: 5 },
      { kind: "enemy", heroId: 26 },
      { kind: "enemy", heroId: 14 },
      { kind: "ban", heroId: 1 },
      { kind: "ban", heroId: 11 },
    ]);
    expect(
      readActions(read, "dire", new Set())
        .filter((a) => a.kind === "ally")
        .map((a) => a.heroId),
    ).toEqual([26, 14]);
  });

  it("leaves heroes already in the draft alone, so their typed positions stay", () => {
    expect(readActions(read, "radiant", new Set([5, 1])).map((a) => a.heroId)).toEqual([26, 14, 11]);
  });

  it("puts the hero in your own slot at your position, when you have no hero yet", () => {
    const withMe: DraftRead = { ...read, me: { side: "dire", slot: 1, by: "name" } };
    const allies = (position: 2 | null) => readActions(withMe, "dire", new Set(), position).filter((a) => a.kind === "ally");
    expect(allies(2)).toEqual([
      { kind: "ally", heroId: 26 },
      { kind: "ally", heroId: 14, position: 2 },
    ]);
    // You already have a hero: nothing is placed.
    expect(allies(null).every((a) => a.position === undefined)).toBe(true);
    // Your slot is on the other side, or empty: nothing is placed.
    expect(readActions(withMe, "radiant", new Set(), 2).some((a) => a.position !== undefined)).toBe(false);
    const emptySlot: DraftRead = { ...read, me: { side: "dire", slot: 3, by: "glow" } };
    expect(readActions(emptySlot, "dire", new Set(), 2).some((a) => a.position !== undefined)).toBe(false);
  });
});

describe("LiveReads", () => {
  const empty: DraftRead = { radiant: [slot(null)], dire: [slot(null)], bans: [] };
  const withPick = (heroId: number): DraftRead => ({ radiant: [slot(heroId)], dire: [slot(null)], bans: [3] });
  const none = new Set<number>();
  const picks = (r: DraftRead) => [...r.radiant, ...r.dire].flatMap((s) => (s.heroId === null ? [] : [s.heroId]));

  it("passes a hero on once it shows in two reads in a row", () => {
    const live = new LiveReads();
    expect(picks(live.next(withPick(5), none))).toEqual([]);
    const second = live.next(withPick(5), none);
    expect(picks(second)).toEqual([5]);
    expect(second.bans).toEqual([3]);
  });

  it("skips a portrait that changes between reads", () => {
    const live = new LiveReads();
    live.next(withPick(5), none);
    expect(picks(live.next(withPick(6), none))).toEqual([]);
    expect(picks(live.next(empty, none))).toEqual([]);
  });

  it("offers a hero again until it reaches the draft", () => {
    const live = new LiveReads();
    live.next(withPick(5), none);
    expect(picks(live.next(withPick(5), none))).toEqual([5]);
    // The add was lost: it is offered again.
    expect(picks(live.next(withPick(5), none))).toEqual([5]);
    expect(picks(live.next(withPick(5), new Set([5, 3])))).toEqual([]);
  });

  it("keeps a hero out once it has been in the draft, so a hero removed by hand stays out", () => {
    const live = new LiveReads();
    live.next(withPick(5), none);
    live.next(withPick(5), none);
    live.next(withPick(5), new Set([5, 3]));
    const removed = live.next(withPick(5), none);
    expect(picks(removed)).toEqual([]);
    expect(removed.bans).toEqual([]);
  });

  it("keeps a hero out when it was added and removed between two reads", () => {
    const live = new LiveReads();
    live.next(withPick(5), none);
    live.next(withPick(5), none);
    live.saw(new Set([5, 3]));
    expect(picks(live.next(withPick(5), none))).toEqual([]);
  });
});

describe("LiveReads, your side", () => {
  const at = (side: "radiant" | "dire", slot: number): DraftRead => ({ ...read, me: { side, slot, by: "name" } });

  it("passes your side on once two reads in a row agree", () => {
    const live = new LiveReads();
    expect(live.next(at("dire", 2), new Set()).me).toBeNull();
    expect(live.next(at("dire", 2), new Set()).me).toEqual({ side: "dire", slot: 2, by: "name" });
  });

  it("starts over when a read disagrees or finds nothing", () => {
    const live = new LiveReads();
    live.next(at("dire", 2), new Set());
    expect(live.next(at("radiant", 0), new Set()).me).toBeNull();
    expect(live.next({ ...read, me: null }, new Set()).me).toBeNull();
    expect(live.next(at("radiant", 0), new Set()).me).toBeNull();
    expect(live.next(at("radiant", 0), new Set()).me?.side).toBe("radiant");
  });
});
