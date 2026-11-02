import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GamePlan } from "@/lib/engine/game-plan";
import { GameStoryPanel } from "./game-story-panel";

const item = (itemId: number, name: string, minute: number, extra: { reason?: string; lateMinute?: number; count?: number } = {}) => ({
  itemId,
  name,
  img: `/items/${itemId}.png`,
  minute,
  ...extra,
});
const plan: GamePlan = {
  edge: 2.1,
  ourStyle: null,
  theirStyle: null,
  winCondition: "No single style: play around your strongest heroes.",
  lanes: [
    { name: "Safe lane", ours: [1], theirs: [9], edge: -2, verdict: "hard", text: "Hard lane against Hero 9: farm safely." },
    { name: "Mid", ours: [2], theirs: [7], edge: 0.2, verdict: "even", text: "Even lane against Hero 7: the better last hits win it." },
  ],
  ourCombos: [],
  fears: [],
  danger: ["Hero 8: Black King Bar at 21 min. Lock them down first in every fight."],
  roadmap: [],
  players: [
    {
      heroId: 1,
      position: 1,
      job: "Farm and carry the late game.",
      fallbacks: ["Lane lost? Leave the lane at 5 to 6 min for the jungle."],
      build: {
        timings: "rank",
        start: [item(44, "Tango", 0), item(16, "Iron Branch", 0, { count: 2 })],
        lane: [item(75, "Wraith Band", 2), item(36, "Magic Wand", 3)],
        core: [
          item(50, "Phase Boots", 9),
          item(116, "Black King Bar", 17, { reason: "Against Hero 8: buy it early", lateMinute: 20 }),
        ],
        bootsOr: item(63, "Power Treads", 8),
        situational: [],
      },
    },
    {
      heroId: 2,
      position: 2,
      job: "Win your lane.",
      fallbacks: [],
      build: { timings: "around", start: [], lane: [], core: [item(36, "Magic Wand", 8)], situational: [] },
    },
  ],
  teamFallbacks: ["Behind at 20? Defend high ground until Hero 1 has Black King Bar."],
  story: {
    headline: "Win before 30 minutes: their Hero 9 outscales us.",
    chapters: [
      { phase: "0 to 10 min", text: "Farm and trade evenly." },
      { phase: "10 to 20 min", text: "Hero 1 has Black King Bar. Group up and take towers." },
    ],
  },
};

const renderPanel = (myPosition?: number) =>
  render(<GameStoryPanel plan={plan} heroName={(id) => `Hero ${id}`} icons={{}} playerNames={["Can", null]} myPosition={myPosition} />);

describe("GameStoryPanel", () => {
  it("tells the story: headline, chapters, danger heroes and the team's fallbacks", () => {
    renderPanel();
    const story = screen.getByRole("region", { name: "Game Story" });
    expect(within(story).getByText("Win before 30 minutes: their Hero 9 outscales us.")).toBeInTheDocument();
    expect(within(story).getByText(/Group up and take towers/)).toBeInTheDocument();
    expect(within(story).getByText(/Black King Bar at 21 min/)).toBeInTheDocument();
    expect(within(story).getByText(/Behind at 20\?/)).toBeInTheDocument();
  });

  it("shows each item's minute and the minute after which a player is slower than most", () => {
    renderPanel(1);
    const carry = screen.getByRole("listitem", { name: "Hero 1, position 1" });
    expect(within(carry).getByText(/Can/)).toBeInTheDocument();
    expect(within(carry).getByText("Hard lane")).toBeInTheDocument();
    expect(within(carry).getByText("17m")).toBeInTheDocument();
    expect(within(carry).getByText("20m")).toBeInTheDocument();
    expect(within(carry).getByTitle(/Black King Bar, usually by 17 min, slower than most after 20 min/)).toBeInTheDocument();
    expect(within(carry).getByText("Against Hero 8: buy it early")).toBeInTheDocument();
    expect(within(carry).getByText(/Lane lost\?/)).toBeInTheDocument();
  });

  it("shows start copies, lane minutes and the other boots", () => {
    renderPanel(1);
    const carry = screen.getByRole("listitem", { name: "Hero 1, position 1" });
    expect(within(carry).getByAltText("2 Iron Branch")).toBeInTheDocument();
    expect(within(carry).getByText("x2")).toBeInTheDocument();
    expect(within(carry).getByTitle(/Wraith Band, usually by 2 min/)).toBeInTheDocument();
    expect(within(carry).getByText(/Or Power Treads at/)).toBeInTheDocument();
  });

  it("marks rough minutes when there are no real timings", () => {
    renderPanel();
    const mid = screen.getByRole("listitem", { name: "Hero 2, position 2" });
    expect(within(mid).getByText("Core, rough minutes")).toBeInTheDocument();
    expect(within(mid).getByText("~8m")).toBeInTheDocument();
  });

  it("puts the viewer's own card first and open, and folds the others", () => {
    renderPanel(2);
    const cards = screen.getAllByRole("listitem", { name: /position/ });
    expect(cards[0]).toHaveAccessibleName("Hero 2, position 2");
    expect(cards[0]!.querySelector("details")).toHaveAttribute("open");
    expect(cards[1]!.querySelector("details")).not.toHaveAttribute("open");
  });

  it("never cuts text off", () => {
    const { container } = renderPanel(1);
    expect(container.querySelector(".truncate, [class*='line-clamp'], [class*='text-ellipsis']")).toBeNull();
  });
});
