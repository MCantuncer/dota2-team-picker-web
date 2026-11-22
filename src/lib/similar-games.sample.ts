import type { SimilarGame, SimilarSeat } from "@/lib/engine/similar-games";

const seat = (hero: number): SimilarSeat => ({
  hero,
  position: 1,
  lane: "safe",
});
/** A real similar game (Invoker mid, match 9099898435), as the similar-games function answers it, for tests. */
export const GAME: SimilarGame = {
  match: 9099898435,
  won: true,
  startTime: 1795040000,
  duration: 2427,
  sharedEnemies: 4,
  sharedAllies: 1,
  position: 2,
  lane: "mid",
  kills: 11,
  deaths: 2,
  assists: 9,
  networth: 24150,
  lastHits10: 37,
  buys: [[717, 223]],
  deathsAt: [
    [349, 2],
    [1500, null],
  ],
  allies: [74, 8, 128, 129, 5].map(seat),
  enemies: [11, 14, 26, 2, 44].map(seat),
};
