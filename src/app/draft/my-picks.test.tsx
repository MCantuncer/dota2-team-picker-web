import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Suggestion } from "@/lib/engine/types";
import type { Verdict } from "@/lib/engine/verdict";
import { MyPicksLane, type PickEntry } from "./my-picks";

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
const NAMES: Record<number, string> = {
  74: "Invoker",
  106: "Ember Spirit",
  13: "Puck",
  11: "Shadow Fiend",
  14: "Pudge",
  8: "Juggernaut",
  53: "Nature's Prophet",
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
  { suggestion: suggestion(13, 3.6, { place: { rank: 14, of: 49 } }), isWeak: true, playedGames: 38, gain: null },
];

function lane(props: Partial<Parameters<typeof MyPicksLane>[0]> = {}) {
  return render(
    <MyPicksLane
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

describe("MyPicksLane", () => {
  it("lists every pick, the Best first with its label, seat, score and the Reacting To line", () => {
    lane();
    expect(screen.getByRole("list", { name: "Suggested heroes" }).querySelectorAll(":scope > li")).toHaveLength(3);
    const best = screen.getByRole("article", { name: "Invoker" });
    expect(best).toHaveTextContent("Clear Best Pick");
    expect(best).toHaveTextContent("Pos 2 Mid");
    expect(best).toHaveTextContent("+9.7");
    expect(best).toHaveTextContent("1st of 49 Mids");
    expect(best).toHaveTextContent("5.8 points ahead of Ember Spirit, more than the 2.9 the data could be off by");
    expect(best).toHaveTextContent("Reacting to Pudge and Shadow Fiend");
  });

  it("writes each reason number first, one line per hero", () => {
    lane();
    const best = screen.getByRole("article", { name: "Invoker" });
    expect(within(best).getByText("+1.6")).toBeInTheDocument();
    expect(best).toHaveTextContent("+1.6 against Shadow Fiend (likely your lane)");
    expect(best).toHaveTextContent("+0.7 against Pudge");
    expect(best).toHaveTextContent("+1.5 one of your heroes for this position");
  });

  it("gives the other picks their verdict against the Best, chips, gain and risks", () => {
    lane();
    const ember = screen.getByRole("article", { name: "Ember Spirit" });
    expect(ember).toHaveTextContent("5.8 points behind Invoker: 2.9 worse against Shadow Fiend");
    expect(within(ember).getByText("Up 1")).toBeInTheDocument();
    expect(ember).toHaveTextContent("+1.2% win chance");
    expect(ember).toHaveTextContent("−6.7 if they pick Juggernaut, a hard counter still open");
    expect(ember).toHaveTextContent("+3.5 From This Draft, +6.3 From Meta, Role and Comfort");

    const puck = screen.getByRole("article", { name: "Puck" });
    expect(within(puck).getByText("Weak Here")).toBeInTheDocument();
    expect(within(puck).getByText("Outside Pool")).toHaveAttribute("title", expect.stringContaining("You played it 38 times"));
    expect(puck).not.toHaveTextContent("win chance");
  });

  it("says Best of Your Heroes when the best is weak here", () => {
    lane({ picks: [{ ...picks[0]!, isWeak: true }, picks[1]!] });
    expect(screen.getByRole("article", { name: "Invoker" })).toHaveTextContent("Best of Your Heroes");
  });

  it("makes only the Best pick's Picked copper and sends Picked and Banned with the hero", async () => {
    const onPicked = vi.fn();
    const onBanned = vi.fn();
    lane({ onPicked, onBanned });
    const picked = screen.getAllByRole("button", { name: /^Picked/ });
    expect(picked).toHaveLength(3);
    expect(picked.filter((b) => b.classList.contains("btn-primary"))).toEqual([screen.getByRole("button", { name: "Picked Invoker" })]);
    await userEvent.click(screen.getByRole("button", { name: "Picked Ember Spirit" }));
    expect(onPicked).toHaveBeenCalledWith(106);
    await userEvent.click(screen.getByRole("button", { name: "Banned Puck" }));
    expect(onBanned).toHaveBeenCalledWith(13);
  });

  it("shows no actions to a player who can't change the draft", () => {
    lane();
    expect(screen.queryByRole("button", { name: /Picked|Banned/ })).toBeNull();
  });

  it("shows the hero from outside the pool in its own list with the engine's line", () => {
    lane({
      picks: [{ ...picks[0]!, suggestion: suggestion(53, 1.2), verdict: undefined }],
      outsider: {
        entry: { suggestion: suggestion(74, 9.7), gain: null },
        text: "Scores 8.5 above Nature's Prophet, your best, more than the 1.9 the data could be off by.",
      },
    });
    const [outside] = screen.getByRole("list", { name: "Hero from outside your pool" }).querySelectorAll<HTMLElement>(":scope > li");
    expect(within(outside!).getByText("Outside Pool")).toBeInTheDocument();
    expect(outside).toHaveTextContent("Worth a Look from Outside Your Pool");
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "Scores 8.5 above Nature's Prophet, your best, more than the 1.9 the data could be off by."),
    ).toBeInTheDocument();
    // One hero only: no ladder to compare on.
    expect(screen.queryByRole("region", { name: "Score Ladder" })).toBeNull();
  });

  it("puts every listed hero on the Score Ladder", () => {
    lane();
    const ladder = screen.getByRole("region", { name: "Score Ladder" });
    expect(within(ladder).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Invoker+9.7", "Ember Spirit+3.9", "Puck+3.6"]);
  });

  it("shows the notices under the head", () => {
    lane({ notices: [<p key="n">No Mid Heroes Yet</p>] });
    expect(screen.getByText("No Mid Heroes Yet")).toBeInTheDocument();
  });
});
