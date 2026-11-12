import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import { WhoHurtsYou } from "./who-hurts-you";

const bkb = { itemId: 116, name: "Black King Bar", img: "/items/116.png", minute: 20 };
const player: PlayerPlan = {
  heroId: 1,
  position: 1,
  job: "Farm.",
  fallbacks: [],
  enemies: [
    { heroId: 26, inLane: false, laneSure: true, threat: "Locks you down", kind: "disable", answers: [116], spell: { key: "lion_voodoo", name: "Hex", line: "Turns you into a frog", kind: "magic" } },
    { heroId: 33, inLane: true, laneSure: true, threat: "Locks you down", kind: "disable", answers: [116], spell: { key: "enigma_black_hole", name: "Black Hole", line: "Pulls and stuns", kind: "magic" } },
    { heroId: 5, inLane: false, laneSure: false, threat: "Locks you down", kind: "disable", answers: [116] },
    { heroId: 12, inLane: false, laneSure: true, threat: "Illusions split your damage", kind: "illusions", answers: [], tip: "Hit the real hero" },
  ],
  threatRows: [
    {
      enemies: [
        { heroId: 33, inLane: true, laneSure: true, threat: "Locks you down", kind: "disable" },
        { heroId: 26, inLane: false, laneSure: true, threat: "Locks you down", kind: "disable" },
        { heroId: 5, inLane: false, laneSure: false, threat: "Locks you down", kind: "disable" },
      ],
      answer: 116,
    },
    { enemies: [{ heroId: 12, inLane: false, laneSure: true, threat: "Illusions split your damage", kind: "illusions" }], tip: "Hit the real hero" },
  ],
  build: { timings: "rank", start: [], lane: [], core: [bkb], situational: [] },
};

describe("WhoHurtsYou", () => {
  it("says one answer once for every enemy it stops, naming each spell and the threat kind", () => {
    render(<WhoHurtsYou player={player} heroName={(id) => `Hero ${id}`} icons={{}} />);
    const [three, one] = within(screen.getByRole("region", { name: "Who Hurts You" })).getAllByRole("listitem", { name: undefined }).filter((li) => li.parentElement?.parentElement?.tagName === "SECTION");
    expect(within(three!).getByText("Black Hole, Hex")).toBeInTheDocument();
    expect(within(three!).getByText("Hero 33, Hero 26, Hero 5 · Lockdown")).toBeInTheDocument();
    expect(within(three!).getByText("In Your Lane")).toBeInTheDocument();
    expect(within(three!).getByText("Black King Bar")).toBeInTheDocument();
    expect(within(one!).getByText("Hero 12 · Illusions")).toBeInTheDocument();
    expect(within(one!).getByText("Hit the real hero.")).toBeInTheDocument();
  });

  it("shows nothing without threats", () => {
    const { container } = render(<WhoHurtsYou player={{ ...player, threatRows: [] }} heroName={(id) => `Hero ${id}`} icons={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
