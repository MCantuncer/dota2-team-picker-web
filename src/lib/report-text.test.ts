import { describe, expect, it } from "vitest";
import fixture from "../../test/fixtures/report-facts-v1.json";
import { readFacts } from "./report-facts";
import {
  amount,
  clock,
  damageLine,
  draftLine,
  enemyBestLine,
  fightLine,
  headline,
  heroNotes,
  laneLine,
  signedAmount,
  swingLine,
} from "./report-text";

const facts = readFacts(structuredClone(fixture), 1)!; // The fixture is checked in report-facts.test.ts.
const NAMES: Record<number, string> = { 4: "Bloodseeker", 25: "Lina", 26: "Lion", 70: "Ursa", 84: "Ogre Magi", 145: "Kez" };
const name = (id: number) => NAMES[id] ?? `Hero ${id}`;

describe("report text", () => {
  it("formats times and amounts", () => {
    expect(clock(2066)).toBe("34:26");
    expect([amount(850), amount(4340), amount(4000), amount(12513)]).toEqual(["850", "4.3k", "4k", "13k"]);
    expect([signedAmount(4340), signedAmount(-850)]).toEqual(["+4.3k", "−850"]);
  });

  it("opens with the result, length and kills", () => {
    expect(headline(facts)).toBe("Won in 34:26, 57 to 32 in kills.");
  });

  it("names the biggest swings and the lanes", () => {
    expect(swingLine(facts.swings![0])).toBe("Minutes 28 to 31: 13k gold swung your way.");
    expect(swingLine({ fromMinute: 5, toMinute: 8, change: -2100 })).toBe("Minutes 5 to 8: 2.1k gold swung their way.");
    expect(laneLine(facts.lanes![2], name)).toBe("Top (Ogre Magi and Kez): 2.6k net worth ahead at 10 minutes.");
    expect(laneLine(facts.lanes![1], name)).toBe("Mid (Lina): even at 10 minutes.");
  });

  it("notes what stood out for a hero", () => {
    expect(heroNotes(facts.heroes[0])).toEqual(["Deaths cost 2.3k gold and 6:32 dead."]);
    const strong = { ...facts.heroes[0], benchmarks: { goldPerMin: 85, xpPerMin: 50, lastHitsPerMin: 50, heroDamagePerMin: 20 } };
    expect(heroNotes(strong)[0]).toBe("Farm faster than 85% of players on this hero.");
    expect(heroNotes({ ...facts.heroes[0], deathsBefore10: 4, goldLostToDeaths: 100 })).toEqual([
      "Died 4 times before 10 minutes.",
    ]);
    expect(heroNotes({ ...facts.heroes[0], abandoned: true })[0]).toBe("Left the game.");
  });

  it("describes fights, damage, the enemy and the draft", () => {
    expect(fightLine(facts.fights![0], name)).toBe("Minute 23: fight won, 4 to 0 in deaths, +4.3k gold.");
    expect(fightLine({ startMinute: 12, ourDeaths: 3, theirDeaths: 1, goldSwing: -1500, missingHeroes: [26, 70] }, name))
      .toBe("Minute 12: fight lost, 1 to 3 in deaths, −1.5k gold. Not in it: Lion and Ursa.");
    expect(facts.damageTaken!.map(damageLine)).toEqual([
      "Right-clicks: 33% of the damage you took.",
      "Blade mail: 11% of the damage you took.",
      "Bloodseeker blood bath: 7% of the damage you took.",
    ]);
    expect(enemyBestLine(facts.enemyBest!, name)).toBe("Their strongest hero: Bloodseeker, 8/8/9 with 16k net worth.");
    expect(draftLine({ heroId: 25, suggestionRank: 2, listSize: 8 }, name)).toBe("Lina: suggestion 2 of 8.");
    expect(draftLine({ heroId: 25, suggestionRank: null, listSize: 8 }, name)).toBe("Lina: not in the 8 suggestions.");
    expect(draftLine({ heroId: 25, suggestionRank: null, listSize: 0 }, name)).toBe("Lina: no suggestions saved for this pick.");
  });
});
