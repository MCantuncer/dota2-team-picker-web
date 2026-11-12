import type { RankGroup, ScoreBreakdown } from "@/lib/engine/types";
import { SCORE_PART_NAMES, type PickLine } from "@/lib/pick-lines";

/*
 * The Why details a pick card opens from a Why This Hero line or a Score Parts row: which score part a line is about,
 * the parts in the order the details show them, and the scale their win-rate tracks share.
 */

export type WhyPart = keyof ScoreBreakdown;

/** The part names, as Score Parts shows them. */
export const PART_NAMES = SCORE_PART_NAMES;

/** Rank group names for the games a matchup is counted from. */
export const GROUP_NAMES: Record<RankGroup, string> = {
  1: "Herald and Guardian",
  2: "Crusader and Archon",
  3: "Legend and Ancient",
  4: "Divine and Immortal",
};

/**
 * The part a Why line explains, or null for a line that is not one part's number. A matchup lost is in Counters; a
 * hard counter the enemy has or can still take is in Pick Safety or Counters by where it stands.
 */
export function partOfLine(line: PickLine, enemies: ReadonlySet<number>): WhyPart | null {
  switch (line.kind) {
    case "counter":
      return "counter";
    case "synergy":
      return "synergy";
    case "need":
      return "teamNeeds";
    case "flex":
      return "flex";
    case "comfort":
      return "comfort";
    case "safety":
    case "phase":
    case "safe":
      return "pickSafety";
    case "winRate":
      return /rarely played/i.test(line.text) ? "positionFit" : "meta";
    case "risk":
      if (/^(?:against|with) /.test(line.text) && !/hard counter/.test(line.text)) return "counter";
      if (/hard counter/.test(line.text)) return line.heroes.some((h) => enemies.has(h)) ? "counter" : "pickSafety";
      if (/win rate/.test(line.text)) return "meta";
      if (/rarely played/i.test(line.text)) return "positionFit";
      return "pickSafety";
    default:
      return null;
  }
}

/** Which entry of a part a line is about, where a part has several kinds: comfort's tags, pick safety's causes. */
export type WhyItem = "favorite" | "top" | "record" | "risk" | "phase" | "gamble" | null;

export function itemOfLine(line: PickLine, part: WhyPart): WhyItem {
  if (part === "comfort") return /top 5/i.test(line.text) ? "top" : /record/i.test(line.text) ? "record" : "favorite";
  if (part !== "pickSafety") return null;
  if (line.kind === "phase") return "phase";
  if (/hard counter/.test(line.text)) return "gamble";
  return "risk";
}

/** The parts with a number, biggest first; a part at 0 is left out unless `keep` names it. */
export function partsInOrder(b: ScoreBreakdown, keep?: WhyPart | null): WhyPart[] {
  return (Object.keys(PART_NAMES) as WhyPart[])
    .filter((p) => Math.abs(b[p]) >= 0.05 || p === keep)
    .sort((x, y) => Math.abs(b[y]) - Math.abs(b[x]));
}

/**
 * The win-rate range (in %) that every track of a part shares, so their gaps compare: whole 5% steps around every
 * value, at least 10% wide.
 */
export function trackScale(values: readonly number[]): { lo: number; hi: number } {
  const pct = values.filter(Number.isFinite).map((v) => v * 100);
  let lo = Math.floor((Math.min(50, ...pct) - 0.5) / 5) * 5;
  let hi = Math.ceil((Math.max(50, ...pct) + 0.5) / 5) * 5;
  if (hi - lo < 10) {
    lo = Math.min(lo, 45);
    hi = Math.max(hi, 55);
  }
  return { lo: Math.max(0, lo), hi: Math.min(100, hi) };
}

/** "52.4%". */
export const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** "1,389": games are counted with fractions in the data, so they are rounded. */
export const games = (n: number) => Math.round(n).toLocaleString("en-US");

/** A signed number with one decimal and a real minus sign. */
export const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}`;

/** "×1.5", "×1.3". */
export const times = (n: number) => `×${Number(n.toFixed(2))}`;

/**
 * Spots (in % of a track) for labels that sit under their markers, pushed apart so no two are closer than `gap`,
 * kept inside 0 to 100. The order of the spots stays the order of the markers.
 */
export function spreadLabels(spots: readonly number[], gap: number): number[] {
  const order = spots.map((v, i) => [Math.min(100, Math.max(0, v)), i] as const).sort((a, b) => a[0] - b[0]);
  const out = order.map(([v]) => v);
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i]!, out[i - 1]! + gap);
  const over = out[out.length - 1]! - 100;
  if (over > 0) for (let i = out.length - 1; i >= 0; i--) out[i] = Math.min(out[i]!, 100 - (out.length - 1 - i) * gap);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(out[i]!, i * gap);
  const result: number[] = [];
  order.forEach(([, idx], k) => (result[idx] = out[k]!));
  return result;
}
