import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LanePlan, PairTactics } from "@/lib/engine/game-plan";
import type { LaneTactic } from "@/lib/engine/lane-tactics";
import { playerTactics } from "./lane-board";
import { LaneTactics } from "./lane-tactics";

const tactic = (rule: LaneTactic["rule"], title: string, weight: number, visual?: LaneTactic["visual"]): LaneTactic => ({
  rule,
  tag: rule,
  title,
  parts: [{ text: `${title}: ` }, { text: "do this", strong: true }, { text: "." }],
  spells: [],
  ...(visual ? { visual } : {}),
  weight,
});
const killLine = tactic("killLine", "Hero 25's Level 6 Kill Line", 0.7, {
  kind: "killLine",
  health: 790,
  total: 559,
  parts: [
    { spell: "lina_laguna_blade", label: "Laguna Blade", amount: 258 },
    { label: "2 Hits", amount: 96 },
  ],
});
const lina: PairTactics = {
  hero: 36,
  enemy: 25,
  tactics: [
    killLine,
    tactic("yourSpell", "Death Pulse When Hero 25 Steps In", 0.3, { kind: "ruler", bars: [{ side: "ours", range: 500, spell: "necrolyte_death_pulse" }, { side: "enemy", range: 670, hero: 25 }] }),
    tactic("reach", "Hero 25 Outranges You by 170", 0.2),
    tactic("window", "Hit Hero 25 After Dragon Slave", 0.1),
  ],
};
const pudge: PairTactics = { hero: 36, enemy: 14, tactics: [tactic("lineUp", "Keep a Creep Between You and Hero 14", 0.2, { kind: "lineUp", width: 100, spell: "pudge_meat_hook", blocked: true })] };
const name = (id: number) => `Hero ${id}`;

describe("LaneTactics", () => {
  it("draws the top three as cards, the first one as Care Most, and the rest as tips", () => {
    render(<LaneTactics pairs={[lina]} heroName={name} icons={{}} />);
    const section = screen.getByRole("region", { name: "Lane Tactics" });
    expect(within(section).getAllByRole("article")).toHaveLength(4);
    expect(within(section).getByText("Care Most")).toBeInTheDocument();
    expect(within(section).getByRole("img", { name: "The combo deals 559 of your 790 HP" })).toBeInTheDocument();
    expect(within(section).getByRole("img", { name: /Ranges: Spell 500, Hero 25's attack 670/ })).toBeInTheDocument();
    expect(within(section).getByText("Hit Hero 25 After Dragon Slave")).toBeInTheDocument();
    expect(within(section).getAllByText("do this")[0]!.tagName).toBe("B");
    // One enemy laner: no switch.
    expect(within(section).queryByRole("group", { name: "Enemy laner" })).not.toBeInTheDocument();
  });

  it("switches between two enemy laners", () => {
    render(<LaneTactics pairs={[lina, pudge]} heroName={name} icons={{}} />);
    expect(screen.getByText("Against Hero 25, most important first")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hero 14" }));
    expect(screen.getByRole("button", { name: "Hero 14" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Keep a Creep Between You and Hero 14")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /stops at the first creep/ })).toBeInTheDocument();
  });

  it("draws the last hit target as its own row under the rules", () => {
    const target: LaneTactic = {
      ...tactic("lastHits", "Last Hit Target: 49 by the End of Lane", 0),
      visual: { kind: "lastHits", target: 49, usual: 52, enemy: 55 },
    };
    render(<LaneTactics pairs={[{ ...lina, tactics: [...lina.tactics, target] }]} heroName={name} icons={{}} />);
    expect(screen.getByText("Last Hit Target: 49 by the End of Lane")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Against This Enemy 49, Your Usual 52, Enemy Gets 55" })).toBeInTheDocument();
    // Still three cards and one tip: the target takes no rule's place.
    expect(screen.getByText("Hit Hero 25 After Dragon Slave")).toBeInTheDocument();
  });

  it("draws nothing without tactics", () => {
    const { container } = render(<LaneTactics pairs={[]} heroName={name} icons={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("draws nothing, not a title over nothing, when the only tactic is the target drawn elsewhere", () => {
    const target = tactic("lastHits", "Last Hit Target: 39 by the End of Lane", 0, { kind: "lastHits", target: 39, usual: 25, enemy: 54 });
    const { container } = render(<LaneTactics pairs={[{ hero: 74, enemy: 11, tactics: [target] }]} heroName={name} icons={{}} withTarget={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("leaves an enemy with nothing to draw out of the switch", () => {
    const target = tactic("lastHits", "Last Hit Target: 39 by the End of Lane", 0, { kind: "lastHits", target: 39, usual: 25, enemy: 54 });
    render(<LaneTactics pairs={[{ hero: 36, enemy: 11, tactics: [target] }, lina]} heroName={name} icons={{}} withTarget={false} />);
    expect(screen.getByText("Against Hero 25, most important first")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Enemy laner" })).not.toBeInTheDocument();
  });
});

describe("playerTactics", () => {
  it("keeps the player's pairs, the enemy they meet most first", () => {
    const lane: LanePlan = {
      name: "Mid",
      ours: [36],
      theirs: [25, 14],
      edge: 0,
      verdict: "even",
      text: "",
      pairs: [
        { hero: 36, enemy: 25, games: 900, won: 300, drawn: 300, lost: 300, weight: 0.3 },
        { hero: 36, enemy: 14, games: 900, won: 300, drawn: 300, lost: 300, weight: 0.6 },
      ],
      tactics: [lina, pudge, { hero: 8, enemy: 25, tactics: [killLine] }, { hero: 36, enemy: 99, tactics: [] }],
    };
    expect(playerTactics(lane, 36).map((p) => p.enemy)).toEqual([14, 25]);
  });
});
