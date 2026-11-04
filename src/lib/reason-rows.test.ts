import { describe, expect, it } from "vitest";
import { reasonRow } from "./reason-rows";

const heroes = [
  { id: 25, name: "Lina" },
  { id: 14, name: "Pudge" },
  { id: 5, name: "Crystal Maiden" },
  { id: 129, name: "Mars" },
];

describe("reasonRow", () => {
  it("names the heroes, drops the numbers from the line and sums them", () => {
    expect(reasonRow("Beats Lina (+2.2) and Pudge (+1.7, likely your lane)", heroes)).toEqual({
      kind: "Counters",
      heroIds: [25, 14],
      text: "Beats Lina and Pudge (likely your lane)",
      points: 3.9,
      warn: false,
    });
  });

  it("keeps the lane partner note beside its hero", () => {
    const row = reasonRow("Works with Crystal Maiden (+0.9, your lane partner) and Mars (+0.5)", heroes);
    expect(row).toMatchObject({
      kind: "Synergy",
      heroIds: [5, 129],
      text: "Works with Crystal Maiden (your lane partner) and Mars",
      points: 1.4,
    });
  });

  it("reads a warning as Watch Out with its negative points", () => {
    expect(reasonRow("Watch out: loses to Pudge (-0.9, likely your lane)", heroes)).toMatchObject({
      kind: "Watch Out",
      heroIds: [14],
      text: "Loses to Pudge (likely your lane)",
      points: -0.9,
      warn: true,
    });
  });

  it("takes a win rate line's points from the meta part", () => {
    const breakdown = {
      counter: 0,
      synergy: 0,
      meta: 1.7,
      positionFit: 0,
      teamNeeds: 0,
      comfort: 0,
      flex: 0,
      pickSafety: 0,
    };
    expect(reasonRow("8th best carry at Ancient: 51.7% win rate", heroes, breakdown)).toMatchObject({
      kind: "Meta",
      heroIds: [],
      points: 1.7,
    });
  });

  it("shortens a team needs line and keeps a line it does not know", () => {
    expect(reasonRow("Adds what your team lacks: wave clear (+0.7)", heroes)).toMatchObject({
      kind: "Team Needs",
      text: "Wave clear",
      points: 0.7,
    });
    expect(reasonRow("Something new", heroes)).toMatchObject({
      kind: "Draft",
      text: "Something new",
      points: null,
    });
  });
});
