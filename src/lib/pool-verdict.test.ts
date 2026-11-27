import { describe, expect, it } from "vitest";
import { poolVerdict } from "./pool-verdict";

const NAMES: Record<number, string> = { 8: "Juggernaut", 44: "Phantom Assassin", 114: "Monkey King", 74: "Invoker", 5: "Crystal Maiden" };
const name = (id: number) => NAMES[id];

describe("poolVerdict", () => {
  it("names the pool hero played most, then the next two and the roles with no heroes", () => {
    const stats = { 8: { games: 41, wins: 20 }, 44: { games: 32, wins: 13 }, 114: { games: 23, wins: 14 }, 74: { games: 9, wins: 5 }, 2: { games: 300, wins: 150 } };
    expect(poolVerdict({ 1: [44, 8, 114], 2: [74] }, stats, name)).toEqual({
      heroId: 8,
      title: "Juggernaut Leads Your Pool, 41 Games in 6 Months",
      facts: "4 heroes in 2 of 5 roles",
      line: "Phantom Assassin is next with 32 games and Monkey King with 23. Offlane, Soft Support and Hard Support have no heroes yet.",
    });
  });

  it("counts a hero on two roles once, and says when every role has a hero", () => {
    const verdict = poolVerdict({ 1: [8], 2: [8], 3: [8], 4: [5], 5: [5] }, { 8: { games: 1, wins: 1 }, 5: { games: 1, wins: 0 } }, name);
    // Level on games: the lower hero id leads, so the title does not flip between visits.
    expect(verdict.title).toBe("Crystal Maiden Leads Your Pool, 1 Game in 6 Months");
    expect(verdict.facts).toBe("2 heroes in 5 of 5 roles");
    expect(verdict.line).toBe("Juggernaut is next with 1 game. Every role has a hero.");
  });

  it("leaves out the next heroes when only one pool hero has games", () => {
    const verdict = poolVerdict({ 1: [8, 44], 2: [74], 3: [8], 5: [5] }, { 44: { games: 1200, wins: 700 } }, name);
    expect(verdict).toMatchObject({ heroId: 44, title: "Phantom Assassin Leads Your Pool, 1,200 Games in 6 Months", line: "Soft Support has no heroes yet." });
  });

  it("gives the pool's size when no pool hero has a game", () => {
    expect(poolVerdict({ 1: [8, 44], 2: [74] }, { 2: { games: 50, wins: 20 } }, name)).toEqual({
      heroId: null,
      title: "3 Heroes in Your Pool Across 2 Roles",
      facts: null,
      line: "No games on them in the last 6 months. Offlane, Soft Support and Hard Support have no heroes yet.",
    });
    // Without a games record there is nothing to say about games.
    const unknown = poolVerdict({ 1: [8] }, null, name);
    expect(unknown.title).toBe("1 Hero in Your Pool Across 1 Role");
    expect(unknown.line).toBe("Mid, Offlane, Soft Support and Hard Support have no heroes yet.");
  });

  it("says the pool is empty, also when its only heroes are unknown", () => {
    const empty = { heroId: null, title: "No Heroes in Your Pool Yet", facts: null, line: "Pick the roles you play, then your heroes for each one. Changes save right away." };
    expect(poolVerdict({}, { 8: { games: 41, wins: 20 } }, name)).toEqual(empty);
    expect(poolVerdict({ 1: [999] }, null, name)).toEqual(empty);
  });

  it("skips odd entries in the games record", () => {
    const stats = { 8: { games: "41" }, 44: null, x: { games: 9 }, 114: { games: 2.5 }, 74: { games: 3, wins: 1 } };
    expect(poolVerdict({ 1: [8, 44, 114], 2: [74] }, stats, name).title).toBe("Invoker Leads Your Pool, 3 Games in 6 Months");
  });
});
