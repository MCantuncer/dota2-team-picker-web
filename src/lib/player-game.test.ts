import { describe, expect, it } from "vitest";
import { buildingName, clock, readGameDetail, readMatchId } from "./player-game";

const row = (over: Record<string, unknown> = {}) => ({
  match_id: 8100000001,
  hero_id: 114,
  position: 1,
  is_win: false,
  started_at: "2026-11-02T10:00:00Z",
  duration_s: 2045,
  status: "parsed",
  draft_id: null,
  summary: {
    card: {
      kills: 4,
      deaths: 7,
      assists: 3,
      goldPerMin: 512,
      xpPerMin: 600,
      lastHits: 240,
      denies: 11,
      netWorth: 17000,
      heroDamage: 21000,
      towerDamage: 900,
      heroHealing: 0,
      level: 22,
      teamfightShare: 0.334,
      benchmarks: { goldPerMin: 41.6, xpPerMin: 50, lastHitsPerMin: 45, heroDamagePerMin: 30 },
    },
    lastHitsAt10: 38,
    deniesAt10: 4,
    laneNetWorthDiffAt10: -820,
    deaths: [
      { time: 380, goldLost: 210, timeDead: 18, killerHeroId: 106, isKillerFromMid: true, buildingsLost: [] },
      { time: "late" },
      {
        time: 1500,
        goldLost: 600,
        timeDead: 52,
        killerHeroId: null,
        isKillerFromMid: null,
        buildingsLost: ["npc_dota_goodguys_tower2_mid", 5],
      },
    ],
  },
  findings: [
    {
      kind: "farm",
      tone: "strength",
      headline: "Strong farm",
      happened: ["84th percentile"],
      pattern: null,
      cost: null,
      change: null,
      matchIds: [1],
    },
    {
      kind: "early_deaths",
      tone: "problem",
      headline: "2 deaths before 10 minutes",
      happened: [],
      pattern: null,
      cost: "x",
      change: "Stay back",
      matchIds: [1],
    },
    { tone: "problem" },
  ],
  ...over,
});

describe("readGameDetail", () => {
  it("reads the numbers, lane, deaths and findings, skipping odd items", () => {
    const game = readGameDetail(row());
    expect(game?.kills).toBe(4);
    expect(game?.stats).toMatchObject({
      xpPerMin: 600,
      lastHits: 240,
      goldPerMinBeat: 42,
      heroDamageBeat: 30,
      level: 22,
      killShare: 33,
    });
    expect(game?.lane).toEqual({ lastHits: 38, denies: 4, netWorthDiff: -820 });
    expect(game?.deathList?.map((d) => [d.time, d.killerHeroId, d.isKillerFromMid, d.buildingsLost])).toEqual([
      [380, 106, true, []],
      [1500, null, false, ["npc_dota_goodguys_tower2_mid"]],
    ]);
    expect(game?.strengths.map((f) => f.headline)).toEqual(["Strong farm"]);
    expect(game?.problems.map((f) => f.change)).toEqual(["Stay back"]);
  });

  it("shows what it can for an unparsed game and keeps only a real draft id", () => {
    const game = readGameDetail(row({ status: "waiting_parse", summary: null, findings: null, draft_id: "not-a-uuid" }));
    expect([game?.lane, game?.deathList, game?.kills, game?.draftId]).toEqual([null, null, null, null]);
    expect(game?.strengths).toEqual([]);
    const linked = readGameDetail(row({ draft_id: "2b1c7f4e-0000-4000-8000-000000000001" }));
    expect(linked?.draftId).toBe("2b1c7f4e-0000-4000-8000-000000000001");
  });

  it("refuses a row without its main columns", () => {
    expect(readGameDetail(null)).toBeNull();
    expect(readGameDetail(row({ match_id: "1" }))).toBeNull();
  });
});

describe("helpers", () => {
  it("reads match ids from the URL", () => {
    expect([readMatchId("8100000001"), readMatchId("0"), readMatchId("12a"), readMatchId("99999999999999999999")]).toEqual([
      8100000001,
      null,
      null,
      null,
    ]);
  });

  it("names buildings and formats clock times", () => {
    expect(buildingName("npc_dota_goodguys_tower2_mid")).toBe("Tier 2 Mid Tower");
    expect(buildingName("npc_dota_badguys_range_rax_bot")).toBe("Bottom Ranged Barracks");
    expect(buildingName("npc_dota_goodguys_tower4")).toBe("Tier 4 Tower");
    expect(buildingName("npc_dota_goodguys_fort")).toBe("Ancient");
    expect([clock(380), clock(-30), clock(65)]).toEqual(["6:20", "-0:30", "1:05"]);
  });
});
