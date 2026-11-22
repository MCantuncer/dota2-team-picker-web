import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { SimilarSummary, WonTarget } from "@/lib/engine/similar-games";
import type { ItemInfo } from "@/lib/engine/types";
import { GAME } from "@/lib/similar-games.sample";
import { ItemCardProvider } from "./item-card";
import { readTicks, SimilarGamesAnswer, SimilarPreview, similarPreviewText, targetTitle, type SimilarView } from "./similar-games-answer";

const ITEMS: Record<string, ItemInfo> = {
  "223": { key: "meteor_hammer", name: "Meteor Hammer", cost: 2850, img: "/m.png", components: [1] },
};
const heroName = (id: number) => ({ 74: "Invoker", 11: "Shadow Fiend", 14: "Pudge" })[id] ?? `Hero ${id}`;
const deaths: WonTarget = { kind: "deaths", most: 3, minute: 20, met: { games: 24, wins: 24 }, missed: { games: 21, wins: 12 }, p: 0.001 };
const meteor: WonTarget = { kind: "item", item: 223, minute: 11, met: { games: 30, wins: 28 }, missed: { games: 12, wins: 5 }, p: 0.004 };

function summary(over: Partial<SimilarSummary> = {}): SimilarSummary {
  return {
    hero: 74,
    level: 3,
    found: 140,
    games: 45,
    wins: 36,
    enemies: [
      { hero: 14, games: 30, wins: 27 },
      { hero: 11, games: 21, wins: 21 },
    ],
    usualBuild: [{ item: 223, minute: 11, games: 40 }],
    closest: [GAME, { ...GAME, match: 2 }, { ...GAME, match: 3, won: false }],
    whatWon: [meteor, deaths],
    pending: false,
    ...over,
  };
}
const ready = (s: SimilarSummary | null, pending = false): SimilarView => ({
  state: { kind: "ready", answer: { hero: 74, level: 3, found: 140, games: [GAME], pending }, reasons: [] },
  summary: s,
});

function show(view: SimilarView | null) {
  return render(
    <ItemCardProvider items={ITEMS}>
      <SimilarGamesAnswer
        view={view}
        position={2}
        heroName={heroName}
        icons={{}}
        items={ITEMS}
        allies={[8, 128, 129, 5]}
        laneEnemy={11}
        draftKey="d1"
      />
    </ItemCardProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe("SimilarPreview", () => {
  it("shows the record and the closest games' results", () => {
    const { container } = render(<SimilarPreview view={ready(summary())} />);
    expect(container.textContent).toContain("36 of 45");
    expect(container.querySelectorAll(".bg-radiant")).toHaveLength(2);
    expect(container.querySelectorAll(".bg-dire")).toHaveLength(1);
    expect(similarPreviewText(ready(summary()))).toBe("36 of 45 similar games won.");
  });

  it("says why there is no record", () => {
    expect(similarPreviewText(null)).toBe("Looking up games.");
    expect(similarPreviewText({ state: { kind: "sign-in" }, summary: null })).toBe("Sign in to see games.");
    expect(similarPreviewText(ready(null))).toBe("Too few games yet.");
  });
});

describe("SimilarGamesAnswer", () => {
  it("shows the record, each enemy's count with the lane enemy marked, and the usual build", () => {
    show(ready(summary()));
    expect(screen.getByText("36")).toBeTruthy();
    expect(screen.getByText("of 45 Won")).toBeTruthy();
    expect(screen.getByText(/Invoker as Mid against 3 or more of these enemies/)).toBeTruthy();
    const counts = screen.getByRole("list", { name: "Won with each enemy in the game" });
    expect(counts.textContent).toBe("27of 3021of 21Lane");
    expect(screen.getByRole("button", { name: "Meteor Hammer" })).toBeTruthy();
  });

  it("lists the targets to tick, and keeps the ticks for this draft and hero", () => {
    const { unmount } = show(ready(summary()));
    const box = screen.getByRole("checkbox", { name: "Meteor Hammer by 11 Min" });
    expect(screen.getByRole("checkbox", { name: "Die 3 Times or Less by 20 Min" })).toBeTruthy();
    expect(screen.getByText("28 of 30")).toBeTruthy();
    fireEvent.click(box);
    expect(readTicks("similar-ticks:d1:74")).toEqual(["item-223-11"]);
    unmount();
    show(ready(summary()));
    expect((screen.getByRole("checkbox", { name: "Meteor Hammer by 11 Min" }) as HTMLInputElement).checked).toBe(true);
  });

  it("says when What Won is waiting or found nothing", () => {
    const { rerender } = show(ready(summary({ whatWon: null, games: 15, pending: false })));
    expect(screen.getByText("Needs 20 games in this role, 15 so far.")).toBeTruthy();
    rerender(
      <SimilarGamesAnswer
        view={ready(summary({ whatWon: [] }))}
        position={2}
        heroName={heroName}
        icons={{}}
        items={ITEMS}
        allies={[8, 128, 129, 5]}
        laneEnemy={null}
        draftKey="d1"
      />,
    );
    expect(screen.getByText(/No item timing or death count in these 45 games/)).toBeTruthy();
    expect(screen.queryByText("Lane")).toBeNull();
  });

  it("says why there is no answer", () => {
    const { rerender } = show(null);
    expect(screen.getByText("Looking up similar games…")).toBeTruthy();
    const again = (view: SimilarView) =>
      rerender(
        <SimilarGamesAnswer
          view={view}
          position={2}
          heroName={heroName}
          icons={{}}
          items={ITEMS}
          allies={[8, 128, 129, 5]}
          laneEnemy={11}
          draftKey="d1"
        />,
      );
    again({ state: { kind: "unavailable", reason: "limit" }, summary: null });
    expect(screen.getByText("Too many lookups for now. Try again in a while.")).toBeTruthy();
    again(ready(null, true));
    expect(screen.getByText(/Too few Divine and up Invoker games as Mid.*More games are still being read/)).toBeTruthy();
  });
});

describe("targetTitle", () => {
  it("names items and death counts in Title Case", () => {
    expect(targetTitle(meteor, ITEMS)).toBe("Meteor Hammer by 11 Min");
    expect(targetTitle({ ...deaths, most: 1 })).toBe("Die 1 Time or Less by 20 Min");
    expect(targetTitle({ ...deaths, most: 0 })).toBe("No Deaths by 20 Min");
  });

  it("reads no ticks from storage holding something else", () => {
    localStorage.setItem("k", '{"a":1}');
    expect(readTicks("k")).toEqual([]);
    localStorage.setItem("k", "not json");
    expect(readTicks("k")).toEqual([]);
  });
});
