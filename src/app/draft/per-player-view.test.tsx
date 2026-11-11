import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PickFirst, PlannedSlot } from "@/lib/engine/plan";
import type { Suggestion } from "@/lib/engine/types";
import type { PlayerColumn } from "@/lib/per-player";
import { PerPlayerLane } from "./per-player-view";

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
const NAMES: Record<number, string> = {
  74: "Invoker",
  106: "Ember Spirit",
  129: "Mars",
  2: "Axe",
  42: "Wraith King",
  11: "Shadow Fiend",
  14: "Pudge",
  8: "Juggernaut",
};
const HEROES = Object.entries(NAMES).map(([id, name]) => ({ id: Number(id), name }));
const hero = (id: number) => ({ name: NAMES[id] ?? "", portrait: `${CDN}/${id}.png` });

function suggestion(heroId: number, score: number, extra: Partial<Suggestion> = {}): Suggestion {
  return {
    heroId,
    name: NAMES[heroId]!,
    score,
    error: 0.5,
    breakdown: { positionFit: 3, counter: 1.6, synergy: 0, meta: 1.8, teamNeeds: 0.7, comfort: 1.5, flex: 0, pickSafety: -0.4 },
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

const column = (over: Partial<PlayerColumn> & Pick<PlayerColumn, "playerId" | "position" | "suggestions">): PlayerColumn => ({
  weak: new Set(),
  risks: new Map(),
  played: new Set(),
  fromAll: null,
  outsider: null,
  ...over,
});

const mine = column({
  playerId: "me",
  position: 2,
  suggestions: [
    suggestion(74, 9.7, { reasons: ["Beats Shadow Fiend (+1.6, likely your lane) and Pudge (+0.7)"], tags: ["Favorite (+1.5)"] }),
    suggestion(106, 4, { place: { rank: 11, of: 49 } }),
  ],
});
const mars = suggestion(129, 11, { tags: ["Favorite (+1.5)"], place: { rank: 4, of: 47 } });
const emre = column({
  playerId: "emre",
  position: 3,
  suggestions: [mars, suggestion(2, 6, { place: { rank: 18, of: 47 } })],
  weak: new Set([2]),
  outsider: { pick: suggestion(42, 15.9), over: mars, gap: 4.9, margin: 3.6 },
});

const slot = (position: PlannedSlot["position"], heroId: number): PlannedSlot => ({
  position,
  heroId,
  name: NAMES[heroId]!,
  locked: false,
  inPool: true,
  reasons: [],
});
const pickFirst: PickFirst = {
  position: 2,
  heroId: 74,
  pickRate: 0.12,
  takenChance: 0.62,
  gap: 3.1,
  exposed: 0.4,
  reason: { kind: "meta", lead: "62%", text: "chance the enemy takes it; losing it costs the plan 3.1, showing it now costs 0.4" },
  counter: null,
};

function lane(props: Partial<Parameters<typeof PerPlayerLane>[0]> = {}) {
  return render(
    <PerPlayerLane
      head={<h2>Per Player</h2>}
      columns={[mine, emre]}
      names={{ me: "Can", emre: "Emre" }}
      myId="me"
      plan={{ slots: [slot(2, 74), slot(3, 129)], pickFirst }}
      draftKey="[]"
      hero={hero}
      heroes={HEROES}
      enemies={[11, 14]}
      {...props}
    />,
  );
}

describe("PerPlayerLane", () => {
  it("gives each player a section headed by their seat, the reader's with You, and the plan's hero for it", () => {
    lane();
    const you = screen.getByRole("region", { name: "You, Pos 2 Mid" });
    expect(within(you).getByText("You")).toBeInTheDocument();
    expect(you).toHaveTextContent("2 of Your Heroes");
    expect(within(you).getByTitle("The Team Plan's hero for this seat")).toHaveTextContent("Team Plan Invoker");

    const emreSection = screen.getByRole("region", { name: "Emre, Pos 3 Offlane" });
    expect(emreSection).toHaveTextContent("2 of Emre's Heroes");
    expect(within(emreSection).getByRole("list", { name: "Suggested heroes for Emre" }).querySelectorAll(":scope > li")).toHaveLength(2);
  });

  it("uses the My Picks cards: verdict, number-first reasons, chips and score parts", () => {
    lane();
    const invoker = screen.getByRole("article", { name: "Invoker" });
    expect(invoker).toHaveTextContent("+9.7");
    expect(invoker).toHaveTextContent("1st of 49 Mids");
    expect(invoker).toHaveTextContent("5.7 points ahead of Ember Spirit");
    expect(invoker).toHaveTextContent("+1.6 against Shadow Fiend (likely your lane)");
    expect(invoker).toHaveTextContent("+1.5 one of your heroes for this position");
    expect(invoker).toHaveTextContent("Score Parts");

    const ember = screen.getByRole("article", { name: "Ember Spirit" });
    expect(ember).toHaveTextContent("5.7 points behind Invoker");

    // Another player's reasons and chips are in their name.
    expect(screen.getByRole("article", { name: "Mars" })).toHaveTextContent("+1.5 one of Emre's heroes for this position");
    expect(within(screen.getByRole("article", { name: "Axe" })).getByText("Weak Here")).toHaveAttribute("title", expect.stringContaining("One of Emre's heroes"));
  });

  it("marks the plan's hero per seat and makes only the plan's Pick First copper", () => {
    lane({ onPicked: vi.fn(), onBanned: vi.fn() });
    const invoker = screen.getByRole("article", { name: "Invoker" });
    expect(within(invoker).getByText("Pick First")).toHaveClass("chip-accent");
    expect(within(invoker).getByText("Pick First")).toHaveAttribute("title", expect.stringContaining("62% chance the enemy takes it"));
    expect(within(invoker).getByText("In Team Plan")).not.toHaveClass("chip-accent");
    expect(within(screen.getByRole("article", { name: "Mars" })).getByText("In Team Plan")).toBeInTheDocument();
    expect(within(screen.getByRole("article", { name: "Axe" })).queryByText("In Team Plan")).toBeNull();

    expect(screen.getAllByText("Pick First")).toHaveLength(1);
    const copper = screen.getAllByRole("button", { name: /^Picked/ }).filter((b) => b.classList.contains("btn-primary"));
    expect(copper).toEqual([screen.getByRole("button", { name: "Picked Invoker" })]);
  });

  it("shows the proven outsider in its own list after the player's heroes, with the engine's line", () => {
    lane();
    const [outside] = screen.getByRole("list", { name: "Hero from outside Emre's pool" }).querySelectorAll<HTMLElement>(":scope > li");
    expect(outside).toHaveTextContent("Wraith King");
    expect(outside).toHaveTextContent("Worth a Look from Outside Emre's Pool");
    expect(outside).toHaveTextContent("Scores 4.9 above Mars, Emre's best, more than the 3.6 the data could be off by.");
    expect(within(outside!).getByText("Outside Pool")).toHaveAttribute("title", "Not one of Emre's heroes for this position");
    expect(screen.getByRole("list", { name: "Suggested heroes for Emre" })).not.toHaveTextContent("Wraith King");
    expect(screen.queryByRole("list", { name: "Hero from outside your pool" })).toBeNull();
  });

  it("sends Picked with the player's position and Banned with the hero", async () => {
    const onPicked = vi.fn();
    const onBanned = vi.fn();
    lane({ onPicked, onBanned });
    await userEvent.click(screen.getByRole("button", { name: "Picked Axe for Emre" }));
    expect(onPicked).toHaveBeenCalledWith(2, 3);
    await userEvent.click(screen.getByRole("button", { name: "Picked Wraith King for Emre" }));
    expect(onPicked).toHaveBeenCalledWith(42, 3);
    await userEvent.click(screen.getByRole("button", { name: "Banned Ember Spirit" }));
    expect(onBanned).toHaveBeenCalledWith(106);
  });

  it("labels a list of every hero and a hero the player has played from outside their pool", () => {
    lane({
      columns: [
        column({ playerId: "t1", position: 4, suggestions: [suggestion(8, 2)], fromAll: "none" }),
        column({ playerId: "emre", position: 3, suggestions: [mars, suggestion(2, 6)], played: new Set([2]) }),
      ],
      names: { t1: "Teammate", emre: "Emre" },
      plan: null,
      gamesOf: (playerId, heroId) => (playerId === "emre" && heroId === 2 ? 38 : null),
    });
    expect(within(screen.getByRole("region", { name: "Teammate, Pos 4 Soft Support" })).getByText("Any Hero")).toHaveAttribute(
      "title",
      "Teammate has no heroes for this position, so these are the best of every hero",
    );
    expect(screen.getByRole("region", { name: "Emre, Pos 3 Offlane" })).toHaveTextContent("1 of Emre's Heroes and 1 Played");
    expect(within(screen.getByRole("article", { name: "Axe" })).getByText("Outside Pool")).toHaveAttribute(
      "title",
      expect.stringContaining("Emre played it 38 times"),
    );
    expect(screen.queryByText("Pick First")).toBeNull();
    expect(screen.queryByText("In Team Plan")).toBeNull();
  });

  it("says so when everyone has a hero", () => {
    lane({ columns: [] });
    expect(screen.getByText("Everyone in the party has a hero.")).toBeInTheDocument();
  });
});
