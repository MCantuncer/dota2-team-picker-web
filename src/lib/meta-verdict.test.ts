import { describe, expect, it } from "vitest";
import type { HeroRate } from "./meta";
import { glanceTitle, metaVerdict, moversTitle, newItemsTitle, roleItemsTitle } from "./meta-verdict";

const rate = (id: number, win: number, baseWin: number | null, games = 50_000): HeroRate => ({
  id,
  games,
  pick: 5,
  win,
  basePick: baseWin === null ? null : 5,
  baseWin,
  days: [],
  roles: [2],
});

const NAMES: Record<number, string> = { 1: "Meepo", 2: "Phantom Assassin", 3: "Monkey King", 4: "Wraith King" };
const name = (id: number) => NAMES[id] ?? `Hero ${id}`;

describe("metaVerdict", () => {
  const meepo = rate(1, 57.04, 54.3, 92_858);
  const pa = rate(2, 52.7, 51.2);
  const mk = rate(3, 51.2, 45.7);

  it("names the role leader with the highest win rate across the roles", () => {
    const v = metaVerdict(
      [
        { role: 1, rate: pa },
        { role: 2, rate: meepo },
      ],
      [meepo, pa, mk],
      name,
      "7.41",
    );
    expect(v).toEqual({
      heroId: 1,
      title: "Meepo Leads Mid at 57.0%",
      line: "The highest win rate of the two role leaders: up 2.7 points since 7.41 over 92,858 games. Monkey King gained the most, 5.5 points to 51.2%.",
    });
  });

  it("names the one leader on a role, and says what leading means there", () => {
    const v = metaVerdict([{ role: 1, rate: pa }], [pa], name, "7.41");
    expect(v?.title).toBe("Phantom Assassin Leads Carry at 52.7%");
    expect(v?.line).toBe("The most wins above even in the role: up 1.5 points since 7.41 over 50,000 games.");
  });

  it("says down, level, or nothing when the hero has no numbers from the patch before", () => {
    const line = (r: HeroRate, old: string | null = "7.41") => metaVerdict([{ role: 3, rate: r }], [], name, old)?.line;
    expect(line(rate(4, 54.8, 55.0))).toBe("The most wins above even in the role: down 0.2 points since 7.41 over 50,000 games.");
    expect(line(rate(4, 54.8, 54.82))).toBe("The most wins above even in the role: level with 7.41 over 50,000 games.");
    expect(line(rate(4, 54.8, null))).toBe("The most wins above even in the role, over 50,000 games.");
    expect(line(rate(4, 54.8, 53.8), null)).toBe("The most wins above even in the role: up 1.0 points since the patch before over 50,000 games.");
  });

  it("does not name the leader a second time as the biggest riser", () => {
    const v = metaVerdict([{ role: 2, rate: meepo }], [meepo, rate(2, 50, 49.9)], name, "7.41");
    expect(v?.line).toBe("The most wins above even in the role: up 2.7 points since 7.41 over 92,858 games.");
  });

  it("has nothing to say before any role has a leader", () => {
    expect(metaVerdict([], [meepo], name, "7.41")).toBeNull();
  });
});

describe("glanceTitle", () => {
  const up = (id: number) => rate(id, 53, 51);
  const down = (id: number) => rate(id, 51, 53);

  it("counts the role leaders that win more than in the patch before", () => {
    expect(glanceTitle([up(1), up(2), down(3), up(4), up(5)], "7.41")).toBe("Four of Five Role Leaders Gained Since 7.41");
    expect(glanceTitle([up(1), up(2), up(3), up(4), up(5)], "7.41")).toBe("All Five Role Leaders Gained Since 7.41");
    expect(glanceTitle([down(1), down(2), down(3), down(4), down(5)], null)).toBe("No Role Leader Gained Since the Patch Before");
    expect(glanceTitle([up(1), up(2)], "7.41")).toBe("Both Role Leaders Gained Since 7.41");
  });

  it("does not count a change that shows as 0.0", () => {
    expect(glanceTitle([rate(1, 51.03, 51), up(2), up(3)], "7.41")).toBe("Two of Three Role Leaders Gained Since 7.41");
  });

  it("gives no finding when a leader cannot be compared", () => {
    expect(glanceTitle([up(1), rate(2, 53, null)], "7.41")).toBeNull();
    expect(glanceTitle([up(1)], "7.41")).toBeNull();
  });
});

describe("moversTitle", () => {
  const mk = rate(3, 51.2, 45.7);
  const od = rate(5, 47.2, 53.3);
  const picked = (id: number, pick: number, basePick: number): HeroRate => ({ ...rate(id, 50, 50), pick, basePick });

  it("names the biggest riser and faller with their win rate points", () => {
    expect(moversTitle(mk, od, "win", name)).toBe("Monkey King Is Up 5.5 Points, Hero 5 Down 6.1");
    expect(moversTitle(mk, undefined, "win", name)).toBe("Monkey King Is Up 5.5 Points");
    expect(moversTitle(undefined, od, "win", name)).toBe("Hero 5 Is Down 6.1 Points");
  });

  it("says picked for pick rate", () => {
    expect(moversTitle(picked(1, 9.4, 6.2), picked(4, 3, 5.5), "pick", name)).toBe("Meepo Is Picked 3.2 Points More, Wraith King 2.5 Less");
    expect(moversTitle(undefined, picked(4, 3, 5.5), "pick", name)).toBe("Wraith King Is Picked 2.5 Points Less");
  });

  it("gives no finding when nothing moved", () => {
    expect(moversTitle(undefined, undefined, "win", name)).toBeNull();
  });
});

describe("newItemsTitle", () => {
  it("says how many times as often the first item is built as the next", () => {
    const items = [
      { name: "Sabatons of Mordiggian", games: 483 },
      { name: "Bloodslinger", games: 1481 },
      { name: "Caduceus", games: 269 },
    ];
    expect(newItemsTitle(items)).toBe("Bloodslinger Is Built Three Times as Often as Any Other New Item");
    expect(newItemsTitle([items[1]!, { name: "Caduceus", games: 700 }])).toBe("Bloodslinger Is Built Twice as Often as Any Other New Item");
    expect(newItemsTitle([items[1]!, { name: "Caduceus", games: 1000 }])).toBe("Bloodslinger Is the Most Built New Item");
  });

  it("gives no finding for one item, no games or a tie", () => {
    expect(newItemsTitle([{ name: "Bloodslinger", games: 10 }])).toBeNull();
    expect(newItemsTitle([{ name: "Bloodslinger", games: 0 }, { name: "Caduceus", games: 0 }])).toBeNull();
    expect(newItemsTitle([{ name: "Bloodslinger", games: 10 }, { name: "Caduceus", games: 10 }])).toBeNull();
  });
});

describe("roleItemsTitle", () => {
  it("names the item that ends the most of the role's games", () => {
    expect(roleItemsTitle({ name: "Battle Fury", share: 41.4 }, 1)).toBe("41% of Carry Games End with Battle Fury");
    expect(roleItemsTitle(undefined, 1)).toBeNull();
  });
});
