/**
 * The fill-heroes dry run's answer (backend _shared/fill/dry_run.ts), checked where it enters,
 * and the words the admin Fill Check page shows for it.
 */

export type SourceStatus = "ok" | "off" | "partial" | "failed" | "no_budget";

export interface FillCheckPick {
  heroId: number;
  position: number;
  kind: "regular" | "proven";
  games: number;
  wins: number;
  strongGames: number;
  judgedGames: number;
  /** Unix seconds. */
  lastPlayed: number;
  gamesNeeded: number | null;
}

export interface FillCheckNearMiss extends Omit<FillCheckPick, "kind"> {
  why: string;
}

export interface FillCheckReport {
  lookbackDays: number;
  sources: {
    stratz: { status: SourceStatus; games: number; pages: number };
    openDota: { status: SourceStatus; games: number };
    drafts: { status: SourceStatus; games: number };
    benchmarks: { cached: number; fetched: number; missing: number };
  };
  coverage: {
    games: number;
    positioned: number;
    positionedShare: number;
    bySource: { stratz: number; opendota: number; draft: number; none: number };
  };
  verdict: "go" | "back_to_can";
  strong: Record<string, { imp: { judged: number; strong: number }; stats: { judged: number; strong: number } }>;
  fill: {
    state: "ok" | "too_few";
    gamesByPosition: Record<string, number>;
    positions: number[];
    picks: FillCheckPick[];
    nearMisses: FillCheckNearMiss[];
  };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const STATUSES: readonly string[] = ["ok", "off", "partial", "failed", "no_budget"];

const isPick = (v: unknown): boolean =>
  isObj(v) &&
  ["heroId", "position", "games", "wins", "strongGames", "judgedGames", "lastPlayed"].every((k) => isNum(v[k])) &&
  (v.gamesNeeded === null || isNum(v.gamesNeeded));

/** The report, or null when the answer isn't the shape the page reads. */
export function readFillReport(raw: unknown): FillCheckReport | null {
  if (!isObj(raw) || !isObj(raw.sources) || !isObj(raw.coverage) || !isObj(raw.fill) || !isObj(raw.strong)) return null;
  const { sources, coverage, fill } = raw;
  const statusOk = ["stratz", "openDota", "drafts"].every((k) => isObj(sources[k]) && STATUSES.includes(String(sources[k].status)));
  if (!statusOk || !isObj(sources.benchmarks) || !isObj(coverage.bySource) || !isNum(coverage.positionedShare)) return null;
  if (raw.verdict !== "go" && raw.verdict !== "back_to_can") return null;
  if (!Array.isArray(fill.picks) || !fill.picks.every(isPick) || !Array.isArray(fill.nearMisses)) return null;
  if (!fill.nearMisses.every((m) => isPick(m) && isObj(m) && typeof m.why === "string")) return null;
  if (!Array.isArray(fill.positions) || !isObj(fill.gamesByPosition)) return null;
  // Safe: the parts the page reads were checked above; the rest are numbers it only prints.
  return raw as unknown as FillCheckReport;
}

const STATUS_WORDS: Record<SourceStatus, string> = {
  ok: "read",
  off: "off (no STRATZ_TOKEN)",
  partial: "only the newer pages (a later page failed)",
  failed: "failed",
  no_budget: "skipped (no OpenDota calls left today)",
};

export const statusWords = (status: SourceStatus) => STATUS_WORDS[status];

/** "62%", for a share from 0 to 1. */
export const percent = (share: number) => `${Math.round(share * 100)}%`;

/** The go or no-go line at the top of the results. */
export function verdictText(report: FillCheckReport): string {
  const share = percent(report.coverage.positionedShare);
  return report.verdict === "go"
    ? `Go: ${share} of games have a position, at least the 70% the rules need.`
    : `Back to Can: only ${share} of games have a position, under the 70% the rules need.`;
}

/** "14 of 20 (70%)", or "none" when nothing was judged. */
export function strongText(count: { judged: number; strong: number }): string {
  return count.judged ? `${count.strong} of ${count.judged} (${percent(count.strong / count.judged)})` : "none";
}
