import { describe, expect, it } from "vitest";
import {
  cleanLineup,
  defaultPosition,
  isSavedLineup,
  lineupStorageKey,
  LINEUP_MAX,
  setPosition,
  togglePerson,
  type LineupPerson,
} from "@/lib/stack-lineup";

const person = (id: string, positions: LineupPerson["positions"] = [], canPlay = true): LineupPerson => ({
  id,
  name: id,
  positions,
  canPlay,
});

describe("defaultPosition", () => {
  it("takes the first favorite position nobody has", () => {
    expect(defaultPosition(person("a", [2, 3]), new Set([2]))).toBe(3);
  });
  it("falls back to the first free position", () => {
    expect(defaultPosition(person("a", [2]), new Set([1, 2]))).toBe(3);
    expect(defaultPosition(person("a"), new Set())).toBe(1);
  });
});

describe("togglePerson", () => {
  it("ticks with a default position and unticks", () => {
    const one = togglePerson([], person("a", [5]));
    expect(one).toEqual([{ id: "a", position: 5 }]);
    expect(togglePerson(one, person("a", [5]))).toEqual([]);
  });
  it("stops at five players", () => {
    let lineup = ["a", "b", "c", "d", "e"].reduce((l, id) => togglePerson(l, person(id)), [] as ReturnType<typeof togglePerson>);
    expect(lineup).toHaveLength(LINEUP_MAX);
    expect(new Set(lineup.map((e) => e.position)).size).toBe(5);
    lineup = togglePerson(lineup, person("f"));
    expect(lineup.map((e) => e.id)).not.toContain("f");
  });
  it("never ticks someone whose heroes aren't shared", () => {
    expect(togglePerson([], person("owner", [1], false))).toEqual([]);
  });
});

describe("setPosition", () => {
  it("swaps with whoever had the position", () => {
    const lineup = [
      { id: "a", position: 1 as const },
      { id: "b", position: 2 as const },
    ];
    expect(setPosition(lineup, "a", 2)).toEqual([
      { id: "a", position: 2 },
      { id: "b", position: 1 },
    ]);
    expect(setPosition(lineup, "a", 4)).toEqual([
      { id: "a", position: 4 },
      { id: "b", position: 2 },
    ]);
  });
});

describe("cleanLineup", () => {
  const people = [person("a", [1]), person("b", [1, 3]), person("owner", [2], false)];
  it("drops people who left or can't be planned for, and fixes clashes", () => {
    expect(
      cleanLineup(
        [
          { id: "gone", position: 4 },
          { id: "a", position: 1 },
          { id: "a", position: 2 },
          { id: "b", position: 1 },
          { id: "owner", position: 2 },
        ],
        people,
      ),
    ).toEqual([
      { id: "a", position: 1 },
      { id: "b", position: 3 },
    ]);
  });
  it("is empty when nobody can be planned for any more", () => {
    expect(cleanLineup([{ id: "a", position: 1 }], [])).toEqual([]);
  });
});

describe("saved lineups", () => {
  it("are kept per account", () => {
    expect(lineupStorageKey("u1")).not.toBe(lineupStorageKey("u2"));
  });
  it("only accept the right shape", () => {
    expect(isSavedLineup({ stackId: "s", picks: [{ id: "a", position: 3 }] })).toBe(true);
    expect(isSavedLineup({ stackId: "s", picks: [{ id: "a", position: 7 }] })).toBe(false);
    expect(isSavedLineup({ picks: [] })).toBe(false);
    expect(isSavedLineup(null)).toBe(false);
  });
});
