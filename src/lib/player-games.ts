/**
 * The player's previous games for the Your Games page, read from `player_game_facts` rows that
 * the backend refresh-trends job saves (backend `_shared/feedback/fact.ts`). The summary inside
 * is checked here field by field, so an odd or older row shows what it can instead of breaking.
 */

export const GAMES_PER_PAGE = 20;
/** The columns the list reads. */
export const PLAYER_GAMES_SELECT = "match_id, hero_id, position, is_win, started_at, duration_s, status, summary, findings";

export type GameStatus = "waiting_parse" | "parsed" | "basic";

export interface GameRow {
  matchId: number;
  heroId: number;
  position: number | null;
  isWin: boolean;
  startedAt: string;
  durationS: number;
  status: GameStatus;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  goldPerMin: number | null;
  /** The game's strongest point in a few words, when one stood out. */
  note: { tone: "strength" | "problem"; text: string } | null;
}

export interface GameFilters {
  heroId: number | null;
  position: number | null;
  result: "won" | "lost" | null;
  page: number;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
const STATUSES: GameStatus[] = ["waiting_parse", "parsed", "basic"];

/** Reads one row; null when the columns every row has are missing. */
export function readGameRow(row: unknown): GameRow | null {
  if (!isObj(row)) return null;
  const matchId = int(row.match_id);
  const heroId = int(row.hero_id);
  const durationS = int(row.duration_s);
  if (matchId === null || heroId === null || durationS === null || typeof row.is_win !== "boolean") return null;
  if (typeof row.started_at !== "string" || !STATUSES.includes(row.status as GameStatus)) return null;
  const card = isObj(row.summary) && isObj(row.summary.card) ? row.summary.card : null;
  const position = int(row.position);
  return {
    matchId,
    heroId,
    position: position !== null && position >= 1 && position <= 5 ? position : null,
    isWin: row.is_win,
    startedAt: row.started_at,
    durationS,
    status: row.status as GameStatus,
    kills: card ? int(card.kills) : null,
    deaths: card ? int(card.deaths) : null,
    assists: card ? int(card.assists) : null,
    goldPerMin: card ? int(card.goldPerMin) : null,
    note: noteOf(row.findings),
  };
}

/** The first finding's headline; findings come strengths first, then problems, each best first. */
function noteOf(findings: unknown): GameRow["note"] {
  if (!Array.isArray(findings)) return null;
  const valid = findings.filter(
    (f): f is { tone: "strength" | "problem"; headline: string } =>
      isObj(f) && (f.tone === "strength" || f.tone === "problem") && typeof f.headline === "string" && f.headline !== "",
  );
  // A problem is what the player most needs to see on a row.
  const pick = valid.find((f) => f.tone === "problem") ?? valid[0];
  return pick ? { tone: pick.tone, text: pick.headline } : null;
}

/** Filters from the page's search params; anything odd is ignored. */
export function readFilters(params: Record<string, string | string[] | undefined>): GameFilters {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const num = (key: string) => (/^\d+$/.test(one(key)) ? Number(one(key)) : null);
  const position = num("pos");
  const page = num("page");
  const result = one("result");
  return {
    heroId: num("hero") || null,
    position: position !== null && position >= 1 && position <= 5 ? position : null,
    result: result === "won" || result === "lost" ? result : null,
    page: page && page > 0 ? page : 1,
  };
}

/** The search params for these filters, leaving defaults out. */
export function filterQuery(filters: GameFilters, page = filters.page): string {
  const params = new URLSearchParams();
  if (filters.heroId) params.set("hero", String(filters.heroId));
  if (filters.position) params.set("pos", String(filters.position));
  if (filters.result) params.set("result", filters.result);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** "34:05" for a game's length. */
export function gameLength(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
