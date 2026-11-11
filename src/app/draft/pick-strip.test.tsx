import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Suggestion } from "@/lib/engine/types";
import type { Verdict } from "@/lib/engine/verdict";
import type { PickEntry } from "./my-picks";
import { PickStrip, strengthOf } from "./pick-strip";

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
const NAMES: Record<number, string> = {
  74: "Invoker",
  106: "Ember Spirit",
  13: "Puck",
  11: "Shadow Fiend",
  14: "Pudge",
  8: "Juggernaut",
  53: "Nature's Prophet",
  17: "Storm Spirit",
};
const HEROES = Object.entries(NAMES).map(([id, name]) => ({ id: Number(id), name }));
const hero = (id: number) => ({ name: NAMES[id] ?? "", portrait: `${CDN}/${id}.png` });

function suggestion(heroId: number, score: number, extra: Partial<Suggestion> = {}): Suggestion {
  return {
    heroId,
    name: NAMES[heroId]!,
    score,
    error: 0.8,
    breakdown: { positionFit: 3, counter: 2.3, synergy: -0.2, meta: 1.8, teamNeeds: 0.7, comfort: 1.5, flex: 0, pickSafety: 0.7 },
    counterBy: [],
    synergyBy: [],
    record: null,
    reasons: [],
    summary: "",
    place: { rank: 1, of: 49 },
    tags: [],
    hardCounters: [],
    ...extra,
  };
}

const clear: Verdict = {
  heroId: 74,
  kind: "clear",
  text: "5.8 points ahead of Ember Spirit, more than the 2.9 the data could be off by.",
  note: null,
};
const behind: Verdict = { heroId: 106, kind: "behind", text: "5.8 points behind: 2.9 worse against Shadow Fiend.", note: null };

const picks: PickEntry[] = [
  {
    suggestion: suggestion(74, 9.7, { reasons: ["Beats Shadow Fiend (+1.6, likely your lane) and Pudge (+0.7)"], tags: ["Favorite (+1.5)"] }),
    verdict: clear,
    gain: null,
  },
  {
    suggestion: suggestion(106, 3.9, {
      place: { rank: 11, of: 49 },
      hardCounters: [{ counterId: 8, gap: 6.7, status: "open", text: "Gamble: Juggernaut still available" }],
    }),
    verdict: behind,
    move: "Up 1",
    gain: 1.2,
  },
  {
    suggestion: suggestion(13, 3.6, { place: { rank: 14, of: 49 } }),
    risk: { heroId: 11, points: -2.1, isHardCounter: false },
    playedGames: 38,
    gain: null,
  },
  // Below 0: one of the player's heroes, but not this game.
  {
    suggestion: suggestion(17, -3.4, {
      place: { rank: 44, of: 49 },
      breakdown: { positionFit: 3, counter: -6.4, synergy: -0.2, meta: -1.5, teamNeeds: 0.2, comfort: 1.5, flex: 0, pickSafety: 0 },
    }),
    isWeak: true,
    risk: { heroId: 11, points: -4.2, isHardCounter: false },
    gain: null,
  },
];

function strip(props: Partial<Parameters<typeof PickStrip>[0]> = {}) {
  return render(
    <PickStrip
      head={<h2>Picks for Pos 2 Mid</h2>}
      picks={picks}
      reacting="Reacting to Pudge and Shadow Fiend on the enemy team, Juggernaut on yours and 5 bans."
      position={2}
      hero={hero}
      heroes={HEROES}
      enemies={[11, 14]}
      {...props}
    />,
  );
}

const tiles = () => [...screen.getByRole("list", { name: "Suggested heroes" }).querySelectorAll<HTMLElement>(":scope > li")];
const tile = (name: string) => tiles().find((li) => li.querySelector("[data-hero-name]")?.textContent === name)!;

describe("strengthOf", () => {
  it("puts a hero's place among every hero for the position in fifths", () => {
    expect(strengthOf({ rank: 1, of: 49 })).toBe(5);
    expect(strengthOf({ rank: 11, of: 49 })).toBe(4);
    expect(strengthOf({ rank: 25, of: 49 })).toBe(3);
    expect(strengthOf({ rank: 44, of: 49 })).toBe(1);
    expect(strengthOf({ rank: 49, of: 49 })).toBe(1);
    expect(strengthOf({ rank: 0, of: 0 })).toBeNull();
  });
});

