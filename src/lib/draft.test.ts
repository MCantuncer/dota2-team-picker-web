import { describe, expect, it } from "vitest";
import { actorsOf, applyAction, heroesOf, lastEntryBy, mergeRows, replay, splitPosition, toAction, type ActionRow, type DraftAction } from "./draft";

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

describe("party draft rows", () => {
  const row = (id: number, actor: string, kind: string, hero: number, position: number | null = null): ActionRow => ({
    id,
    actor_id: actor,
    kind,
    hero_id: hero,
    position,
  });

  it("reads rows as actions and skips unknown ones", () => {
    expect(toAction(row(1, "a", "ally", 5, 3))).toEqual({ kind: "ally", heroId: 5, position: 3 });
    expect(toAction(row(2, "a", "enemy", 6, 9))).toEqual({ kind: "enemy", heroId: 6, position: null });
    expect(toAction(row(3, "a", "swap", 6))).toBeNull();
  });

  it("merges a load and live updates once each, in id order", () => {
    const merged = mergeRows([row(2, "a", "ban", 1), row(1, "a", "ban", 2)], [row(2, "a", "ban", 1), row(3, "b", "enemy", 4)]);
    expect(merged.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("knows who entered each hero and what to undo", () => {
    const rows = [row(1, "a", "ally", 5), row(2, "b", "enemy", 6), row(3, "a", "ban", 7), row(4, "b", "remove", 7)];
    const draft = replay(rows.map(toAction).filter((a) => a !== null));
    expect([...actorsOf(rows)]).toEqual([
      [5, "a"],
      [6, "b"],
    ]);
    // a's ban was taken out by b, so a's Undo takes back the ally pick.
    expect(lastEntryBy(rows, draft, "a")).toBe(5);
    expect(lastEntryBy(rows, draft, "c")).toBeNull();
  });
});
