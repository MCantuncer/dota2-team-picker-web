import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { GamePlan } from "@/lib/engine/game-plan";
import { GameStoryPanel } from "./game-story-panel";
import { sentence } from "./build-path";

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
      enemies: [
        { heroId: 9, inLane: true, laneSure: false, threat: "Tank who soaks your damage", answers: [], tip: "Don't focus them" },
        { heroId: 8, inLane: false, laneSure: true, threat: "Stuns and disables", answers: [116], spell: { key: "lion_voodoo", name: "Hex", line: "No spells, no items", kind: "magic" } },
      ],
      threatRows: [
        { enemies: [{ heroId: 9, inLane: true, laneSure: false, threat: "Tank who soaks your damage" }], tip: "Don't focus them" },
        { enemies: [{ heroId: 8, inLane: false, laneSure: true, threat: "Stuns and disables" }], answer: 116 },
      ],
      build: {
        timings: "rank",
        start: [item(44, "Tango", 0), item(16, "Iron Branch", 0, { count: 2 })],
        lane: [item(75, "Wraith Band", 2), item(36, "Magic Wand", 3)],
        core: [
          { ...item(50, "Phase Boots", 9), phase: "lane" as const },
          { ...item(116, "Black King Bar", 17, { reason: "Against Hero 8: buy it early", lateMinute: 20 }), effect: "Spell immunity for the big fights.", against: [8] },
        ],
        bootsOr: item(63, "Power Treads", 8),
        situational: [{ ...item(145, "Monkey King Bar", 30), draft: true, replaces: 116 }],
      },
    },
    {
      heroId: 2,
      position: 2,
      job: "Win your lane.",
      fallbacks: [],
      enemies: [],
      threatRows: [],
      build: { timings: "around", start: [], lane: [], core: [item(36, "Magic Wand", 8)], situational: [] },
    },
  ],
  teamFallbacks: ["Behind at 20? Defend high ground until Hero 1 has Black King Bar."],
  story: {
    headline: "Fight from 14 min, before Hero 9 has Battle Fury at 18.",
    ready: 17,
    chapters: [
      { phase: "0 to 10 min", from: 0, to: 10, ours: [], theirs: [], action: "Farm and trade evenly.", text: "Farm and trade evenly." },
      {
        phase: "10 to 20 min",
        from: 10,
        to: 20,
        ours: [{ hero: "Hero 1", item: "Black King Bar", minute: 17 }],
        theirs: [{ hero: "Hero 8", item: "Blink Dagger", minute: 19 }],
        action: "Group up and take towers before Hero 8's Blink Dagger.",
        text: "Hero 1 has Black King Bar at 17. Group up and take towers.",
      },
    ],
  },
};

const renderPanel = (myPosition?: number) =>
  render(<GameStoryPanel plan={plan} heroName={(id) => `Hero ${id}`} icons={{}} playerNames={["Can", null]} myPosition={myPosition} />);

