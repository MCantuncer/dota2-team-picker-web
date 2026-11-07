/**
 * The My Heroes fill: the fill-heroes function reads a player's public games and adds the heroes
 * they really play to each position. This reads the saved fill state from the profile and decides
 * which card My Heroes shows and when Fill from My Games may run again. The rest times mirror
 * claim_hero_fill in the database, which is the real guard.
 */

export type FillState = "running" | "done" | "no_games" | "too_few" | "waiting" | "failed";

/** profiles.hero_fill_* as the page reads them. */
export interface FillStatus {
  state: FillState | null;
  /** When the last fill was claimed. */
  at: Date | null;
  /** Games with a known position the last fill used. */
  games: number | null;
  /** While waiting: when the next try may run. */
  nextAt: Date | null;
}

/** Fewer games with a known position than this and the fill adds nothing (too_few). */
export const MIN_POSITIONED_GAMES = 20;

const STATES: readonly FillState[] = ["running", "done", "no_games", "too_few", "waiting", "failed"];
const MINUTE = 60_000;
/** A run still 'running' after this counts as a failed try in the database. */
const STUCK_MS = 10 * MINUTE;

const toDate = (v: unknown): Date | null => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Reads the profile columns; anything odd reads as never filled. */
export function readFillStatus(row: {
  hero_fill_state?: unknown;
  hero_fill_at?: unknown;
  hero_fill_games?: unknown;
  hero_fill_next_at?: unknown;
}): FillStatus {
  const state = STATES.includes(row.hero_fill_state as FillState) ? (row.hero_fill_state as FillState) : null;
  const games = typeof row.hero_fill_games === "number" && row.hero_fill_games >= 0 ? row.hero_fill_games : null;
  return { state, at: toDate(row.hero_fill_at), games, nextAt: toDate(row.hero_fill_next_at) };
}

/**
 * When Fill from My Games may run again: null means now. Same rules as claim_hero_fill:
 * a finished fill rests a day, an empty or failed one 10 minutes, a waiting one until its retry time.
 */
export function fillReadyAt(status: FillStatus, now: Date): Date | null {
  const after = (ms: number) => (status.at ? new Date(status.at.getTime() + ms) : null);
  let ready: Date | null = null;
  switch (status.state) {
    case null:
      return null;
    case "running":
      ready = after(STUCK_MS);
      break;
    case "done":
      ready = after(24 * 60 * MINUTE);
      break;
    case "no_games":
    case "too_few":
    case "failed":
      ready = after(STUCK_MS);
      break;
    case "waiting":
      ready = status.nextAt;
      break;
  }
  return ready && ready.getTime() > now.getTime() ? ready : null;
}

/** The page keeps checking while a fill runs or waits for its retry. */
export const fillInProgress = (status: FillStatus, now: Date): boolean =>
  status.state === "running" ? fillReadyAt(status, now) !== null : status.state === "waiting";

/**
 * "Again at 14:32" or "Again tomorrow at 03:20", in the viewer's time. The day word compares
 * calendar days in that same time zone.
 */
export function againAt(ready: Date, now: Date, timeZone?: string): string {
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(ready);
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(d);
  if (day(ready) === day(now)) return `Again at ${time}`;
  if (day(ready) === day(new Date(now.getTime() + 24 * 60 * MINUTE))) return `Again tomorrow at ${time}`;
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone }).format(ready);
  return `Again on ${date} at ${time}`;
}

/** What fill-heroes answers: claimed false when the fill may not run now (the saved state stands). */
export function readFillAnswer(raw: unknown): { claimed: boolean } | null {
  if (typeof raw !== "object" || raw === null || typeof (raw as { claimed?: unknown }).claimed !== "boolean") return null;
  return { claimed: (raw as { claimed: boolean }).claimed };
}
