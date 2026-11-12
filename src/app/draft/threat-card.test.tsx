import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { DraftThreat } from "@/lib/engine/threat-plan";
import { ThreatCard, threatSentence } from "./threat-card";

const NAMES: Record<number, string> = { 12: "Phantom Lancer", 29: "Tidehunter", 18: "Sven", 37: "Warlock", 42: "Wraith King" };
const hero = (id: number) => ({ name: NAMES[id] ?? `Hero ${id}` });
const step = (games: number, winRate: number) => ({ games, winRate });

const threat = (have: number[], hero = 12, position: 1 | 3 = 1, top = 57.6): DraftThreat => ({
  hero,
  position,
  plan: {
    hero,
    answers: [],
    stair: [step(19280, top), step(17420, 52.1), step(6766, 46)],
    drop: 10.9,
    dropLow: 9.5,
    length: [],
  },
  have: have.map((h) => ({ hero: h, edge: -5.8 })),
  step: have.length === 0 ? 0 : 1,
  open: [
    { position: 1, heroes: [{ hero: 18, edge: -4.2 }] },
    { position: 5, heroes: [{ hero: 37, edge: -4.5 }] },
  ],
  lanes: [],
  length: { his: [], group: [] },
});

describe("threatSentence", () => {
  it("says where he stands against your team and what more answers do", () => {
    expect(threatSentence(threat([]), hero)).toBe(
      "Phantom Lancer wins 57.6% against teams with none of his answers. Your team has none yet. One answer drops him to 52.1%, two to 46.0%.",
    );
    expect(threatSentence(threat([29]), hero)).toBe(
      "Phantom Lancer wins 57.6% against teams with none of his answers. Your team has one, Tidehunter. A second answer drops him to 46.0%.",
    );
  });
});

describe("ThreatCard", () => {
  it("shows a tile for each dangerous enemy with his number, and the first one's answer", () => {
    render(<ThreatCard threats={[threat([29]), threat([], 42, 3, 51.3)]} hero={hero} myPosition={1} games={1_000_000} />);
    const tiles = within(screen.getByRole("list", { name: "Dangerous Enemies" })).getAllByRole("button");
    expect(tiles.map((t) => t.textContent)).toEqual([
      "Phantom LancerCarryOne of his answers52.1%",
      "Wraith KingOfflaneNone of his answers51.3%",
    ]);
    expect(tiles[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Answer Phantom Lancer" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "His win rate: No Answers 57.6%, One Answer 52.1%, Two or More 46.0%. Your team: One Answer.",
      }),
    ).toBeInTheDocument();
    const seats = within(screen.getByRole("list", { name: "Open Answers" })).getAllByRole("listitem");
    expect(seats[0]).toHaveTextContent("Your PickYouCarrySven−4.2 for him");
    expect(seats[1]).toHaveTextContent("TeammatesHard SupportWarlock−4.5 for him");
    expect(screen.getByRole("region", { name: "Dangerous Enemies" })).toHaveTextContent("From 1,000,000 ranked All Pick games");
  });

  it("opens another enemy's answer from his tile", async () => {
    render(<ThreatCard threats={[threat([29]), threat([], 42, 3, 51.3)]} hero={hero} myPosition={1} games={1} />);
    await userEvent.click(screen.getByRole("button", { name: /Wraith King/ }));
    expect(screen.getByRole("button", { name: /Wraith King/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Answer Wraith King" })).toBeInTheDocument();
  });
});
