import { describe, expect, it } from "vitest";
import type { PickLine } from "./pick-lines";
import { itemOfLine, partOfLine, partsInOrder, signed, spreadLabels, trackScale } from "./why-details";

const line = (kind: PickLine["kind"], text: string, heroes: number[] = [], isWarn = false): PickLine => ({ kind, lead: "+1.0", text, heroes, isWarn });
const enemies = new Set([11, 14]);

describe("partOfLine", () => {
  it("finds the score part a Why line is about", () => {
    expect(partOfLine(line("counter", "against Shadow Fiend (likely your lane)", [11]), enemies)).toBe("counter");
    expect(partOfLine(line("synergy", "with Juggernaut", [8]), enemies)).toBe("synergy");
    expect(partOfLine(line("need", "adds what your team lacks: a stun"), enemies)).toBe("teamNeeds");
    expect(partOfLine(line("comfort", "one of your heroes for this position"), enemies)).toBe("comfort");
    expect(partOfLine(line("phase", "safe to pick early"), enemies)).toBe("pickSafety");
    expect(partOfLine(line("winRate", "win rate at Divine"), enemies)).toBe("meta");
    expect(partOfLine(line("winRate", "rarely played in this position"), enemies)).toBe("positionFit");
    expect(partOfLine(line("other", "something else"), enemies)).toBeNull();
  });

  it("puts a risk where its points are: a lost matchup in Counters, a hard counter by where it stands", () => {
    expect(partOfLine(line("risk", "against Pudge", [14], true), enemies)).toBe("counter");
    expect(partOfLine(line("risk", "against Pudge, a hard counter on the enemy team", [14], true), enemies)).toBe("counter");
    expect(partOfLine(line("risk", "if they pick Riki, a hard counter still open", [32], true), enemies)).toBe("pickSafety");
    expect(partOfLine(line("risk", "win rate at Divine, low right now", [], true), enemies)).toBe("meta");
    expect(partOfLine(line("risk", "easy to punish: Sven and Legion Commander can still be picked", [18, 104], true), enemies)).toBe("pickSafety");
  });
});

describe("itemOfLine", () => {
  it("names the comfort tag or pick safety cause a line is about", () => {
    expect(itemOfLine(line("comfort", "one of your heroes for this position"), "comfort")).toBe("favorite");
    expect(itemOfLine(line("comfort", "in your Top 5 for this position"), "comfort")).toBe("top");
    expect(itemOfLine(line("comfort", "your record on this hero (19-12)"), "comfort")).toBe("record");
    expect(itemOfLine(line("phase", "safe to pick early"), "pickSafety")).toBe("phase");
    expect(itemOfLine(line("risk", "if they pick Riki, a hard counter still open", [32], true), "pickSafety")).toBe("gamble");
    expect(itemOfLine(line("risk", "easy to punish: Sven", [18], true), "pickSafety")).toBe("risk");
    expect(itemOfLine(line("counter", "against Pudge", [14]), "counter")).toBeNull();
  });
});

describe("partsInOrder", () => {
  it("lists the parts with a number, biggest first, keeping one named part at 0", () => {
    const b = { positionFit: 3, counter: 7.1, synergy: 0.9, meta: -0.3, teamNeeds: 1.4, comfort: 5.8, flex: 0, pickSafety: -1 };
    expect(partsInOrder(b)).toEqual(["counter", "comfort", "positionFit", "teamNeeds", "pickSafety", "synergy", "meta"]);
    expect(partsInOrder(b, "flex")).toContain("flex");
  });
});

describe("trackScale", () => {
  it("covers every value and 50% in whole 5% steps, at least 10% wide", () => {
    expect(trackScale([0.474, 0.509, 0.524])).toEqual({ lo: 45, hi: 55 });
    expect(trackScale([0.3, 0.7])).toEqual({ lo: 25, hi: 75 });
    expect(trackScale([0.5, Number.NaN])).toEqual({ lo: 45, hi: 55 });
  });
});

describe("spreadLabels", () => {
  it("keeps labels apart and inside the track, in the markers' order", () => {
    expect(spreadLabels([20, 70], 24)).toEqual([20, 70]);
    expect(spreadLabels([40, 45], 24)).toEqual([40, 64]);
    expect(spreadLabels([95, 98], 24)).toEqual([76, 100]);
    expect(spreadLabels([80, 10], 24)).toEqual([80, 10]);
    expect(spreadLabels([1, 2], 24)).toEqual([1, 25]);
  });
});

describe("signed", () => {
  it("writes a sign and one decimal, with a real minus", () => {
    expect(signed(5.25)).toBe("+5.3");
    expect(signed(-0.3)).toBe("−0.3");
  });
});
