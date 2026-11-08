import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import { laneGroups, PlayerItems } from "./player-items";

const item = (itemId: number, name: string, minute: number) => ({ itemId, name, img: `/items/${itemId}.png`, minute });

describe("laneGroups", () => {
  it("puts lane items finished at the same minute in one group, keyed by the first", () => {
    const nullTalisman = item(77, "Null Talisman", 2);
    const bracer = item(73, "Bracer", 2);
    const wand = item(36, "Magic Wand", 2);
    const later = item(75, "Wraith Band", 4);
    const groups = laneGroups([nullTalisman, bracer, wand, later]);
    expect([...groups.values()]).toEqual([[nullTalisman, bracer, wand], [later]]);
    expect(groups.get(bracer)).toBeUndefined();
  });
});

describe("PlayerItems lane steps", () => {
  const player = (lane: ReturnType<typeof item>[]): PlayerPlan => ({
    heroId: 36,
    position: 2,
    job: "Win your lane.",
    fallbacks: [],
    enemies: [],
    threatRows: [],
    build: { timings: "rank", start: [], lane, core: [item(50, "Phase Boots", 9)], situational: [] },
  });

  it("says the shared minute once for items finished together", () => {
    render(<PlayerItems player={player([item(77, "Null Talisman", 2), item(73, "Bracer", 2), item(36, "Magic Wand", 2)])} heroName={(id) => `Hero ${id}`} icons={{}} />);
    expect(screen.getByText("Null Talisman, Bracer and Magic Wand")).toBeInTheDocument();
    expect(screen.getByText("by 2 min")).toBeInTheDocument();
    expect(screen.queryAllByText("2 min")).toHaveLength(0);
  });

  it("keeps a lane item with its own minute on its own row", () => {
    render(<PlayerItems player={player([item(75, "Wraith Band", 2), item(36, "Magic Wand", 3)])} heroName={(id) => `Hero ${id}`} icons={{}} />);
    expect(screen.getByText("Wraith Band")).toBeInTheDocument();
    expect(screen.getByText("2 min")).toBeInTheDocument();
    expect(screen.getByText("3 min")).toBeInTheDocument();
  });
});
