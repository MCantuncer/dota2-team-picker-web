import { describe, expect, it } from "vitest";
import { listsText, readCheck, readSlips } from "@/lib/admin-pool-check";

describe("readCheck", () => {
  const row = { lists: 9, pool_lists: 7, slips: 1, any_lists: 2, unknown_lists: 0, players: 4 };

  it("reads the one row", () => {
    expect(readCheck([row])).toEqual({ lists: 9, poolLists: 7, slips: 1, anyLists: 2, unknownLists: 0, players: 4 });
  });

  it("returns null for anything else, so the page shows an error instead of wrong numbers", () => {
    expect(readCheck([])).toBeNull();
    expect(readCheck(null)).toBeNull();
    expect(readCheck([{ ...row, slips: null }])).toBeNull();
    expect(readCheck([{ ...row, lists: -1 }])).toBeNull();
    expect(readCheck([{ ...row, players: 1.5 }])).toBeNull();
  });
});

describe("readSlips", () => {
  it("names a player without a display name", () => {
    const [slip] = readSlips([
      { draft_id: "d", user_id: "u", display_name: null, position: 5, heroes: [74, 5], outside: [74], updated_at: "2026-11-08T10:00:00Z" },
    ]);
    expect(slip).toEqual({ draftId: "d", userId: "u", name: "Player", position: 5, heroes: [74, 5], outside: [74], at: "2026-11-08T10:00:00Z" });
  });
});

it("counts lists", () => {
  expect(listsText(1)).toBe("1 list");
  expect(listsText(0)).toBe("0 lists");
});
