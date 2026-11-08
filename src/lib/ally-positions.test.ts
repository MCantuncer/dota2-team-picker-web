import { describe, expect, it } from "vitest";
import type { DraftEntry } from "@/lib/draft";
import type { PositionFit } from "@/lib/engine/positions";
import type { Position } from "@/lib/engine/types";
import { positionActions, resolveAllyPositions } from "./ally-positions";

const fits: Record<number, PositionFit> = {
  // A pure carry, a mid, an offlaner, a soft support and a hard support.
  1: { 1: 0.8, 2: 0.1, 3: 0.1, 4: 0, 5: 0 },
  2: { 1: 0.1, 2: 0.8, 3: 0.1, 4: 0, 5: 0 },
  3: { 1: 0.1, 2: 0.1, 3: 0.8, 4: 0, 5: 0 },
  4: { 1: 0, 2: 0, 3: 0, 4: 0.7, 5: 0.3 },
  5: { 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 0.7 },
  // A hero that is a mid first and a carry second.
  6: { 1: 0.4, 2: 0.6, 3: 0, 4: 0, 5: 0 },
};
const fit = (id: number) => fits[id]!;
const ally = (heroId: number, position: Position | null = null): DraftEntry => ({ heroId, kind: "ally", position });

describe("resolveAllyPositions", () => {
  it("guesses each hero's usual position", () => {
    const got = resolveAllyPositions([ally(5), ally(1), ally(3)], [2], fit);
    expect(got.map((a) => [a.position, a.isGuess])).toEqual([
      [5, true],
      [1, true],
      [3, true],
    ]);
  });

  it("keeps chosen positions and guesses around them", () => {
    const got = resolveAllyPositions([ally(2, 1), ally(6)], [3], fit);
    expect(got).toEqual([
      { heroId: 2, position: 1, isGuess: false },
      { heroId: 6, position: 2, isGuess: true },
    ]);
  });

  it("keeps the player's own position free until they pick", () => {
    const got = resolveAllyPositions([ally(6)], [2], fit);
    expect(got[0]).toEqual({ heroId: 6, position: 1, isGuess: true });
  });

  it("weighs the lineup as a whole, not hero by hero", () => {
    // Hero 6 alone would go mid, but hero 2 is a purer mid, so 6 plays carry.
    const got = resolveAllyPositions([ally(6), ally(2)], [5], fit);
    expect(got.map((a) => a.position)).toEqual([1, 2]);
  });

  it("gives the last open position when the team is full", () => {
    const got = resolveAllyPositions([ally(1, 1), ally(2, 2), ally(3, 3), ally(4, 4), ally(6)], [5], fit);
    expect(got.at(-1)).toEqual({ heroId: 6, position: 5, isGuess: true });
  });

  it("never shows two heroes in one position", () => {
    const got = resolveAllyPositions([ally(1, 2), ally(2, 2), ally(3)], [4], fit);
    expect(new Set(got.map((a) => a.position)).size).toBe(3);
    expect(got[1]!.isGuess).toBe(true);
  });
});

describe("resolveAllyPositions with several reserved positions", () => {
  it("holds every party member's position free while the team fits around them", () => {
    const got = resolveAllyPositions([ally(6)], [1, 2], fit);
    expect(got[0]!.position).toBe(3);
  });

  it("guesses again when the player changes their own position", () => {
    expect(resolveAllyPositions([ally(6)], [2], fit)[0]!.position).toBe(1);
    expect(resolveAllyPositions([ally(6)], [1], fit)[0]!.position).toBe(2);
  });

  it("fills a full team when nobody chose a position", () => {
    const got = resolveAllyPositions([ally(5), ally(4), ally(3), ally(2), ally(1)], [2], fit);
    expect(got.map((a) => a.position)).toEqual([5, 4, 3, 2, 1]);
    expect(got.every((a) => a.isGuess)).toBe(true);
  });
});

describe("positionActions", () => {
  const resolved = resolveAllyPositions([ally(1, 1), ally(2, 2), ally(5)], [4], fit);

  it("sets a free position", () => {
    expect(positionActions(resolved, 5, 3)).toEqual([{ kind: "ally", heroId: 5, position: 3 }]);
  });

  it("swaps with the hero that held the position", () => {
    expect(positionActions(resolved, 1, 2)).toEqual([
      { kind: "ally", heroId: 2, position: 1 },
      { kind: "ally", heroId: 1, position: 2 },
    ]);
  });

  it("sends the holder back to a guess when the hero had no chosen position", () => {
    expect(positionActions(resolved, 5, 1)).toEqual([
      { kind: "ally", heroId: 1, position: null },
      { kind: "ally", heroId: 5, position: 1 },
    ]);
  });

  it("frees a position for a newly typed hero", () => {
    expect(positionActions(resolved, 9, 2)).toEqual([
      { kind: "ally", heroId: 2, position: null },
      { kind: "ally", heroId: 9, position: 2 },
    ]);
  });

  it("does not move a hero that only holds the position as a guess", () => {
    expect(positionActions(resolved, 1, 5)).toEqual([{ kind: "ally", heroId: 1, position: 5 }]);
  });

  it("clears a choice", () => {
    expect(positionActions(resolved, 1, null)).toEqual([{ kind: "ally", heroId: 1, position: null }]);
  });
  it("swaps enemies the same way", () => {
    const enemies = resolveAllyPositions([{ heroId: 6, kind: "enemy", position: 2 }, { heroId: 2, kind: "enemy", position: null }], [], fit);
    // The flex hero set at mid; the other mid is guessed elsewhere, then set at mid and the flex hero is sent back to a guess.
    expect(enemies.map((e) => [e.position, e.isGuess])).toEqual([[2, false], [1, true]]);
    expect(positionActions(enemies, 2, 2, "enemy")).toEqual([
      { kind: "enemy", heroId: 6, position: null },
      { kind: "enemy", heroId: 2, position: 2 },
    ]);
  });
});
