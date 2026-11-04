import { describe, expect, it } from "vitest";
import { averageRankTier, mainPosition, toSeats } from "./stack-seats";

const person = (id: string, role = "player", rank: number | null = null) => ({
  user_id: id,
  display_name: id,
  avatar_url: null,
  role,
  rank_tier: rank,
});

describe("mainPosition", () => {
  it("picks the position with the most heroes, the lower one on a tie", () => {
    expect(mainPosition([2, 3], { 2: [74, 13], 3: [129] })).toBe(2);
    expect(mainPosition([3, 2], { 2: [74], 3: [129] })).toBe(2);
    expect(mainPosition([4, 5], { 5: [5, 26] })).toBe(5);
    expect(mainPosition([], {})).toBeNull();
  });
});

describe("toSeats", () => {
  it("orders players by main position and keeps hidden pools empty", () => {
    const seats = toSeats(
      [person("can", "owner"), person("deniz", "co_captain"), person("new"), person("mert")],
      [
        {
          user_id: "can",
          positions: [2, 3],
          favorites: { "2": [74, 13], "3": [129] },
        },
        { user_id: "deniz", positions: [1], favorites: { "1": [8, 44] } },
        { user_id: "mert", positions: [5], favorites: { "5": [5], bad: [1] } },
      ],
      () => null,
    );
    expect(seats.map((s) => [s.id, s.position, s.heroes])).toEqual([
      ["deniz", 1, [8, 44]],
      ["can", 2, [74, 13]],
      ["mert", 5, [5]],
      ["new", null, []],
    ]);
    expect(seats[1].positions).toEqual([2, 3]);
    expect(seats[1].role).toBe("owner");
    expect(seats[3].shared).toBe(false);
  });

  it("gives an owner who also has a member row one seat, as the owner", () => {
    const seats = toSeats([person("can", "owner"), person("deniz"), person("can")], [], () => null);
    expect(seats.map((s) => [s.id, s.role])).toEqual([
      ["can", "owner"],
      ["deniz", "player"],
    ]);
  });
});

describe("averageRankTier", () => {
  it("averages medals and stars as one ladder", () => {
    expect(averageRankTier([75, 74, 73, 72, 71])).toBe(73);
    expect(averageRankTier([75, 80])).toBe(80);
    expect(averageRankTier([55, 61])).toBe(61);
    expect(averageRankTier([52, null])).toBe(52);
    expect(averageRankTier([null, 0])).toBeNull();
  });
});
