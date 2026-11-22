import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LanePlan } from "@/lib/engine/game-plan";
import type { Story } from "@/lib/engine/story";
import { ChapterCards, comboSpell } from "./chapter-cards";

// Juggernaut 8, Crystal Maiden 5, Puck 13, Mars 129, Snapfire 128 against Axe 2, Shadow Fiend 11, Phantom Lancer 12.
const NAMES: Record<number, string> = { 8: "Juggernaut", 5: "Crystal Maiden", 13: "Puck", 129: "Mars", 128: "Snapfire", 2: "Axe", 11: "Shadow Fiend", 12: "Phantom Lancer" };
const heroName = (id: number) => NAMES[id] ?? `Hero ${id}`;
const icons = Object.fromEntries(Object.keys(NAMES).map((id) => [Number(id), `/heroes/${id}.png`]));

const lanes: LanePlan[] = [
  { name: "Safe lane", ours: [8, 5], theirs: [2], edge: 1, verdict: "win", text: "", keyPair: { hero: 5, enemy: 2, games: 18079, won: 7593, drawn: 4339, lost: 6147 } },
  { name: "Mid", ours: [13], theirs: [11], edge: -2, verdict: "hard", text: "", keyPair: { hero: 13, enemy: 11, games: 1320, won: 251, drawn: 343, lost: 726, allRanks: true } },
  { name: "Off lane", ours: [129, 128], theirs: [12], edge: 0, verdict: "even", text: "" },
];
const jugg = { hero: "Juggernaut", item: "Battle Fury", minute: 15 };
const mars = { hero: "Mars", item: "Blink Dagger", minute: 15 };
const puck = { hero: "Puck", item: "Blink Dagger", minute: 19 };
const story: Story = {
  headline: "Fight from 15 min, before Phantom Lancer has Manta Style at 19.",
  ready: 15,
  race: { ready: 15, theirs: { hero: "Phantom Lancer", item: "Manta Style", minute: 19 } },
  combo: { heroes: ["Mars", "Snapfire"], text: "Arena of Blood with Mortimer Kisses inside" },
  roshan: { minute: 20, spikes: [jugg, mars, puck] },
  chapters: [
    { phase: "0 to 10 min", from: 0, to: 10, ours: [], theirs: [], action: "Juggernaut and Crystal Maiden win the safe lane.", focus: "lanes", text: "" },
    { phase: "10 to 20 min", from: 10, to: 20, ours: [jugg, mars, puck], theirs: [], action: "Open fights with Arena of Blood with Mortimer Kisses inside.", focus: "combo", text: "" },
    { phase: "20 to 30 min", from: 20, to: 30, ours: [], theirs: [], action: "Roshan at 20 min or later, with three key items in.", focus: "roshan", text: "" },
  ],
};
const abilities = {
  129: { abilities: [{ id: 1, key: "mars_spear", name: "Spear of Mars", slot: 1, maxLevel: 4, ultimate: false }, { id: 2, key: "mars_arena_of_blood", name: "Arena Of Blood", slot: 6, maxLevel: 3, ultimate: true }], talents: [] },
  128: { abilities: [{ id: 3, key: "snapfire_mortimer_kisses", name: "Mortimer Kisses", slot: 6, maxLevel: 3, ultimate: true }], talents: [] },
};

describe("ChapterCards", () => {
  it("draws one card per chapter: every lane with its real lane results, the combo and the fight window, and Roshan", () => {
    render(<ChapterCards story={story} lanes={lanes} heroName={heroName} icons={icons} abilities={abilities} />);
    const cards = within(screen.getByRole("list", { name: "Chapters" })).getAllByRole("article");
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual(["Lanes, 0 to 10 min", "First Fight, 10 to 20 min", "Roshan, 20 to 30 min"]);

    const [laneCard, fight, roshan] = cards as [HTMLElement, HTMLElement, HTMLElement];
    expect(within(laneCard).getByText("Won")).toBeInTheDocument();
    expect(within(laneCard).getByText("42% won")).toBeInTheDocument();
    expect(within(laneCard).getByText("34% lost")).toBeInTheDocument();
    expect(laneCard).toHaveTextContent("18,079 lanes, Crystal Maiden against Axe");
    expect(laneCard).toHaveTextContent("1,320 lanes, Puck against Shadow Fiend, all ranks");
    // A lane with no lane results says so instead of a bar.
    expect(within(laneCard).getByText("No lane results for these heroes yet")).toBeInTheDocument();

    expect(fight).toHaveTextContent("Arena of Blood with Mortimer Kisses inside");
    expect(fight).toHaveTextContent("Your team is ready at 15. Phantom Lancer's Manta Style comes at 19.");
    expect(fight.innerHTML).toContain("mars_arena_of_blood");
    expect(fight.innerHTML).toContain("snapfire_mortimer_kisses");

    expect(roshan).toHaveTextContent("20 Min or Later");
    expect(roshan).toHaveTextContent("Three key items done by 19");
    expect(within(roshan).getAllByRole("listitem")).toHaveLength(3);
  });

  it("keeps a chapter's short line when it has nothing more to draw, and says when we must hold", () => {
    const hold: Story = {
      ...story,
      race: { ready: 17, theirs: { hero: "Phantom Lancer", item: "Manta Style", minute: 14 } },
      combo: undefined,
      roshan: undefined,
      chapters: [{ phase: "10 to 20 min", from: 10, to: 20, ours: [], theirs: [], action: "Take towers before their Manta Style.", text: "" }],
    };
    render(<ChapterCards story={hold} lanes={lanes} heroName={heroName} icons={icons} />);
    const card = screen.getByRole("article", { name: "Mid Game, 10 to 20 min" });
    expect(card).toHaveTextContent("Take towers before their Manta Style.");
    expect(card).toHaveTextContent("Phantom Lancer's Manta Style comes at 14. Your team is ready at 17.");
  });
});

describe("comboSpell", () => {
  it("finds the spell the combo names, the longest name first", () => {
    const spells = [{ key: "a", name: "Wave" }, { key: "b", name: "Sonic Wave" }];
    expect(comboSpell("Black Hole into Sonic Wave", spells)?.key).toBe("b");
    expect(comboSpell("Black Hole into Sonic Wave", [{ key: "c", name: "Shadow Strike" }])).toBeUndefined();
    expect(comboSpell("Black Hole", undefined)).toBeUndefined();
    // STRATZ's title case still matches the combo's line.
    expect(comboSpell("Arena of Blood with Mortimer Kisses inside", [{ key: "mars_arena_of_blood", name: "Arena Of Blood" }])?.key).toBe("mars_arena_of_blood");
  });
});
