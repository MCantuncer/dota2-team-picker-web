import { describe, expect, it } from "vitest";
import { isTeammate, SOLO_ME, soloQueuePlan, teammateId } from "./solo-queue";

describe("soloQueuePlan", () => {
  const plan = soloQueuePlan({ myPosition: 2, myHeroes: { 2: [11] }, personal: { 11: { games: 3, wins: 2 } } });

  it("puts the player at their position and a teammate at every other one", () => {
    expect(plan.members).toEqual([
      { id: SOLO_ME, position: 2 },
      { id: "teammate-1", position: 1 },
      { id: "teammate-3", position: 3 },
      { id: "teammate-4", position: 4 },
      { id: "teammate-5", position: 5 },
    ]);
    expect(plan.myPosition).toBe(2);
  });

  it("moves the teammates when the player changes position", () => {
    const moved = soloQueuePlan({ myPosition: 5, myHeroes: {}, personal: {} });
    expect(moved.members.map((m) => m.position)).toEqual([5, 1, 2, 3, 4]);
    expect(moved.members.filter((m) => m.position === 5)).toHaveLength(1);
  });

  it("gives only the player a hero pool and a record", () => {
    expect(plan.pool[SOLO_ME]).toEqual({ 2: [11] });
    for (const p of [1, 3, 4, 5] as const) expect(plan.pool[teammateId(p)]).toEqual({});
    expect(Object.keys(plan.players)).toEqual([SOLO_ME]);
  });

  it("names the player You and everyone else Teammate", () => {
    expect(plan.names[SOLO_ME]).toBe("You");
    expect(plan.names[teammateId(3)]).toBe("Teammate");
    expect(isTeammate(teammateId(3))).toBe(true);
    expect(isTeammate(SOLO_ME)).toBe(false);
  });
});
