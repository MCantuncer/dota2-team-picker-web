import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GameDetail } from "@/lib/player-game";
import { GameView } from "./game-view";

const game = (over: Partial<GameDetail> = {}): GameDetail => ({
  matchId: 8100000001,
  heroId: 114,
  position: 1,
  isWin: false,
  startedAt: "2026-11-02T10:00:00Z",
  durationS: 2045,
  status: "parsed",
  kills: 4,
  deaths: 7,
  assists: 3,
  goldPerMin: 512,
  note: null,
  stats: {
    xpPerMin: 600,
    lastHits: 240,
    denies: 11,
    netWorth: 17000,
    heroDamage: 21000,
    towerDamage: 900,
    heroHealing: 0,
    level: 22,
    killShare: 33,
    goldPerMinBeat: 42,
    heroDamageBeat: null,
  },
  lane: { lastHits: 38, denies: 4, netWorthDiff: -820 },
  deathList: [
    { time: 380, goldLost: 210, timeDead: 18, killerHeroId: 106, isKillerFromMid: true, buildingsLost: [] },
    {
      time: 1500,
      goldLost: 600,
      timeDead: 52,
      killerHeroId: null,
      isKillerFromMid: false,
      buildingsLost: ["npc_dota_goodguys_tower2_mid"],
    },
  ],
  strengths: [],
  problems: [
    {
      kind: "early_deaths",
      tone: "problem",
      headline: "2 deaths before 10 minutes",
      happened: ["died at 6:20 to Ember Spirit"],
      pattern: null,
      cost: "810 gold lost and 70 seconds dead.",
      change: "Keep a Town Portal Scroll.",
      matchIds: [8100000001],
    },
  ],
  draftId: null,
  ...over,
});
const heroes = new Map([
  [114, { name: "Monkey King" }],
  [106, { name: "Ember Spirit" }],
]);

describe("GameView", () => {
  it("shows the result, numbers, points to fix, lane and deaths", () => {
    render(<GameView game={game()} heroes={heroes} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Monkey King");
    expect(screen.getByText("Lost")).toBeTruthy();
    expect(screen.getByText(/Pos 1 Carry/).textContent).toMatch(/Pos 1 Carry\s*\|\s*2 Nov 2026\s*\|\s*34:05/);
    const numbers = screen.getByRole("region", { name: "Numbers" }).textContent;
    expect(numbers).toContain("Better than 42% of Monkey King games");
    expect(numbers).toContain("In 33% of your team's kills");
    expect(numbers).not.toContain("Healing");
    const fix = screen.getByRole("region", { name: "To Fix" });
    expect(fix.textContent).toContain("Keep a Town Portal Scroll.");
    // Nothing went well in this game, so that side is left out instead of an empty box.
    expect(screen.queryByRole("region", { name: "Went Well" })).toBeNull();
    expect(screen.getByRole("region", { name: "Lane at 10 Minutes" }).textContent).toContain("820 net worth behind");
    const deaths = screen.getByRole("region", { name: /Deaths/ });
    expect(deaths.textContent).toContain("810 gold lost and 1:10 dead");
    expect(deaths.textContent).toContain("Ember SpiritRotation from Mid");
    expect(deaths.textContent).toContain("Creeps or a tower");
    expect(screen.getByRole("img", { name: "2 deaths on the game clock, 1 of them before 10 minutes" })).toBeTruthy();
    expect(deaths.textContent).toContain("Lost while dead: Tier 2 Mid Tower");
    expect(screen.queryByRole("link", { name: "Party Report" })).toBeNull();
  });

  it("explains a game OpenDota hasn't parsed and links the party report", () => {
    render(
      <GameView
        game={game({
          status: "waiting_parse",
          lane: null,
          deathList: null,
          problems: [],
          draftId: "2b1c7f4e-0000-4000-8000-000000000001",
        })}
        heroes={heroes}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("OpenDota hasn't parsed this game yet");
    expect(screen.queryByRole("region", { name: "To Fix" })).toBeNull();
    expect(screen.queryByRole("region", { name: /Deaths/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Party Report" }).getAttribute("href")).toBe(
      "/reports/2b1c7f4e-0000-4000-8000-000000000001",
    );
  });
});
