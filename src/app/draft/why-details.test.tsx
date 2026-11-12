import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HAND_WEIGHTS } from "@/lib/engine/score";
import type { Suggestion } from "@/lib/engine/types";
import type { PairWhy, PickWhy } from "@/lib/engine/why";
import type { PickEntry } from "./my-picks";
import { PickStrip } from "./pick-strip";

const NAMES: Record<number, string> = { 74: "Invoker", 11: "Shadow Fiend", 14: "Pudge", 8: "Juggernaut", 5: "Crystal Maiden", 18: "Sven" };
const HEROES = Object.entries(NAMES).map(([id, name]) => ({ id: Number(id), name }));
const hero = (id: number) => ({ name: NAMES[id] ?? "", portrait: `https://cdn.example/${id}.png` });

const pair = (heroId: number, extra: Partial<PairWhy>): PairWhy => ({
  heroId,
  group: 4,
  seen: { games: 435, wins: 228 },
  allRanks: { games: 1389, wins: 707 },
  expected: 0.474,
  counted: 0.509,
  edge: 3.5,
  laneChance: 0,
  isPartner: false,
  weight: 1,
  hardGap: null,
  points: 3.5,
  error: 1.1,
  ...extra,
});

const why: PickWhy = {
  counters: [pair(11, { laneChance: 0.9, weight: 1.45, edge: 1.1, points: 1.6 }), pair(14, { edge: 0.7, points: 0.7, seen: { games: 812, wins: 420 } })],
  synergy: [pair(8, { isPartner: true, weight: 1.5, edge: 0.2, points: 0.3 }), pair(5, { edge: -0.5, points: -0.5 })],
  meta: { seen: { games: 15558, wins: 7732 }, bracket: 7, rate: 0.497, place: 30, points: -0.3 },
  roleFit: { position: 2, share: 0.81, isMeasured: true, zeroAt: 0.3, fullAt: 0.6, maxPoints: 3, points: 3 },
  teamNeeds: {
    needs: [
      { need: "disable", isCovered: true },
      { need: "initiation", isCovered: true },
      { need: "save", isCovered: false },
      { need: "durable", isCovered: false },
    ],
    allies: 2,
    each: 0.72,
    points: 1.44,
  },
  comfort: { favorite: 1.5, top: 0.5, record: { games: 31, wins: 19, counted: 0.576, points: 3.8 }, points: 5.8 },
  flex: { positions: [{ position: 2, share: 0.81 }], picksSoFar: 4, points: 0 },
  pickSafety: { risk: -0.7, threats: [18], banned: [], banLift: 0, phase: null, gambles: [{ heroId: 8, gap: 6.7, chance: 0.045, points: -0.3 }], points: -1 },
  weights: HAND_WEIGHTS,
};

const invoker: Suggestion = {
  heroId: 74,
  name: "Invoker",
  score: 13.3,
  error: 0.8,
  breakdown: { positionFit: 3, counter: 2.3, synergy: -0.2, meta: -0.3, teamNeeds: 1.4, comfort: 5.8, flex: 0, pickSafety: -1 },
  counterBy: [],
  synergyBy: [],
  record: null,
  reasons: ["Beats Shadow Fiend (+1.6, likely your lane) and Pudge (+0.7)"],
  summary: "",
  place: { rank: 1, of: 49 },
  tags: ["Favorite (+1.5)"],
  hardCounters: [{ counterId: 8, gap: 6.7, status: "open", text: "Gamble: Juggernaut still available" }],
  why,
};

const picks: PickEntry[] = [{ suggestion: invoker, gain: null }];

function strip() {
  render(
    <PickStrip
      head={<h2>Picks for Mid</h2>}
      picks={picks}
      reacting="Reacting to Pudge and Shadow Fiend."
      position={2}
      hero={hero}
      heroes={HEROES}
      enemies={[11, 14]}
    />,
  );
  return screen.getByRole("article", { name: "Invoker" });
}

describe("Why details on the open pick card", () => {
  it("opens a Why line's numbers right under it: the track, the games, the sum and where its points go", async () => {
    const card = strip();
    const line = within(card).getByRole("button", { name: /against Shadow Fiend/ });
    expect(line).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(line);
    expect(line).toHaveAttribute("aria-expanded", "true");
    const open = document.getElementById(line.getAttribute("aria-controls")!)!;
    expect(within(open).getByRole("img", { name: "Expected 47.4%, counted 50.9%, seen 52.4%" })).toBeInTheDocument();
    expect(open).toHaveTextContent("435 Games at Divine and Immortal");
    expect(open).toHaveTextContent("1,389 at All Ranks");
    const sum = within(open).getByRole("group", { name: "How the points are made" });
    expect(sum).toHaveTextContent("+1.1Edge");
    expect(sum).toHaveTextContent("1.45Your Lane");
    expect(sum).toHaveTextContent("+1.6Points");
    expect(open).toHaveTextContent("Counters +2.3");
    expect(open).toHaveTextContent("Score +13.3");
  });

  it("keeps one line open at a time, and the same line again closes it", async () => {
    const card = strip();
    const fiend = within(card).getByRole("button", { name: /against Shadow Fiend/ });
    const pudge = within(card).getByRole("button", { name: /against Pudge/ });
    await userEvent.click(fiend);
    await userEvent.click(pudge);
    expect(fiend).toHaveAttribute("aria-expanded", "false");
    expect(pudge).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(pudge.getAttribute("aria-controls")!)).toHaveTextContent("812 Games");
    await userEvent.click(pudge);
    expect(pudge).toHaveAttribute("aria-expanded", "false");
    expect(within(card).queryByRole("group", { name: "How the points are made" })).toBeNull();
  });

  it("shows a hard counter still open as its cost if picked times its chance", async () => {
    const card = strip();
    const line = within(card).getByRole("button", { name: /if they pick Juggernaut/ });
    await userEvent.click(line);
    const sum = within(card).getByRole("group", { name: "How the points are made" });
    expect(sum).toHaveTextContent("−6.7If Picked");
    expect(sum).toHaveTextContent("5%Chance");
    expect(sum).toHaveTextContent("−0.3Points");
    expect(card).toHaveTextContent("Pick Safety −1.0");
  });

  it("opens a Score Parts row as every hero its part adds up from, biggest first", async () => {
    const card = strip();
    await userEvent.click(within(card).getByRole("button", { name: "Counters +2.3: Show Why" }));
    const row = within(card).getByRole("button", { name: "Counters +2.3: Show Why" });
    const open = document.getElementById(row.getAttribute("aria-controls")!)!;
    const items = within(open).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Shadow Fiend+1.6", "Pudge+0.7"]);
    expect(open).toHaveTextContent("Score +13.3");
  });

  it("opens Team Needs as tiles, covered and open, with the sum", async () => {
    const card = strip();
    await userEvent.click(within(card).getByRole("button", { name: "Team Needs +1.4: Show Why" }));
    const row = within(card).getByRole("button", { name: "Team Needs +1.4: Show Why" });
    const open = document.getElementById(row.getAttribute("aria-controls")!)!;
    expect(within(open).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Stun", "Initiator", "Save", "Frontliner"]);
    expect(within(open).getByRole("group", { name: "How the points are made" })).toHaveTextContent("2Needs×+0.7Each=+1.4Points");
    expect(open).toHaveTextContent("2 of 5 Picked");
  });
});
