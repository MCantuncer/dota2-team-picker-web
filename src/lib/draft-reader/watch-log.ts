import type { DraftRead, SlotRead } from "./reader";

/** Rows kept in the watch log: a whole draft changes the top bar fewer times than this. */
export const LOG_ROWS = 60;

/**
 * One line per team for the watch log: each slot's hero, or what the reader almost matched and how
 * well (a "?" means it was not sure), so a missed pick shows why it was missed.
 */
export function logLine(read: DraftRead, name: (heroId: number) => string): string {
  const slot = (s: SlotRead) =>
    s.heroId !== null
      ? name(s.heroId)
      : s.best && s.best.score >= 0.6
        ? `? ${name(s.best.heroId)} ${s.best.score.toFixed(2)}`
        : "-";
  const teams = `Radiant: ${read.radiant.map(slot).join(", ")}  |  Dire: ${read.dire.map(slot).join(", ")}`;
  if (read.me === undefined) return teams;
  const me = read.me
    ? `${read.me.side === "radiant" ? "Radiant" : "Dire"} ${read.me.slot + 1} (by ${read.me.by === "both" ? "name and glow" : read.me.by})`
    : "not found";
  return `${teams}  |  You: ${me}`;
}

/** Keeps a row only when the line changes, and only the latest LOG_ROWS rows. */
export class WatchLog<T> {
  readonly rows: { seconds: number; line: string; bar: T }[] = [];
  private last = "";

  /** Adds a row when the line differs from the last one; returns whether it did. */
  add(seconds: number, line: string, bar: () => T): boolean {
    if (line === this.last) return false;
    this.last = line;
    this.rows.push({ seconds, line, bar: bar() });
    if (this.rows.length > LOG_ROWS) this.rows.shift();
    return true;
  }
}
