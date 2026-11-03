/**
 * A player's game feedback, as the backend's refresh-trends job saves it in `player_feedback`
 * (backend `supabase/functions/_shared/feedback/profile.ts` and `findings.ts`). The job writes
 * every sentence from the player's own numbers; the site only shows them.
 *
 * This is a copy of the backend shape. The backend changes it only together with `version`;
 * a version this file doesn't know reads as "no feedback yet" instead of breaking the page.
 */

export type FindingKind = "early_deaths" | "deaths" | "laning" | "farm" | "damage" | "healing" | "towers";
export type Tone = "strength" | "problem";

export interface Finding {
  kind: FindingKind;
  tone: Tone;
  headline: string;
  /** The actual moments or numbers, one line each. */
  happened: string[];
  pattern: string | null;
  cost: string | null;
  /** A reviewed tip, for problems only. */
  change: string | null;
  matchIds: number[];
}

export interface Improvement {
  kind: FindingKind;
  headline: string;
}

export interface PlayerFeedback {
  strengths: Finding[];
  problems: Finding[];
  improved: Improvement[];
  games: number;
  parsedGames: number;
  firstGameAt: string | null;
  lastGameAt: string | null;
  updatedAt: string;
}

/** The player_feedback columns the page reads. */
export const PLAYER_FEEDBACK_SELECT = "version, findings, improved, games, parsed_games, first_game_at, last_game_at, updated_at";
const KNOWN_VERSIONS = [1];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function readFinding(v: unknown): Finding | null {
  if (!isObj(v) || (v.tone !== "strength" && v.tone !== "problem")) return null;
  const headline = str(v.headline);
  if (!headline || typeof v.kind !== "string") return null;
  return {
    kind: v.kind as FindingKind,
    tone: v.tone,
    headline,
    happened: strings(v.happened),
    pattern: str(v.pattern),
    cost: str(v.cost),
    change: v.tone === "problem" ? str(v.change) : null,
    matchIds: Array.isArray(v.matchIds) ? v.matchIds.filter((x): x is number => Number.isInteger(x)) : [],
  };
}

/**
 * Reads a player_feedback row. Null for no row or a version this site doesn't know; odd
 * findings are skipped one by one, so one bad item never hides the rest.
 */
export function readPlayerFeedback(row: unknown): PlayerFeedback | null {
  if (!isObj(row) || !KNOWN_VERSIONS.includes(row.version as number)) return null;
  const findings = (Array.isArray(row.findings) ? row.findings : []).flatMap((f) => readFinding(f) ?? []);
  const improved = (Array.isArray(row.improved) ? row.improved : []).flatMap((i): Improvement[] =>
    isObj(i) && typeof i.kind === "string" && str(i.headline)
      ? [{ kind: i.kind as FindingKind, headline: i.headline as string }]
      : [],
  );
  return {
    strengths: findings.filter((f) => f.tone === "strength"),
    problems: findings.filter((f) => f.tone === "problem"),
    improved,
    games: typeof row.games === "number" ? row.games : 0,
    parsedGames: typeof row.parsed_games === "number" ? row.parsed_games : 0,
    firstGameAt: str(row.first_game_at),
    lastGameAt: str(row.last_game_at),
    updatedAt: str(row.updated_at) ?? "",
  };
}
