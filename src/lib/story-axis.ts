import type { Story } from "@/lib/engine/story";

/** Minutes the ruler shows before the first mark and after the last, so no mark sits on the edge. */
export const RULER_PAD = { before: 3, after: 2 } as const;
/** The fewest minutes the ruler spans, so one lone item still reads as a moment in a game. */
const MIN_SPAN = 8;

/**
 * The minutes the Race Rows ruler covers (Can's pick on the timeline board, 2026-11-27): zoomed to where the
 * marks are, from three minutes before the first (never before the lane ends) to two after the last. Every mark
 * then sits on its real minute, so items that land close together are drawn close but never stacked.
 */
export function rulerSpan(minutes: number[]): { from: number; to: number } {
  if (!minutes.length) return { from: LANE_END, to: LANE_END + MIN_SPAN };
  const from = Math.max(LANE_END, Math.min(...minutes) - RULER_PAD.before);
  const to = Math.max(from + MIN_SPAN, Math.max(...minutes) + RULER_PAD.after);
  return { from, to };
}

/** Where a minute sits on a ruler, as a fraction from 0 (its first minute) to 1 (its last), kept inside. */
export const rulerAt = (span: { from: number; to: number }, minute: number) =>
  Math.min(1, Math.max(0, (minute - span.from) / (span.to - span.from)));

/**
 * How many minutes apart the ruler's numbers are, so they never touch: every minute on a short ruler, every
 * second or fifth on a long one. A phone's ruler is narrower, so it gets a coarser step.
 */
export function rulerStep(span: { from: number; to: number }, phone = false): number {
  const minutes = span.to - span.from;
  // A phone's step is always a multiple of the wide step, so the numbers it keeps are ones the wide ruler shows.
  if (phone) return minutes <= 8 ? 1 : minutes <= 16 ? 2 : minutes <= 30 ? 4 : 10;
  return minutes <= 16 ? 1 : minutes <= 30 ? 2 : 5;
}

/** The heroes an action names, in the order it names them, matched as whole names. */
export function namedHeroes(action: string, names: string[]): string[] {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return names
    .map((name) => ({ name, at: action.search(new RegExp(`(^|[^\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, "u")) }))
    .filter((n) => n.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((n) => n.name);
}

/** "~17" for a minute told as around, else "17". */
export const minuteText = (s: { minute: number; around?: boolean }) => `${s.around ? "~" : ""}${s.minute}`;

/** The timeline for screen readers: the same items and minutes as one line. */
export function timelineLabel(story: Story): string {
  const at = (s: { minute: number; around?: boolean }) => `${s.around ? "around" : "at"} ${s.minute}`;
  const spikes = story.chapters.flatMap((c) => [
    ...c.ours.map((s) => `our ${s.hero} ${s.item} ${at(s)}`),
    ...c.theirs.map((s) => `their ${s.hero} ${s.item} ${at(s)}`),
  ]);
  const ready = story.ready !== undefined ? `, ready to fight at ${story.ready}` : "";
  return `Item timings: ${spikes.join(", ") || "none"}${ready}.`;
}

/** The minute the lane ends: the Draft page's First 10 Minutes section tells the game before it. */
export const LANE_END = 10;

/**
 * The story after the lane (Can, 2026-11-22: "separate first 10 minutes from the game"): the lane chapter is left
 * out, so the game clock and its cards start at 10 minutes. The plan shared as text keeps it.
 */
export function afterLane(story: Story): Story {
  return { ...story, chapters: story.chapters.filter((c) => c.from >= LANE_END) };
}
