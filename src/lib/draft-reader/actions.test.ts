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
});
