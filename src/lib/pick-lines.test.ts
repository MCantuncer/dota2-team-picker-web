import { describe, expect, it } from "vitest";
import type { ScoreBreakdown } from "@/lib/engine/types";
import { namedHeroes, reasonLines, scoreParts, scoreSplit, verdictLine } from "./pick-lines";

const HEROES = [
  { id: 74, name: "Invoker" },
  { id: 106, name: "Ember Spirit" },
  { id: 11, name: "Shadow Fiend" },
  { id: 14, name: "Pudge" },
  { id: 8, name: "Juggernaut" },
  { id: 93, name: "Slark" },
  { id: 35, name: "Sniper" },
  { id: 18, name: "Sven" },
  { id: 53, name: "Nature's Prophet" },
  { id: 27, name: "Shadow Shaman" },
];

const none = { reasons: [], tags: [], hardCounters: [] };

describe("namedHeroes", () => {
  it("finds every hero a text names, in order, longest name first", () => {
    expect(namedHeroes("Easy to punish: Sniper and Sven can still be picked", HEROES)).toEqual([35, 18]);
    expect(namedHeroes("Works with Shadow Shaman and Nature's Prophet", HEROES)).toEqual([27, 53]);
    expect(namedHeroes("adds what your team lacks: a stun", HEROES)).toEqual([]);
  });
});

describe("reasonLines", () => {
  it("splits a counter line into one line per hero, number first, with its note", () => {
    const lines = reasonLines({ ...none, reasons: ["Beats Shadow Fiend (+1.6, likely your lane) and Pudge (+0.7)"] }, HEROES);
    expect(lines).toEqual([
      { kind: "counter", lead: "+1.6", text: "against Shadow Fiend (likely your lane)", heroes: [11], isWarn: false },
      { kind: "counter", lead: "+0.7", text: "against Pudge", heroes: [14], isWarn: false },
    ]);
  });

  it("puts the win rate first and the place after it", () => {
    const [best] = reasonLines({ ...none, reasons: ["7th best mid at Divine: 51.8% win rate"] }, HEROES);
    expect(best).toMatchObject({ kind: "winRate", lead: "51.8%", text: "win rate at Divine, 7th best mid" });
    const [top] = reasonLines({ ...none, reasons: ["Best mid: 53.0% win rate"] }, HEROES);
    expect(top).toMatchObject({ lead: "53.0%", text: "win rate, best mid" });
    const [low] = reasonLines({ ...none, reasons: ["Watch out: low win rate right now: 47.5% at Divine"] }, HEROES);
    expect(low).toMatchObject({ lead: "47.5%", text: "win rate at Divine, low right now", isWarn: true });
  });

  it("leads any other line with its points and keeps the heroes it names", () => {
    const lines = reasonLines(
      {
        ...none,
        reasons: [
          "Adds what your team lacks: a stun and an initiator (+1.4)",
          "Watch out: easy to punish: Sniper and Sven can still be picked (-0.5)",
        ],
      },
      HEROES,
    );
    expect(lines[0]).toEqual({ kind: "need", lead: "+1.4", text: "adds what your team lacks: a stun and an initiator", heroes: [], isWarn: false });
    expect(lines[1]).toEqual({ kind: "risk", lead: "-0.5", text: "easy to punish: Sniper and Sven can still be picked", heroes: [35, 18], isWarn: true });
  });

  it("turns tags into lines and hard counters into risks, risks last", () => {
    const lines = reasonLines(
      {
        reasons: ["Watch out: loses to Shadow Fiend (-2.5, likely your lane)"],
        tags: ["Favorite (+1.5)", "Top 5 (+0.5)", "Your record 12-8 (+0.9)"],
        hardCounters: [
          { counterId: 93, gap: 6.7, status: "open", text: "Gamble: Slark still available" },
          { counterId: 14, gap: 2, status: "enemy", text: "Hard countered: Pudge is on the enemy team" },
          { counterId: 8, gap: 1.1, status: "out", text: "Juggernaut is out, safe to pick" },
        ],
      },
      HEROES,
    );
    expect(lines.map((l) => [l.lead, l.text, l.isWarn])).toEqual([
      ["+1.5", "one of your heroes for this position", false],
      ["+0.5", "in your Top 5 for this position", false],
      ["+0.9", "your record on this hero (12-8)", false],
      ["", "Juggernaut is out, safe to pick", false],
      ["-2.5", "against Shadow Fiend (likely your lane)", true],
      ["-6.7", "if they pick Slark, a hard counter still open", true],
      ["-2.0", "with Pudge on their team, a hard counter", true],
    ]);
  });

  it("names a teammate's pool by their name", () => {
    const [line] = reasonLines({ ...none, tags: ["Favorite (+1.5)"] }, HEROES, "Emre");
    expect(line!.text).toBe("one of Emre's heroes for this position");
  });
});

describe("verdictLine", () => {
  it("leads with the points and names the list's first under it", () => {
    const behind = { heroId: 106, kind: "behind" as const, text: "5.8 points behind: 2.9 worse against Shadow Fiend.", note: null };
    expect(verdictLine(behind, "Invoker", HEROES)).toEqual({
      lead: "5.8 points",
      text: "behind Invoker: 2.9 worse against Shadow Fiend",
      heroes: [74, 11],
    });
    const clear = {
      heroId: 74,
      kind: "clear" as const,
      text: "5.8 points ahead of Ember Spirit, more than the 2.9 the data could be off by.",
      note: null,
    };
    expect(verdictLine(clear, undefined, HEROES)).toMatchObject({ lead: "5.8 points", heroes: [106] });
    const level = { heroId: 106, kind: "behind" as const, text: "Level with Invoker.", note: null };
    expect(verdictLine(level, "Invoker", HEROES)).toEqual({ lead: "", text: "Level with Invoker", heroes: [74] });
  });
});

describe("score parts", () => {
  const b: ScoreBreakdown = { positionFit: 3, counter: 2.3, synergy: -0.2, meta: 1.8, teamNeeds: 0.7, comfort: 1.5, flex: 0.02, pickSafety: 0.7 };

  it("splits the score into this draft and meta, role and comfort", () => {
    const split = scoreSplit(b);
    expect(split.draft).toBeCloseTo(3.5);
    expect(split.base).toBeCloseTo(6.32);
  });

  it("keeps the parts worth a bar, biggest first, negative ones too", () => {
    expect(scoreParts(b).map((p) => [p.name, p.value])).toEqual([
      ["Role Fit", 3],
      ["Counters", 2.3],
      ["Meta", 1.8],
      ["Comfort", 1.5],
      ["Team Needs", 0.7],
      ["Pick Safety", 0.7],
      ["Synergy", -0.2],
    ]);
  });
});