describe("GameStoryPanel", () => {
  it("tells the story under Game Story: headline, chapters, danger heroes and the team's fallbacks", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("tab", { name: "Game Story" }));
    const story = screen.getByRole("region", { name: "Your Game" });
    expect(within(story).getByText("Fight from 14 min, before Hero 9 has Battle Fury at 18.")).toBeInTheDocument();
    expect(within(story).getByText(/Group up and take towers/)).toBeInTheDocument();
    expect(within(story).getByText(/Black King Bar at 21 min/)).toBeInTheDocument();
    expect(within(story).getByText(/Behind at 20\?/)).toBeInTheDocument();
  });

  it("puts the game plan against an enemy dangerous core in place of his danger line", async () => {
    const user = userEvent.setup();
    const step = (winRate: number) => ({ games: 1000, winRate });
    render(
      <GameStoryPanel
        plan={plan}
        heroName={(id) => `Hero ${id}`}
        icons={{}}
        playerNames={[]}
        threats={[{
          hero: 8,
          position: 1,
          plan: { hero: 8, answers: [], stair: [step(57.6), step(52.1), step(46)], drop: 10, dropLow: 8, length: [] },
          have: [],
          step: 0,
          open: [],
          lanes: [],
          length: { his: [], group: [] },
        }]}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Game Story" }));
    expect(screen.getByRole("region", { name: "Game Plan Against Hero 8" })).toBeInTheDocument();
    expect(screen.queryByText(/Black King Bar at 21 min/)).not.toBeInTheDocument();
    expect(screen.queryByText("Danger Heroes")).not.toBeInTheDocument();
  });

  it("draws the Story as a minute line: our items, theirs, the ready mark and one action per chapter", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("tab", { name: "Game Story" }));
    const timeline = screen.getByRole("img", { name: /^Item timings:/ });
    expect(timeline).toHaveAccessibleName("Item timings: our Hero 1 Black King Bar at 17, their Hero 8 Blink Dagger at 19, ready to fight at 17.");
    expect(within(timeline).getByText("10 to 20 min")).toBeInTheDocument();
    expect(within(timeline).getByText("Ready to fight")).toBeInTheDocument();
    expect(screen.getByText("Group up and take towers before Hero 8's Blink Dagger.")).toBeInTheDocument();
  });

  it("opens on the viewer's own hero and its Item Build, so the page starts with their items", () => {
    renderPanel(2);
    const players = screen.getByRole("tablist", { name: "Players" });
    const tabs = within(players).getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("Hero 2");
    expect(tabs[0]).toHaveTextContent("You");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tablist", { name: "Hero 2 view" })).getByRole("tab", { name: "Item Build" })).toHaveAttribute("aria-selected", "true");
    // Item Build holds the items alone: the team's story waits on its own tab.
    expect(screen.getByText("Build Path")).toBeInTheDocument();
    expect(screen.queryByText("The Team")).toBeNull();
  });

  it("shows each tab's answer on the tab itself, and names it for screen readers", () => {
    renderPanel(1);
    const views = within(screen.getByRole("tablist", { name: "Hero 1 view" })).getAllByRole("tab");
    expect(views.map((t) => t.getAttribute("aria-label"))).toEqual(["Item Build", "Game Story", "Skills and Talents"]);
    expect(views[0]).toHaveAccessibleDescription("Next: Phase Boots at 9 min, Black King Bar at 17 min.");
    expect(views[1]).toHaveAccessibleDescription("Hard Lane against Hero 9. Your team is ready at 17 min.");
    expect(views[0]).toHaveAttribute("aria-keyshortcuts", "I");
  });

  it("opens a view with its key while focus is inside Your Game, and never while typing elsewhere", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="Search" />
        <GameStoryPanel plan={plan} heroName={(id) => `Hero ${id}`} icons={{}} playerNames={[]} myPosition={1} />
      </>,
    );
    await user.click(screen.getByRole("textbox", { name: "Search" }));
    await user.keyboard("g");
    expect(screen.getByRole("tab", { name: "Item Build" })).toHaveAttribute("aria-selected", "true");
    screen.getByRole("tab", { name: /Hero 1/ }).focus();
    await user.keyboard("g");
    expect(screen.getByRole("tab", { name: "Game Story" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Game Story" })).toHaveFocus();
    await user.keyboard("{Control>}s{/Control}");
    expect(screen.getByRole("tab", { name: "Game Story" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("s");
    expect(screen.getByRole("tab", { name: "Skills and Talents" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows each step's minute, the minute it is late after, and why it is in this game", () => {
    renderPanel(1);
    const path = screen.getByRole("list", { name: "Core items, in buy order" });
    expect(within(path).getByText("17")).toBeInTheDocument();
    expect(within(path).getByText("Late After 20")).toBeInTheDocument();
    // The draft's answer item is open to start, with why it is in this game and its numbers.
    expect(within(path).getByRole("button", { name: "Black King Bar, for Hero 8" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Against Hero 8: buy it early. Spell immunity for the big fights.")).toBeInTheDocument();
    // The usual lane items are tiles after the start, with no minute; the other boots sit under the boots.
    expect(within(screen.getByRole("list", { name: "Lane items, in buy order" })).getByRole("button", { name: "Wraith Band" })).toBeInTheDocument();
    expect(screen.getByText(/Or Power Treads at/)).toBeInTheDocument();
  });

  it("keeps the viewer's hero open when their position arrives after the first render", () => {
    const { rerender } = renderPanel();
    rerender(<GameStoryPanel plan={plan} heroName={(id) => `Hero ${id}`} icons={{}} playerNames={["Can", null]} myPosition={2} />);
    expect(screen.getByRole("tab", { name: /Hero 2/ })).toHaveAttribute("aria-selected", "true");
  });

  it("shows the other boots once, under the core boots, and why an If Needed item replaces one", () => {
    renderPanel(1);
    expect(screen.getAllByText(/Or Power Treads at/)).toHaveLength(1);
    expect(screen.getByText("Instead of Black King Bar.")).toBeInTheDocument();
  });

  it("shows start items as tiles with their names and copies", () => {
    renderPanel(1);
    const start = screen.getByRole("list", { name: "Start items" });
    expect(within(start).getByRole("button", { name: "2 Iron Branch" })).toBeInTheDocument();
    expect(within(start).getByText("x2")).toBeInTheDocument();
    expect(within(start).getByText("Tango")).toBeInTheDocument();
  });

  it("lists each enemy by their worst spell, with the item that answers it, or what to do", () => {
    renderPanel(1);
    const threats = within(screen.getByRole("complementary")).getAllByRole("listitem");
    expect(threats[0]).toHaveTextContent("Hero 9 Lane, guessedTank who soaks your damage. Don't focus them.");
    expect(threats[1]).toHaveTextContent("Hex Hero 8No spells, no items.Answer:");
    expect(within(threats[1]!).getByAltText("Black King Bar")).toBeInTheDocument();
  });

  it("marks rough minutes when there are no real timings", async () => {
    const user = userEvent.setup();
    renderPanel(1);
    await user.click(screen.getByRole("tab", { name: /Hero 2/ }));
    expect(screen.getByText("~8 min")).toBeInTheDocument();
    expect(screen.getByText("Rough minutes from all games")).toBeInTheDocument();
  });

  it("moves between players and views with the arrow keys", async () => {
    const user = userEvent.setup();
    renderPanel(1);
    screen.getByRole("tab", { name: /Hero 1/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Hero 2/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Hero 2/ })).toHaveFocus();
  });

  it("shows the lane, the job and the fallbacks under Game Story", async () => {
    const user = userEvent.setup();
    renderPanel(1);
    await user.click(screen.getByRole("tab", { name: "Game Story" }));
    expect(screen.getByText("Hard lane")).toBeInTheDocument();
    expect(screen.getByText("Farm and carry the late game.")).toBeInTheDocument();
    expect(screen.getByText(/Lane lost\?/)).toBeInTheDocument();
  });

  it("shows the skill plan under Skills and Talents, or says there is none", async () => {
    const user = userEvent.setup();
    const skills = {
      levels: null,
      names: {},
      buildReason: "No high-rank skill builds for this hero in this position yet.",
      talents: [],
      live: "loading" as const,
    };
    const withSkills = { ...plan, players: plan.players.map((p, i) => (i === 0 ? { ...p, skills } : p)) };
    render(<GameStoryPanel plan={withSkills} heroName={(id) => `Hero ${id}`} icons={{}} playerNames={[]} />);
    await user.click(screen.getByRole("tab", { name: "Skills and Talents" }));
    expect(screen.getByText(skills.buildReason)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Hero 2/ }));
    expect(screen.getByText("No skill data for this hero yet.")).toBeInTheDocument();
  });

  it("never cuts text off", () => {
    const { container } = renderPanel(1);
    expect(container.querySelector(".truncate, [class*='line-clamp'], [class*='text-ellipsis']")).toBeNull();
  });
});

describe("sentence", () => {
  it("ends a line with one period, and keeps a question or exclamation", () => {
    expect(sentence("Against Hero 8: buy it early")).toBe("Against Hero 8: buy it early.");
    expect(sentence("Spell immunity.")).toBe("Spell immunity.");
    expect(sentence("Behind at 20?")).toBe("Behind at 20?");
    expect(sentence("Fight now: ")).toBe("Fight now.");
  });
});
