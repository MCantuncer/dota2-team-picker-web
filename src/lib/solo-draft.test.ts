import { describe, expect, it } from "vitest";
import { applyAction, type DraftEntry } from "@/lib/draft";
import { diffActions, enteredElsewhere, mergeSoloRows, toSoloRow, undoActions, type SoloActionRow } from "./solo-draft";

const ally = (heroId: number, position: DraftEntry["position"] = null): DraftEntry => ({ heroId, kind: "ally", position });
const enemy = (heroId: number): DraftEntry => ({ heroId, kind: "enemy", position: null });
const ban = (heroId: number): DraftEntry => ({ heroId, kind: "ban", position: null });
const sorted = (d: DraftEntry[]) => [...d].sort((a, b) => a.heroId - b.heroId);

describe("diffActions", () => {
  const cases: [string, DraftEntry[], DraftEntry[]][] = [
    ["an empty board to a full one", [], [ally(1, 1), ally(2), enemy(3), ban(4)]],
    ["back to an empty board", [ally(1, 1), enemy(3), ban(4)], []],
    ["a position change", [ally(1, 1), ally(2, 2)], [ally(1, 2), ally(2, 1)]],
    ["a hero moved to the other team", [ally(1)], [enemy(1)]],
    ["a pick turned into a ban", [enemy(5)], [ban(5)]],
    ["no change", [ally(1, 3), ban(2)], [ally(1, 3), ban(2)]],
    ["a full team swapped out", [1, 2, 3, 4, 5].map((h) => ally(h)), [6, 7, 8, 9, 10].map((h) => ally(h))],
  ];
  it.each(cases)("turns one board into the other: %s", (_, from, to) => {
    expect(sorted(diffActions(from, to).reduce(applyAction, from))).toEqual(sorted(to));
  });

  it("changes nothing when the boards match", () => {
    expect(diffActions([ally(1, 3), ban(2)], [ally(1, 3), ban(2)])).toEqual([]);
  });

  it("keeps an entry another device made in between when undoing on top of it", () => {
    // This tab added hero 1; the phone then added hero 9. Undo goes back to before hero 1.
    const now = [ally(1), enemy(9)];
    const undone = diffActions([ally(1)], []).reduce(applyAction, now);
    expect(undone).toEqual([enemy(9)]);
  });
});

describe("undoActions", () => {
  it("takes back only the heroes the change moved", () => {
    // This tab added an ally while a ban was in; the phone then took the ban out.
    const back = undoActions([ban(1)], [ban(1), ally(2, 3)]);
    expect(back.reduce(applyAction, [ally(2, 3)])).toEqual([]);
  });

  it("puts a removed hero back where it was", () => {
    const back = undoActions([ally(2, 3), enemy(4)], [enemy(4)]);
    expect(sorted(back.reduce(applyAction, [enemy(4), ban(9)]))).toEqual(sorted([ally(2, 3), enemy(4), ban(9)]));
  });

  it("moves a pick back to its old position", () => {
    const back = undoActions([ally(2, 3)], [ally(2, 1)]);
    expect(back.reduce(applyAction, [ally(2, 1)])).toEqual([ally(2, 3)]);
  });

  it("brings a whole board back after Start Over", () => {
    const old = [ally(2, 3), enemy(4), ban(9)];
    expect(sorted(undoActions(old, []).reduce(applyAction, []))).toEqual(sorted(old));
  });
});

describe("toSoloRow", () => {
  const row = { id: 3, kind: "ally", hero_id: 74, position: 2, device: "pc", draft_id: "x" };
  it("keeps a good row", () => {
    expect(toSoloRow(row)).toEqual({ id: 3, kind: "ally", hero_id: 74, position: 2, device: "pc" });
  });
  it.each([
    ["no object", null],
    ["an unknown kind", { ...row, kind: "pick" }],
    ["a bad hero", { ...row, hero_id: 0 }],
    ["a bad position", { ...row, position: 6 }],
    ["no device", { ...row, device: undefined }],
    ["a text id", { ...row, id: "3" }],
  ])("drops %s", (_, v) => {
    expect(toSoloRow(v)).toBeNull();
  });
});

describe("mergeSoloRows and enteredElsewhere", () => {
  const r = (id: number, hero_id: number, device: string, kind = "ally"): SoloActionRow => ({
    id,
    kind,
    hero_id,
    position: null,
    device,
  });

  it("keeps each row once, oldest first", () => {
    expect(mergeSoloRows([r(2, 1, "pc"), r(1, 2, "pc")], [r(2, 1, "pc"), r(3, 3, "phone")]).map((x) => x.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it("finds the heroes the other device put on the board", () => {
    const rows = [r(1, 10, "pc"), r(2, 11, "phone"), r(3, 12, "phone"), r(4, 12, "pc"), r(5, 13, "phone", "remove")];
    expect(enteredElsewhere(rows, [ally(10), ally(11), ally(12)], "pc")).toEqual(new Set([11]));
  });
});
