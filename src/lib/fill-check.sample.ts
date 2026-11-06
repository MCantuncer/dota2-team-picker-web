/** A dry run answer for tests, shaped like the backend's DryRunReport. */
export const sampleReport = () => ({
  accountId: 1001,
  lookbackDays: 180,
  sources: {
    stratz: { status: "ok", games: 640, pages: 7 },
    openDota: { status: "ok", games: 700 },
    drafts: { status: "ok", games: 3 },
    benchmarks: { cached: 10, fetched: 4, missing: 0 },
  },
  coverage: { games: 710, positioned: 650, positionedShare: 0.915, bySource: { stratz: 630, opendota: 18, draft: 2, none: 60 } },
  verdict: "go",
  strong: { 1: { imp: { judged: 200, strong: 70 }, stats: { judged: 0, strong: 0 } } },
  fill: {
    state: "ok",
    games: 710,
    positionedGames: 650,
    gamesByPosition: { 1: 300, 2: 200, 3: 0, 4: 60, 5: 90 },
    positions: [1, 2, 4, 5],
    picks: [
      { heroId: 94, position: 1, kind: "regular", games: 55, wins: 26, strongGames: 20, judgedGames: 50, lastPlayed: 1_793_900_000, gamesNeeded: 12 },
    ],
    nearMisses: [
      { heroId: 1, position: 1, games: 18, wins: 8, strongGames: 5, judgedGames: 18, lastPlayed: 1_793_000_000, gamesNeeded: 19, why: "18 of 19 games" },
    ],
  },
});
