import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LanePlan, PlayerPlan } from "@/lib/engine/game-plan";
import type { LaneTactic } from "@/lib/engine/lane-tactics";
import type { Position } from "@/lib/engine/types";
import { FirstTenMinutes } from "./first-ten-minutes";

const tactic = (title: string, rule: LaneTactic["rule"] = "reach", visual?: LaneTactic["visual"]): LaneTactic => ({
  rule,
  tag: rule,
  title,
  parts: [{ text: `${title}.` }],
  spells: [],
  ...(visual ? { visual } : {}),
  weight: 0.2,
});

const mid: LanePlan = {
  name: "Mid",
  ours: [13],
  theirs: [11],
  edge: -2,
  verdict: "hard",
  text: "Hard lane against Hero 11.",
  pairs: [{ hero: 13, enemy: 11, games: 1251, won: 275, drawn: 313, lost: 663, weight: 0.97 }],
  tactics: [
    {
      hero: 13,
      enemy: 11,
      tactics: [tactic("Stay Out of Range"), tactic("Last Hit Target: 49 by the End of Lane", "lastHits", { kind: "lastHits", target: 49, usual: 52, enemy: 55 })],
    },
  ],
  enemyItems: [
    {
      hero: 11,
      items: [
        { itemId: 1, name: "Tango", img: "/tango.png", minute: 0, phase: "start" },
        { itemId: 2, name: "Bottle", img: "/bottle.png", minute: 4, phase: "lane" },
        { itemId: 3, name: "Power Treads", img: "/treads.png", minute: 9, phase: "first" },
      ],
    },
  ],
};
const safe: LanePlan = {
  name: "Safe lane",
  ours: [8, 5],
  theirs: [2, 14],
  edge: 2,
  verdict: "win",
  text: "Winning lane.",
  pairs: [
    { hero: 8, enemy: 2, games: 900, won: 400, drawn: 200, lost: 300, weight: 0.4, allRanks: true },
    { hero: 8, enemy: 14, games: 800, won: 300, drawn: 200, lost: 300, weight: 0.9, allRanks: true },
  ],
  tactics: [
    { hero: 8, enemy: 2, tactics: [tactic("Pull Against Hero 2")] },
    { hero: 8, enemy: 14, tactics: [tactic("Trade Against Hero 14")] },
  ],
};
const player = (heroId: number, position: Position, build: PlayerPlan["build"] = null): PlayerPlan => ({
  heroId,
  position,
  job: "Your timing is Blink Dagger at 19 min.",
  fallbacks: [],
  enemies: [],
  threatRows: [],
  build,
});
const draw = (heroId: number, position: Position, build: PlayerPlan["build"] = null) =>
  render(<FirstTenMinutes lanes={[safe, mid]} player={player(heroId, position, build)} heroName={(id) => `Hero ${id}`} icons={{}} />);

describe("FirstTenMinutes", () => {
  it("draws the player's pair as won, even and lost shares with the lane count", () => {
    draw(13, 2);
    const section = screen.getByRole("region", { name: "First 10 Minutes" });
    expect(within(section).getByText("Mid against Hero 11, 0 to 10 min")).toBeInTheDocument();
    expect(screen.getByText("Lane: Hard")).toBeInTheDocument();
    expect(screen.getByText("Hero 13 Won").nextSibling).toHaveTextContent("22%");
    expect(screen.getByText("Even").nextSibling).toHaveTextContent("25%");
    expect(screen.getByText("Hero 11 Won").nextSibling).toHaveTextContent("53%");
    expect(screen.getByText(/lanes of Hero 13 against Hero 11/)).toHaveTextContent("1,251 lanes of Hero 13 against Hero 11");
    expect(screen.getByText("Lane results at your rank")).toBeInTheDocument();
    // The enemy laner's role is named for the enemy, never "Pos 2".
    expect(screen.getAllByText("Enemy")).toHaveLength(2);
    expect(screen.queryByText(/Pos 2/)).toBeNull();
  });

  it("shows how to play the lane, the last hit target under By 10 Minutes, and the other lanes", () => {
    draw(13, 2);
    expect(screen.getByRole("heading", { name: "How to Play the Lane" })).toBeInTheDocument();
    expect(screen.getByText("Stay Out of Range")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "By 10 Minutes" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Against This Enemy 49, Your Usual 52, Enemy Gets 55" })).toBeInTheDocument();
    expect(screen.getByText("Safe Lane")).toBeInTheDocument();
    expect(screen.getByText("Won")).toBeInTheDocument();
  });

  it("puts the enemy laner's items on a card with the same rows as ours, the first core item with its minute", () => {
    draw(13, 2);
    const theirs = screen.getByRole("region", { name: "Hero 11 Items" });
    expect(within(theirs).getByRole("list", { name: "Hero 11 Start" }).children).toHaveLength(1);
    expect(within(theirs).getByRole("list", { name: "Hero 11 In Lane" }).children).toHaveLength(1);
    expect(within(theirs).getByText("Power Treads")).toBeInTheDocument();
    expect(within(theirs).getByText("9").parentElement).toHaveTextContent("9 min");
  });

  it("says when the enemy laner has no core item by the end of the lane", () => {
    render(
      <FirstTenMinutes
        lanes={[{ ...mid, enemyItems: [{ hero: 11, items: mid.enemyItems![0]!.items.filter((i) => i.phase !== "first") }] }]}
        player={player(13, 2)}
        heroName={(id) => `Hero ${id}`}
        icons={{}}
      />,
    );
    expect(within(screen.getByRole("region", { name: "Hero 11 Items" })).getByText("None by 10 min")).toBeInTheDocument();
  });

  it("marks items this draft changed and says why", () => {
    const build = {
      timings: "rank" as const,
      start: [
        { itemId: 4, name: "Tango", img: "/tango.png", minute: 0 },
        { itemId: 5, name: "Magic Stick", img: "/stick.png", minute: 0, draft: true as const, reason: "Hero 11 casts often" },
      ],
      lane: [{ itemId: 6, name: "Bottle", img: "/bottle.png", minute: 4 }],
      core: [{ itemId: 7, name: "Blink Dagger", img: "/blink.png", minute: 19 }],
      situational: [],
    };
    draw(13, 2, build);
    const ours = screen.getByRole("region", { name: "Your Items" });
    expect(within(ours).getByText("Changed for this draft.").parentElement).toHaveTextContent("Changed for this draft. Hero 11 casts often.");
    expect(within(ours).getByRole("list", { name: "Hero 13 In Lane" }).children).toHaveLength(1);
    expect(within(ours).getByText("Blink Dagger")).toBeInTheDocument();
    expect(within(ours).getByText("19").parentElement).toHaveTextContent("19 min");
  });

  it("with two enemy laners, starts on the likelier one and switches to the other", () => {
    draw(8, 1);
    expect(screen.getByText("Lane results from all ranks")).toBeInTheDocument();
    expect(screen.getByText("Trade Against Hero 14")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hero 2" }));
    expect(screen.getByText("Pull Against Hero 2")).toBeInTheDocument();
    expect(screen.queryByText("Trade Against Hero 14")).toBeNull();
    expect(screen.getByText("Hero 2 Won")).toBeInTheDocument();
  });

  it("shows the lane line instead of a bar without lane results", () => {
    render(<FirstTenMinutes lanes={[{ ...mid, pairs: undefined }]} player={player(13, 2)} heroName={(id) => `Hero ${id}`} icons={{}} />);
    expect(screen.queryByText("Hero 13 Won")).toBeNull();
    expect(screen.getByText("Hard lane against Hero 11.")).toBeInTheDocument();
  });
});
