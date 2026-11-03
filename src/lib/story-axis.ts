import type { Chapter, Story } from "@/lib/engine/story";

/** Minutes drawn for the last chapter, which has no end. */
const LAST_SPAN = 15;
/** The closest two item marks in one row may sit, in percent of the axis, so their art doesn't overlap. */
export const MIN_GAP = 12;

/**
 * Where a minute sits on the Story's axis, in percent: each chapter gets an equal column and its minutes
 * spread evenly across it. A minute before the first chapter sits at 0, one in a gap between chapters at
 * the next chapter's start, and one past the last chapter's drawn span at 100.
 */
export function axisPosition(chapters: Chapter[], minute: number): number {
  if (!chapters.length) return 0;
  const width = 100 / chapters.length;
  for (const [i, c] of chapters.entries()) {
    if (minute < c.from) return i * width;
    const end = c.to ?? c.from + LAST_SPAN;
    if (c.to === null || minute < c.to) return Math.min(100, i * width + (width * (minute - c.from)) / (end - c.from));
  }
  return 100;
}

/**
 * Marks in one row, in order, pushed apart so their art doesn't overlap and kept whole inside the axis.
 * When too many share a row for the usual gap, the gap shrinks so they still fit.
 */
export function spreadMarks<T extends { left: number }>(marks: T[]): T[] {
  const sorted = [...marks].sort((a, b) => a.left - b.left);
  if (!sorted.length) return sorted;
  const lo = MIN_GAP / 2;
  const hi = 100 - MIN_GAP / 2;
  const gap = sorted.length > 1 ? Math.min(MIN_GAP, (hi - lo) / (sorted.length - 1)) : MIN_GAP;
  const out = sorted.map((m) => ({ ...m, left: Math.min(hi, Math.max(lo, m.left)) }));
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1]!; // i >= 1, so out[i - 1] exists.
    const cur = out[i]!; // i < out.length.
    if (cur.left - prev.left < gap) out[i] = { ...cur, left: prev.left + gap };
  }
  // Marks pushed past the right edge step back left, keeping the gap.
  for (let i = out.length - 1; i >= 0; i--) {
    const cur = out[i]!; // i is in range.
    const limit = hi - (out.length - 1 - i) * gap;
    if (cur.left > limit) out[i] = { ...cur, left: limit };
  }
  return out;
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
