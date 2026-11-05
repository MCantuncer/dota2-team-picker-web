/**
 * What the Profile page says about the player's heroes, from what the profile sync saves from
 * OpenDota: per-hero totals for six months in profiles.hero_stats, and the same six months game
 * by game in profiles.hero_games, which shorter periods are counted from. Pure: no network or
 * database.
 */

export interface GamesWins {
  games: number;
  wins: number;
}

/** The periods the Profile can show. Six months is as far back as the sync reads. */
export const PERIODS = [
  { days: 7, label: "Week", words: "the last 7 days", minGames: 3 },
  { days: 30, label: "Month", words: "the last 30 days", minGames: 5 },
  { days: 90, label: "3 Months", words: "the last 3 months", minGames: 8 },
  { days: 180, label: "6 Months", words: "the last 6 months", minGames: 10 },
] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = PERIODS[3];

/** The period in `?period=`, or six months. */
export function readPeriod(value: unknown): Period {
  return PERIODS.find((p) => String(p.days) === value) ?? DEFAULT_PERIOD;
}

const DAY_SECONDS = 24 * 60 * 60;

/**
 * The per-hero record for a period, shaped like hero_stats. Six months is hero_stats itself;
 * a shorter period is counted from hero_games ([hero id, won 1 or 0, start time in Unix
 * seconds] per game). Undefined while hero_games has not been saved yet: it is empty but
 * hero_stats has games.
 */
export function recordFor(period: Period, heroStats: unknown, heroGames: unknown, now: number = Date.now()): unknown {
  if (period.days === DEFAULT_PERIOD.days) return heroStats;
  const games = Array.isArray(heroGames) ? heroGames : [];
  if (games.length === 0 && heroInsights(heroStats) !== null) return undefined;
  const since = now / 1000 - period.days * DAY_SECONDS;
  const record: Record<string, GamesWins> = {};
  for (const game of games) {
    if (!Array.isArray(game)) continue;
    const [heroId, won, startTime] = game as unknown[];
    if (typeof heroId !== "number" || typeof startTime !== "number" || startTime < since) continue;
    const line = (record[String(heroId)] ??= { games: 0, wins: 0 });
    line.games += 1;
    if (won === 1) line.wins += 1;
  }
  return record;
}

/** A hero needs this many games in six months before it can be called best or worst. */
export const MIN_GAMES = DEFAULT_PERIOD.minGames;
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
export function heroInsights(raw: unknown, sort: HeroSort = "games", minGames: number = MIN_GAMES): HeroInsights | null {
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
  const enough = byGames.filter((l) => l.games >= minGames);
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
