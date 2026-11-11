import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlannedSlot, TeamPlan } from "@/lib/engine/plan";
import type { Position } from "@/lib/engine/types";
import { PartyPlan } from "./party-plan";

const slot = (position: Position, name: string, extra: Partial<PlannedSlot> = {}): PlannedSlot => ({
  position,
  playerId: `p${position}`,
  heroId: position * 10,
  name,
  locked: false,
  inPool: true,
  reasons: [],
  ...extra,
});

const plan: TeamPlan = {
  slots: [
    slot(1, "Juggernaut", { reasons: [{ kind: "pair", lead: "+2.1", text: "with Lion (2,232 games)", heroes: [50] }] }),
    slot(2, "Puck", { inPool: false }),
    slot(3, "Mars", { inPool: false }),
    slot(4, "Tusk", { locked: true }),
    slot(5, "Lion", { playerId: undefined, inPool: false }),
  ],
  score: 3,
  missing: [],
  style: null,
  combos: [],
  gamePlan: "Balanced.",
  why: [],
  needs: [],
  pickFirst: null,
  another: null,
};

describe("PartyPlan", () => {
  it("labels a hero outside a player's pool, and any hero for a seat without one", () => {
    render(<PartyPlan plan={plan} pooled={new Set<Position>([1, 2, 4])} names={{ p1: "Can", p2: "Ali", p3: "Ece" }} portrait={() => null} />);
    const card = (name: string) => within(screen.getByText(name).closest("li")!);
    expect(card("Juggernaut").queryByText(/Outside Pool|Any Hero/)).toBeNull();
    // Each reason leads with its number.
    expect(card("Juggernaut").getByText("+2.1")).toBeVisible();
    expect(card("Juggernaut").getByText(/with Lion \(2,232 games\)/)).toBeVisible();
    // Ali has Mid heroes, but all are taken: Puck is labeled.
    expect(card("Puck").getByText("Outside Pool")).toBeVisible();
    // Ece and the open seat have no heroes saved, so they plan any hero.
    expect(card("Mars").getByText("Any Hero")).toBeVisible();
    expect(card("Mars").queryByText(/Outside Pool/)).toBeNull();
    expect(card("Lion").getByText("Any Hero")).toBeVisible();
    expect(card("Tusk").getByText("Picked")).toBeVisible();
  });
});
