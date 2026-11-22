import type {
  SimilarGame,
  SimilarHeroAnswer,
  SimilarLane,
  SimilarSeat,
} from "@/lib/engine/similar-games";
import type { Position } from "@/lib/engine/types";

/**
 * The live Similar Games lookup for a finished draft: real high-rank games of one of our heroes against this
 * draft's enemies, from the similar-games edge function. The function searches once for all five of our heroes and
 * reads the asked hero's games first; the engine (similar-games.ts) builds the answer the page shows.
 */

export interface SimilarRequest {
  ours: { hero: number; position: number }[];
  enemies: number[];
  /** The heroes whose games to read now: the open tab's hero. */
  heroes: number[];
}

/** Why an answer is short or still pending, as the function says it. */
export type SimilarReason =
  | "user-limit"
  | "budget"
  | "searching-elsewhere"
  | "stratz-busy"
  | "failed"
  | "time";

export interface SimilarLookupAnswer {
  heroes: SimilarHeroAnswer[];
  reasons: SimilarReason[];
  /** Seconds until asking again may fill what is pending. */
  retryIn?: number;
}

/**
 * The request for one of our heroes in a finished draft (picks by position, index 0 = pos 1), or null when the
 * draft isn't finished or the hero isn't ours. Enemies are sorted so their order alone doesn't make a new request.
 */
export function similarRequest(
  picks: (number | null)[],
  enemies: number[],
  hero: number,
): SimilarRequest | null {
  if (picks.length !== 5 || enemies.length !== 5) return null;
  const ours = picks.flatMap((h, i) =>
    h == null ? [] : [{ hero: h, position: i + 1 }],
  );
  if (ours.length !== 5 || !ours.some((o) => o.hero === hero)) return null;
  return { ours, enemies: [...enemies].sort((a, b) => a - b), heroes: [hero] };
}

const REASONS = new Set<string>([
  "user-limit",
  "budget",
  "searching-elsewhere",
  "stratz-busy",
  "failed",
  "time",
]);
const LANES = new Set<string>(["safe", "mid", "off", "jungle"]);
const isInt = (v: unknown, min = 0): v is number =>
  Number.isSafeInteger(v) && (v as number) >= min;
const isHero = (v: unknown): v is number => isInt(v, 1) && (v as number) < 1000;
const isPosition = (v: unknown): v is Position | null =>
  v === null || (isInt(v, 1) && (v as number) <= 5);
const isLane = (v: unknown): v is SimilarLane | null =>
  v === null || (typeof v === "string" && LANES.has(v));
const isPairs = (
  v: unknown,
  second: (x: unknown) => boolean,
): v is [number, number][] =>
  Array.isArray(v) &&
  v.every(
    (p) => Array.isArray(p) && p.length === 2 && isInt(p[0]) && second(p[1]),
  );

function isSeat(v: unknown): v is SimilarSeat {
  const s = v as Partial<SimilarSeat> | null;
  return !!s && isHero(s.hero) && isPosition(s.position) && isLane(s.lane);
}

function isGame(v: unknown): v is SimilarGame {
  const g = v as Partial<SimilarGame> | null;
  if (!g || typeof g.won !== "boolean") return false;
  const counts = [
    g.match,
    g.startTime,
    g.duration,
    g.sharedEnemies,
    g.sharedAllies,
    g.kills,
    g.deaths,
    g.assists,
  ];
  return (
    counts.every((n) => isInt(n)) &&
    Number.isFinite(g.networth) &&
    (g.lastHits10 === null || isInt(g.lastHits10)) &&
    isPosition(g.position) &&
    isLane(g.lane) &&
    isPairs(g.buys, isInt) &&
    isPairs(g.deathsAt, (x) => x === null || isHero(x)) &&
    Array.isArray(g.allies) &&
    g.allies.length === 5 &&
    g.allies.every(isSeat) &&
    Array.isArray(g.enemies) &&
    g.enemies.length === 5 &&
    g.enemies.every(isSeat)
  );
}

function isHeroAnswer(v: unknown): v is SimilarHeroAnswer {
  const h = v as Partial<SimilarHeroAnswer> | null;
  return (
    !!h &&
    isHero(h.hero) &&
    (h.level === 3 || h.level === 2 || h.level === null) &&
    isInt(h.found) &&
    typeof h.pending === "boolean" &&
    Array.isArray(h.games) &&
    h.games.every(isGame)
  );
}

/** The function's answer checked field by field, or null when any of it is off (never a partial answer). */
export function readSimilarAnswer(data: unknown): SimilarLookupAnswer | null {
  const a = data as {
    heroes?: unknown;
    reasons?: unknown;
    retryIn?: unknown;
  } | null;
  if (!a || !Array.isArray(a.heroes) || !a.heroes.every(isHeroAnswer))
    return null;
  if (
    !Array.isArray(a.reasons) ||
    !a.reasons.every((r) => typeof r === "string" && REASONS.has(r))
  )
    return null;
  if (a.retryIn !== undefined && !isInt(a.retryIn)) return null;
  return {
    heroes: a.heroes,
    reasons: a.reasons as SimilarReason[],
    ...(a.retryIn !== undefined && { retryIn: a.retryIn }),
  };
}

/** Asking again waits at least this long. */
export const MIN_RETRY_MS = 3_000;
/** A wait further out than this isn't taken: the viewer has likely moved on. */
export const MAX_RETRY_MS = 30 * 60 * 1000;

/**
 * How long to wait before asking again for the hero's games, or null when asking again won't help: nothing is
 * pending, or the user's hourly lookups, the shared budget or a failure stopped it.
 */
export function similarRetryIn(
  answer: SimilarLookupAnswer,
  hero: number,
): number | null {
  const mine = answer.heroes.find((h) => h.hero === hero);
  const waiting = mine
    ? mine.pending
    : answer.reasons.includes("searching-elsewhere");
  if (
    !waiting ||
    answer.reasons.some(
      (r) => r === "user-limit" || r === "budget" || r === "failed",
    )
  )
    return null;
  const wait = (answer.retryIn ?? 0) * 1000;
  return wait > MAX_RETRY_MS ? null : Math.max(wait, MIN_RETRY_MS);
}