describe("PickStrip", () => {
  it("shows every pick that scores 0 or more as a tile: name, score, strength and the main reason", () => {
    strip();
    expect(tiles().map((li) => li.querySelector("[data-hero-name]")!.textContent)).toEqual(["Invoker", "Ember Spirit", "Puck"]);
    const best = tile("Invoker");
    expect(best).toHaveTextContent("+9.7");
    expect(within(best).getByRole("img", { name: "Strength 5 of 5" })).toHaveAttribute(
      "title",
      "Strength 5 of 5: 1st of 49 heroes for this position in this draft",
    );
    // The main reason, number first, without the note in brackets (that is on the full card).
    expect(best).toHaveTextContent("+1.6 against Shadow Fiend");
    expect(best).not.toHaveTextContent("likely your lane");
    expect(within(tile("Ember Spirit")).getByRole("img", { name: "Strength 4 of 5" })).toBeInTheDocument();
  });

  it("shows how much a pick moves the win chance on its tile, only when a checked model gives one", () => {
    strip();
    const ember = tile("Ember Spirit");
    expect(within(ember).getByTitle("Change in your team's win chance")).toHaveTextContent("+1.2%");
    expect(within(ember).getByRole("button", { name: "Ember Spirit, +3.9 points, +1.2% win chance. Show why." })).toBeInTheDocument();
    expect(within(tile("Invoker")).queryByTitle("Change in your team's win chance")).toBeNull();
  });

  it("opens the Best pick's full card at the start, with its label, seat, score, reasons and the Reacting To line", () => {
    strip();
    expect(within(tile("Invoker")).getByRole("button", { name: "Invoker, +9.7 points. Show why." })).toHaveAttribute("aria-pressed", "true");
    const card = screen.getByRole("article", { name: "Invoker" });
    expect(card).toHaveAttribute("id", "pick-detail");
    expect(card).toHaveTextContent("Clear Best Pick");
    expect(card).toHaveTextContent("Pos 2 Mid");
    expect(card).toHaveTextContent("+9.7Points");
    expect(card).toHaveTextContent("1st of 49 Mids");
    expect(card).toHaveTextContent("5.8 points ahead of Ember Spirit, more than the 2.9 the data could be off by");
    expect(card).toHaveTextContent("+1.6 against Shadow Fiend (likely your lane)");
    expect(card).toHaveTextContent("+0.7 against Pudge");
    expect(card).toHaveTextContent("+1.5 one of your heroes for this position");
    expect(card).toHaveTextContent("Reacting to Pudge and Shadow Fiend");
  });

  it("opens another hero's card from its tile: its place, the verdict against the Best, chips, gain and risks", async () => {
    strip();
    await userEvent.click(within(tile("Ember Spirit")).getByRole("button", { name: /^Ember Spirit,/ }));
    expect(screen.queryByRole("article", { name: "Invoker" })).toBeNull();
    expect(within(tile("Ember Spirit")).getByRole("button", { name: /^Ember Spirit,/ })).toHaveAttribute("aria-pressed", "true");
    const card = screen.getByRole("article", { name: "Ember Spirit" });
    expect(card).toHaveTextContent("2nd Pick");
    expect(card).not.toHaveTextContent("Best Pick");
    expect(card).toHaveTextContent("5.8 points behind Invoker: 2.9 worse against Shadow Fiend");
    expect(within(card).getByText("Up 1")).toBeInTheDocument();
    expect(card).toHaveTextContent("+1.2% win chance");
    expect(card).toHaveTextContent("−6.7 if they pick Juggernaut, a hard counter still open");
  });

  it("labels the first tile Best only when no hero for the position scores higher, else Your Best", () => {
    const { unmount } = strip();
    expect(within(tile("Invoker")).getAllByText("Best").length).toBeGreaterThan(0);
    expect(within(tile("Ember Spirit")).queryByText(/Best/)).toBeNull();
    unmount();
    // 2nd of 49: the best of the player's heroes, not the best pick.
    const second = { ...picks[0]!, suggestion: suggestion(74, 9.7, { place: { rank: 2, of: 49 } }) };
    strip({ picks: [second, picks[1]!] });
    expect(within(tiles()[0]!).getAllByText("Your Best").length).toBeGreaterThan(0);
    expect(screen.getByRole("article", { name: "Invoker" })).toHaveTextContent("Clear Best of Your Heroes");
  });

  it("marks one bad matchup on a good pick as a risk with the enemy, and a played hero as Outside Pool", () => {
    strip();
    const puck = tile("Puck");
    expect(within(puck).getByRole("button", { name: "Puck, +3.6 points, risk Shadow Fiend. Show why." })).toBeInTheDocument();
    expect(within(puck).getByTitle("Risk: −2.1 points against Shadow Fiend")).toBeInTheDocument();
    expect(within(puck).getByText("Outside Pool")).toBeInTheDocument();
    expect(within(tile("Invoker")).queryByText(/Risk/)).toBeNull();
  });

  it("puts the player's heroes below 0 in Not This Game, not on a tile, and each still opens its card", async () => {
    strip();
    expect(tiles().some((li) => li.textContent?.includes("Storm Spirit"))).toBe(false);
    const out = screen.getByRole("region", { name: "Not This Game" });
    expect(within(out).getAllByRole("listitem")).toHaveLength(1);
    expect(out).toHaveTextContent("Storm Spirit−3.4");
    // The part that sinks it, with the enemy when that part is the matchups.
    expect(out).toHaveTextContent("Counters −6.4");
    expect(out).toHaveTextContent("Shadow Fiend");
    await userEvent.click(within(out).getByRole("button", { name: /Storm Spirit/ }));
    const card = screen.getByRole("article", { name: "Storm Spirit" });
    expect(card).toHaveTextContent("4th Pick");
    expect(within(card).getByText("Weak Here")).toBeInTheDocument();
  });

  it("has no Not This Game box when every listed hero scores 0 or more", () => {
    strip({ picks: picks.slice(0, 3) });
    expect(screen.queryByRole("region", { name: "Not This Game" })).toBeNull();
  });

  it("keeps the first hero on a tile even below 0, as Your Best, with Weak Here on its card", () => {
    strip({ picks: [{ ...picks[3]!, verdict: undefined }] });
    expect(tiles()).toHaveLength(1);
    expect(within(tiles()[0]!).getAllByText("Your Best").length).toBeGreaterThan(0);
    // Below 0 is the warning; no risk mark beside it.
    expect(within(tiles()[0]!).queryByText(/Risk/)).toBeNull();
    const card = screen.getByRole("article", { name: "Storm Spirit" });
    expect(card).toHaveTextContent("Best of Your Heroes");
    expect(within(card).getByText("Weak Here")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Not This Game" })).toBeNull();
  });

  it("gives every tile a Picked button, copper only on the Best, and Banned on the open card", async () => {
    const onPicked = vi.fn();
    const onBanned = vi.fn();
    strip({ onPicked, onBanned });
    const picked = tiles().map((li) => within(li).getByRole("button", { name: /^Picked/ }));
    expect(picked.map((b) => b.getAttribute("aria-label"))).toEqual(["Picked Invoker", "Picked Ember Spirit", "Picked Puck"]);
    expect(picked.map((b) => b.classList.contains("btn-primary"))).toEqual([true, false, false]);
    await userEvent.click(picked[1]!);
    expect(onPicked).toHaveBeenCalledWith(106);
    await userEvent.click(within(tile("Puck")).getByRole("button", { name: /^Puck,/ }));
    await userEvent.click(screen.getByRole("button", { name: "Banned Puck" }));
    expect(onBanned).toHaveBeenCalledWith(13);
  });

  it("shows no actions to a player who can't change the draft", () => {
    strip();
    expect(screen.queryByRole("button", { name: /Picked|Banned/ })).toBeNull();
  });

  it("shows the hero from outside the pool as a tile in its own list, and the engine's line on its card", async () => {
    strip({
      picks: [{ ...picks[0]!, suggestion: suggestion(53, 1.2), verdict: undefined }],
      outsider: {
        entry: { suggestion: suggestion(74, 9.7), gain: null },
        text: "Scores 8.5 above Nature's Prophet, your best, more than the 1.9 the data could be off by.",
      },
    });
    expect(tiles()).toHaveLength(1);
    const [outside] = screen.getByRole("list", { name: "Hero from outside your pool" }).querySelectorAll<HTMLElement>(":scope > li");
    expect(within(outside!).getByText("Outside Pool")).toBeInTheDocument();
    await userEvent.click(within(outside!).getByRole("button", { name: /^Invoker,/ }));
    const card = screen.getByRole("article", { name: "Invoker" });
    expect(card).toHaveTextContent("Worth a Look from Outside Your Pool");
    expect(card).toHaveTextContent("Scores 8.5 above Nature's Prophet, your best, more than the 1.9 the data could be off by.");
    expect(card).not.toHaveTextContent("Best");
    // One hero only: no ladder to compare on.
    expect(screen.queryByRole("region", { name: "Score Ladder" })).toBeNull();
  });

  it("goes back to the Best pick's card when the open hero leaves the list", async () => {
    const { rerender } = strip();
    await userEvent.click(within(tile("Puck")).getByRole("button", { name: /^Puck,/ }));
    expect(screen.getByRole("article", { name: "Puck" })).toBeInTheDocument();
    rerender(
      <PickStrip
        head={<h2>Picks for Pos 2 Mid</h2>}
        picks={picks.filter((p) => p.suggestion.heroId !== 13)}
        reacting=""
        position={2}
        hero={hero}
        heroes={HEROES}
        enemies={[11, 14]}
      />,
    );
    expect(screen.getByRole("article", { name: "Invoker" })).toBeInTheDocument();
  });

  it("opens a pick with its number key and marks it Picked with Enter", async () => {
    const onPicked = vi.fn();
    strip({ onPicked, onBanned: vi.fn() });
    expect(screen.getByText(/Opens a Pick/)).toBeInTheDocument();
    await userEvent.keyboard("2");
    expect(screen.getByRole("article", { name: "Ember Spirit" })).toBeInTheDocument();
    expect(screen.getByText(/Picks Ember Spirit/)).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(onPicked).toHaveBeenCalledExactlyOnceWith(106);
    // Enter again does nothing: the key let go of the pick.
    await userEvent.keyboard("{Enter}");
    expect(onPicked).toHaveBeenCalledTimes(1);
  });

  it("needs a number key before Enter, and any other key or a click lets go", async () => {
    const onPicked = vi.fn();
    strip({ onPicked, onBanned: vi.fn() });
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("3{Escape}{Enter}");
    // A click opens the card but does not arm Enter.
    await userEvent.keyboard("2");
    await userEvent.click(within(tile("Puck")).getByRole("button", { name: /^Puck,/ }));
    (document.activeElement as HTMLElement).blur();
    await userEvent.keyboard("{Enter}");
    // A key with no tile behind it.
    await userEvent.keyboard("9{Enter}");
    expect(onPicked).not.toHaveBeenCalled();
    expect(screen.getByRole("article", { name: "Puck" })).toBeInTheDocument();
  });

  it("takes the keys from an empty hero box, never from typing", async () => {
    const onPicked = vi.fn();
    render(
      <>
        <input aria-label="Hero box" data-hero-box="" />
        <input aria-label="Match ID" />
      </>,
    );
    strip({ onPicked, onBanned: vi.fn() });
    const box = screen.getByRole("textbox", { name: "Hero box" });
    // An empty hero box: the digit opens the pick and is not typed; Enter marks it.
    await userEvent.type(box, "2");
    expect(box).toHaveValue("");
    expect(screen.getByRole("article", { name: "Ember Spirit" })).toBeInTheDocument();
    // Typing a hero with its position leaves the strip alone.
    await userEvent.type(box, "cm3");
    expect(box).toHaveValue("cm3");
    expect(screen.getByRole("article", { name: "Ember Spirit" })).toBeInTheDocument();
    await userEvent.clear(box);
    await userEvent.type(box, "3{Enter}");
    expect(onPicked).toHaveBeenCalledExactlyOnceWith(13);
    // Any other box keeps its digits.
    const other = screen.getByRole("textbox", { name: "Match ID" });
    await userEvent.type(other, "1{Enter}");
    expect(other).toHaveValue("1");
    expect(screen.getByRole("article", { name: "Puck" })).toBeInTheDocument();
    expect(onPicked).toHaveBeenCalledTimes(1);
  });

  it("leaves a digit alone when another control took it", async () => {
    render(
      <button onKeyDown={(e) => e.preventDefault()} aria-label="Position picker">
        1 2 3 4 5
      </button>,
    );
    strip();
    screen.getByRole("button", { name: "Position picker" }).focus();
    await userEvent.keyboard("2");
    expect(screen.getByRole("article", { name: "Invoker" })).toBeInTheDocument();
  });

  it("opens a pick by key for a player who can't change the draft, without Enter", async () => {
    strip();
    await userEvent.keyboard("3");
    expect(screen.getByRole("article", { name: "Puck" })).toBeInTheDocument();
    expect(screen.queryByText(/Picks Puck/)).toBeNull();
  });

  it("puts every listed hero on the Score Ladder", () => {
    strip();
    const ladder = screen.getByRole("region", { name: "Score Ladder" });
    expect(within(ladder).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Invoker+9.7",
      "Ember Spirit+3.9",
      "Puck+3.6",
      "Storm Spirit−3.4",
    ]);
  });

  it("shows the notices under the head", () => {
    strip({ notices: [<p key="n">No Mid Heroes Yet</p>] });
    expect(screen.getByText("No Mid Heroes Yet")).toBeInTheDocument();
  });
});
