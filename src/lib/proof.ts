import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * The Proof Page numbers, built once a day by the backend's refresh (services/engine/src/backtest/proof.ts) into
 * proof.json in the public hero-data bucket. Every rate is a share (0 to 1).
 */
export const PROOF_URL = `${SUPABASE_URL}/storage/v1/object/public/hero-data/proof.json`;

/** Picks in a suggester's top 3 against the rest: their win rates and the lift between them with its 95% margin. */
export interface Lift {
  top3: { picks: number; won: number };
  other: { picks: number; won: number };
  lift: number | null;
  margin: number | null;
}

export type Rival = "engine" | "meta" | "popular";

export interface ProofExample {
  matchId: number;
  startTime: number;
  rankTier: number | null;
  heroId: number;
  position: number;
  round: 0 | 1 | 2;
  won: boolean;
}

/** The win range bands (Radiant's edge, all 10 heroes) and how each did on newer games. */
export interface ProofWinRange {
  games: number;
  bands: { games: number; won: number; low: number; high: number }[];
  check?: { games: number; won: number }[];
}

export interface Proof {
  computedAt: string;
  from: string;
  to: string;
  games: number;
  picks: number;
  rivals: Record<Rival, Lift & { hitTop8: number }>;
  running: { day: string; games: number; lift: number; margin: number }[];
  byRank: Record<string, Lift>;
  byRole: Record<string, Lift>;
  byRound: Record<string, Lift>;
  examples: ProofExample[];
  winRange?: ProofWinRange | null;
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isLift = (x: unknown): x is Lift =>
  isRecord(x) &&
  isRecord(x.top3) &&
  isRecord(x.other) &&
  typeof x.top3.won === "number" &&
  typeof x.other.won === "number";

/** True when `x` has the shape the page reads; anything else is not shown. */
export function isProof(x: unknown): x is Proof {
  if (!isRecord(x) || !isRecord(x.rivals) || !isRecord(x.byRank) || !isRecord(x.byRole)) return false;
  return (
    typeof x.games === "number" &&
    typeof x.picks === "number" &&
    typeof x.from === "string" &&
    typeof x.to === "string" &&
    (["engine", "meta", "popular"] as const).every((r) => isLift((x.rivals as Record<string, unknown>)[r])) &&
    Object.values(x.byRank).every(isLift) &&
    Object.values(x.byRole).every(isLift) &&
    Array.isArray(x.running) &&
    Array.isArray(x.examples)
  );
}

/** The published numbers, cached for an hour; null when there are none yet or they do not have the expected shape. */
export async function getProof(): Promise<Proof | null> {
  const res = await fetch(PROOF_URL, { next: { revalidate: 3600 } });
  // Supabase Storage answers 400 for an object that does not exist.
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Proof numbers download failed (${res.status})`);
  const data: unknown = await res.json();
  return isProof(data) ? data : null;
}

/** A share as points with one decimal and a sign: 0.079 is "+7.9", -0.012 is "−1.2" (a real minus sign). */
export function signedPoints(share: number): string {
  const points = Math.round(share * 1000) / 10;
  if (points === 0) return "0.0";
  return `${points > 0 ? "+" : "−"}${Math.abs(points).toFixed(1)}`;
}

/**
 * The Proof Page's title: the answer to "Do our picks win?", from the lift and its 95% margin. It says yes or no only
 * when the whole range is on one side of zero; a range that crosses zero is too close to call.
 */
export function proofVerdict({ lift, margin }: Pick<Lift, "lift" | "margin">): string {
  if (lift === null || margin === null) return "Too Few Games to Say Yet";
  const size = signedPoints(Math.abs(lift)).replace("+", "");
  if (lift - margin > 0) return `Yes, by ${size} Points`;
  if (lift + margin < 0) return `No, by ${size} Points`;
  return "Too Close to Call";
}

/** A share as a percentage with one decimal: 0.57 is "57.0%". */
export function percent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

/** A UTC day ("2026-11-15") as "Nov 15". */
export function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** One row of the win chance check, from the favourite's side: the range we show and what that side won later. */
export interface LadderRow {
  side: "Radiant" | "Dire";
  low: number;
  high: number;
  won: number;
  games: number;
}

/** Newer games a band needs before its row is shown, the same bar the backend's check uses. */
export const LADDER_MIN_GAMES = 300;

/**
 * The win range bands as ladder rows, each seen from the side the band favours (Radiant when it won half or more),
 * weakest favourite first. Bands without enough newer games are left out.
 */
export function ladderRows(range: ProofWinRange | null | undefined): LadderRow[] {
  if (!range?.check) return [];
  const rows: LadderRow[] = [];
  range.bands.forEach((band, i) => {
    const check = range.check?.[i];
    if (!check || check.games < LADDER_MIN_GAMES) return;
    if (band.won >= 0.5)
      rows.push({
        side: "Radiant",
        low: band.low,
        high: band.high,
        won: check.won,
        games: check.games,
      });
    else
      rows.push({
        side: "Dire",
        low: 1 - band.high,
        high: 1 - band.low,
        won: 1 - check.won,
        games: check.games,
      });
  });
  return rows.sort((a, b) => a.low - b.low);
}

/** The round a pick was made in, as the page names it. */
export const ROUND_NAMES = ["First Round", "Second Round", "Last Round"] as const;

/** Rank groups as the medals they cover: "1" is Herald and Guardian, ... "4" is Divine and Immortal. */
export const RANK_GROUP_MEDALS: Record<string, [number, number]> = {
  "1": [1, 2],
  "2": [3, 4],
  "3": [5, 6],
  "4": [7, 8],
};
