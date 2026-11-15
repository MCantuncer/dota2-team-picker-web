import type { Lift, Proof } from "@/lib/proof";

/** A Proof Page file like the published one, for tests. */
const lift = (top: number, other: number): Lift => ({
  top3: { picks: 100, won: top },
  other: { picks: 900, won: other },
  lift: top - other,
  margin: 0.02,
});

export function sampleProof(over: Partial<Proof> = {}): Proof {
  return {
    computedAt: "2026-11-15T02:30:00Z",
    from: "2026-10-31",
    to: "2026-11-15",
    games: 2020,
    picks: 20200,
    rivals: {
      engine: { ...lift(0.57, 0.491), hitTop8: 0.25 },
      meta: { ...lift(0.542, 0.496), hitTop8: 0.22 },
      popular: { ...lift(0.512, 0.497), hitTop8: 0.42 },
    },
    running: [
      { day: "2026-11-03", games: 269, lift: 0.085, margin: 0.064 },
      { day: "2026-11-15", games: 2020, lift: 0.079, margin: 0.022 },
    ],
    byRank: { "1": lift(0.6, 0.5), "3": lift(0.55, 0.48) },
    byRole: { "1": lift(0.58, 0.5), "5": lift(0.53, 0.49) },
    byRound: { "0": lift(0.55, 0.5) },
    examples: [
      { matchId: 9091082013, startTime: 1794733722, rankTier: 75, heroId: 13, position: 2, round: 2, won: true },
    ],
    winRange: null,
    ...over,
  };
}
