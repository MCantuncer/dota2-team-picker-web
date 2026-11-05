import { describe, expect, it } from "vitest";
import type { DraftEntry } from "./draft";
import { isFullBoard, startedAgo, toCheckInBoard } from "./game-check-in";

const ally = (heroId: number, position: DraftEntry["position"] = null): DraftEntry => ({ heroId, kind: "ally", position });
const enemy = (heroId: number): DraftEntry => ({
  heroId,
  kind: "enemy",
  position: null,
});
const ban = (heroId: number): DraftEntry => ({
  heroId,
  kind: "ban",
  position: null,
});
const full = [
  ally(8, 1),
  ally(128, 4),
  ally(74, 2),
  ally(129),
  ally(5, 5),
  enemy(14),
  enemy(11),
  enemy(26),
  enemy(2),
  enemy(44),
  ban(1),
];

describe("isFullBoard", () => {
  it("needs five heroes on each side; bans don't count", () => {
    expect(isFullBoard(full)).toBe(true);
    expect(isFullBoard(full.slice(0, 9))).toBe(false);
    expect(isFullBoard([...full.filter((e) => e.kind !== "enemy"), ban(2), ban(3), ban(4), ban(6), ban(7)])).toBe(false);
  });
});

describe("toCheckInBoard", () => {
  it("sends a solo board with every list, unset positions as 0", () => {
    expect(
      toCheckInBoard({
        draft: full,
        key: "k",
        partyDraftId: null,
        myPosition: 2,
        myHero: 74,
        shown: [74, 1, 2, 3, 4, 5, 6, 7, 9],
        storyShown: true,
      }),
    ).toEqual({
      key: "k",
      party_draft: null,
      allies: [8, 128, 74, 129, 5],
      ally_positions: [1, 4, 2, 0, 5],
      enemies: [14, 11, 26, 2, 44],
      bans: [1],
      my_position: 2,
      my_hero: 74,
      shown: [74, 1, 2, 3, 4, 5, 6, 7],
      story_shown: true,
    });
  });

  it("sends a party board by its party draft, not a key", () => {
    const board = toCheckInBoard({
      draft: full,
      key: "k",
      partyDraftId: "d",
      myPosition: 2,
      myHero: null,
      shown: [],
      storyShown: false,
    });
    expect(board.key).toBeNull();
    expect(board.party_draft).toBe("d");
  });
});

describe("startedAgo", () => {
  const start = "2026-11-05T10:00:00Z";
  it("says how long ago the game started", () => {
    expect(startedAgo(start, Date.parse(start) + 20_000)).toBe("Started just now");
    expect(startedAgo(start, Date.parse(start) + 14 * 60_000)).toBe("Started 14 min ago");
    expect(startedAgo(start, Date.parse(start) + 75 * 60_000)).toBe("Started 1 h 15 min ago");
  });
});
