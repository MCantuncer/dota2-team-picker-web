/**
 * What the Profile page says about the player's heroes, from the per-hero record OpenDota
 * keeps for the last six months (profiles.hero_stats). Pure: no network or database.
 */

export interface GamesWins {
  games: number;
  wins: number;
}

/** The period the record covers, as the sync reads it (backend `_shared/opendota.ts`). */
export const HERO_STATS_MONTHS = 6;
/** A hero needs this many games before it can be called best or worst. */
export const MIN_GAMES = 10;
/** Heroes listed in the table. */
export const LIST_SIZE = 10;

export interface HeroLine {
  heroId: number;
  games: number;
  wins: number;
  /** Win rate, 0 to 100, rounded. */
  won: number;
  /** Points above (or below) the player's own win rate over all heroes. */
  delta: number;
  /** Wins more (or fewer) than the player's average would have given in these games, rounded. */
  extraWins: number;
}

export interface HeroInsights {
  games: number;
  /** The player's win rate over all heroes, 0 to 100, rounded. */
  won: number;
  lines: HeroLine[];
  mostPlayed: HeroLine | null;
  /**
   * The hero that won the most games over the player's average (win rate gap times games), with
   * MIN_GAMES or more: a hero played a lot slightly above average beats one played little far above.
   */
  best: HeroLine | null;
  /** The hero that lost the most games under the player's average, the same way. */
  worst: HeroLine | null;
}

export type HeroSort = "games" | "won";

const isRecord = (v: unknown): v is GamesWins =>
  typeof v === "object" &&
  v !== null &&
  Number.isInteger((v as GamesWins).games) &&
  Number.isInteger((v as GamesWins).wins) &&
  (v as GamesWins).games > 0 &&
  (v as GamesWins).wins >= 0 &&
  (v as GamesWins).wins <= (v as GamesWins).games;

/** Reads hero_stats ({ "14": { games, wins } }), skipping odd entries. */
export function heroInsights(raw: unknown, sort: HeroSort = "games"): HeroInsights | null {
  if (typeof raw !== "object" || raw === null) return null;
  const records = Object.entries(raw as Record<string, unknown>).flatMap(([id, v]) =>
    /^\d+$/.test(id) && isRecord(v) ? [{ heroId: Number(id), games: v.games, wins: v.wins }] : [],
  );
  const games = records.reduce((n, r) => n + r.games, 0);
  if (games === 0) return null;
  const average = (100 * records.reduce((n, r) => n + r.wins, 0)) / games;
  const all: HeroLine[] = records.map((r) => {
    const rate = (100 * r.wins) / r.games;
    return {
      ...r,
      won: Math.round(rate),
      delta: Math.round(rate - average),
      extraWins: Math.round(((rate - average) * r.games) / 100),
    };
  });
  const byGames = [...all].sort((a, b) => b.games - a.games || b.wins - a.wins);
  const enough = byGames.filter((l) => l.games >= MIN_GAMES);
  const byRate = [...enough].sort((a, b) => b.wins / b.games - a.wins / a.games || b.games - a.games);
  const gain = (l: HeroLine) => (l.wins / l.games - average / 100) * l.games;
  const byGain = [...enough].sort((a, b) => gain(b) - gain(a));
  const best = byGain[0] && byGain[0].extraWins > 0 ? byGain[0] : null;
  const last = byGain.at(-1);
  const worst = last && last !== best && last.extraWins < 0 ? last : null;
  return {
    games,
    won: Math.round(average),
    lines: (sort === "won" ? byRate : byGames).slice(0, LIST_SIZE),
    mostPlayed: byGames[0] ?? null,
    best,
    worst,
  };
}

/** "+7" or "−5" (real minus sign), "±0" when even. */
export const signedPoints = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0");
