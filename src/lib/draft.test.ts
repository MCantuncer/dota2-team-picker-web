import { describe, expect, it } from "vitest";
import { applyAction, heroesOf, replay, splitPosition, type DraftAction } from "./draft";

describe("applyAction", () => {
  it("adds picks and bans in order", () => {
    const draft = replay([
      { kind: "ban", heroId: 1 },
      { kind: "ally", heroId: 2, position: 5 },
      { kind: "enemy", heroId: 3 },
    ]);
    expect(draft).toEqual([
      { heroId: 1, kind: "ban", position: null },
      { heroId: 2, kind: "ally", position: 5 },
      { heroId: 3, kind: "enemy", position: null },
    ]);
  });

  it("keeps a hero in the draft once", () => {
    const draft = replay([{ kind: "enemy", heroId: 3 }]);
    expect(applyAction(draft, { kind: "ally", heroId: 3 })).toBe(draft);
    expect(applyAction(draft, { kind: "ban", heroId: 3 })).toBe(draft);
  });

  it("changes an ally's position when the ally is entered again", () => {
    const draft = replay([{ kind: "ally", heroId: 2 }]);
    expect(applyAction(draft, { kind: "ally", heroId: 2, position: 3 })).toEqual([{ heroId: 2, kind: "ally", position: 3 }]);
  });

  it("gives enemies and bans no position", () => {
    expect(replay([{ kind: "enemy", heroId: 3, position: 2 }])[0]!.position).toBeNull();
  });

  it("stops a team at five picks", () => {
    const five: DraftAction[] = [10, 11, 12, 13, 14].map((heroId) => ({ kind: "enemy", heroId }));
    const draft = replay(five);
    expect(applyAction(draft, { kind: "enemy", heroId: 15 })).toBe(draft);
    expect(applyAction(draft, { kind: "ally", heroId: 15 })).toHaveLength(6);
  });

  it("takes a hero back out, and ignores removing one that is not in", () => {
    const draft = replay([{ kind: "enemy", heroId: 3 }]);
    expect(applyAction(draft, { kind: "remove", heroId: 3 })).toEqual([]);
    expect(applyAction(draft, { kind: "remove", heroId: 4 })).toBe(draft);
  });
});

describe("heroesOf", () => {
  it("lists one kind in entry order", () => {
    const draft = replay([
      { kind: "enemy", heroId: 5 },
      { kind: "ban", heroId: 1 },
      { kind: "enemy", heroId: 3 },
    ]);
    expect(heroesOf(draft, "enemy")).toEqual([5, 3]);
  });
});

describe("splitPosition", () => {
  it("reads a trailing position digit", () => {
    expect(splitPosition("cm5")).toEqual({ query: "cm", position: 5 });
    expect(splitPosition("crystal 4 ")).toEqual({ query: "crystal", position: 4 });
  });

  it("leaves names without a valid digit alone", () => {
    expect(splitPosition("cm")).toEqual({ query: "cm", position: null });
    expect(splitPosition("cm7")).toEqual({ query: "cm7", position: null });
    expect(splitPosition("5")).toEqual({ query: "5", position: null });
  });
});
