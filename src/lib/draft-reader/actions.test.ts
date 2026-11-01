import { describe, expect, it } from "vitest";
import { readActions } from "./actions";
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
