import { describe, expect, it } from "vitest";
import type { HeroRate } from "./meta";
import { metaVerdict } from "./meta-verdict";

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
