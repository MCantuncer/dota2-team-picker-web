/**
 * One of the player's previous games for its own page, read from the `player_game_facts` row
 * that the backend refresh-trends job saves (backend `_shared/feedback/summary.ts` for the
 * summary, `findings.ts` for the findings). Every field is checked on its own, so an odd or
 * older row shows what it can instead of breaking the page.
 */
import { type Finding, readFinding } from "./player-feedback";
import { type GameRow, readGameRow } from "./player-games";

/** The columns the page reads. */
export const PLAYER_GAME_SELECT =
  "match_id, hero_id, position, is_win, started_at, duration_s, status, summary, findings, draft_id";

export interface GameStats {
  xpPerMin: number | null;
  lastHits: number | null;
  denies: number | null;
  netWorth: number | null;
  heroDamage: number | null;
  towerDamage: number | null;
  heroHealing: number | null;
  /** Percent (0 to 100) of the hero's players this game beat, when parsed. */
  goldPerMinBeat: number | null;
  heroDamageBeat: number | null;
}

export interface LaneAt10 {
  lastHits: number | null;
  denies: number | null;
  /** This player's net worth minus the richest enemy in the same lane. */
  netWorthDiff: number | null;
}

export interface Death {
  /** Seconds from the horn. */
  time: number;
  killerHeroId: number | null;
  isKillerFromMid: boolean;
  goldLost: number;
  timeDead: number;
  buildingsLost: string[];
}

export interface GameDetail extends GameRow {
  stats: GameStats;
  lane: LaneAt10 | null;
  /** Null when the replay wasn't parsed (no death details then). */
  deathList: Death[] | null;
  strengths: Finding[];
  problems: Finding[];
  draftId: string | null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads the row; null when the columns every row has are missing. */
export function readGameDetail(row: unknown): GameDetail | null {
  const base = readGameRow(row);
  if (!base || !isObj(row)) return null;
  const summary = isObj(row.summary) ? row.summary : {};
  const card = isObj(summary.card) ? summary.card : {};
  const bench = isObj(card.benchmarks) ? card.benchmarks : {};
  const lane = {
    lastHits: int(summary.lastHitsAt10),
    denies: int(summary.deniesAt10),
    netWorthDiff: int(summary.laneNetWorthDiffAt10),
  };
  const findings = (Array.isArray(row.findings) ? row.findings : []).flatMap((f) => readFinding(f) ?? []);
  return {
    ...base,
    stats: {
      xpPerMin: int(card.xpPerMin),
      lastHits: int(card.lastHits),
      denies: int(card.denies),
      netWorth: int(card.netWorth),
      heroDamage: int(card.heroDamage),
      towerDamage: int(card.towerDamage),
      heroHealing: int(card.heroHealing),
      goldPerMinBeat: int(bench.goldPerMin),
      heroDamageBeat: int(bench.heroDamagePerMin),
    },
    lane: Object.values(lane).some((v) => v !== null) ? lane : null,
    deathList: Array.isArray(summary.deaths) ? summary.deaths.flatMap((d) => readDeath(d) ?? []) : null,
    strengths: findings.filter((f) => f.tone === "strength"),
    problems: findings.filter((f) => f.tone === "problem"),
    draftId: typeof row.draft_id === "string" && UUID.test(row.draft_id) ? row.draft_id : null,
  };
}

function readDeath(v: unknown): Death | null {
  if (!isObj(v)) return null;
  const time = int(v.time);
  if (time === null) return null;
  return {
    time,
    killerHeroId: int(v.killerHeroId),
    isKillerFromMid: v.isKillerFromMid === true,
    goldLost: int(v.goldLost) ?? 0,
    timeDead: int(v.timeDead) ?? 0,
    buildingsLost: Array.isArray(v.buildingsLost) ? v.buildingsLost.filter((b): b is string => typeof b === "string") : [],
  };
}

/** The match id from the URL, or null for anything that isn't one. */
export function readMatchId(param: string): number | null {
  if (!/^\d{1,19}$/.test(param)) return null;
  const id = Number(param);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const LANES: Record<string, string> = { top: "Top", mid: "Mid", bot: "Bottom" };

/** "Tier 2 Mid Tower" for an OpenDota building key like "npc_dota_goodguys_tower2_mid". */
export function buildingName(key: string): string {
  const tower = /tower(\d)_(top|mid|bot)/.exec(key);
  if (tower) return `Tier ${tower[1]} ${LANES[tower[2]]} Tower`;
  if (/tower4/.test(key)) return "Tier 4 Tower";
  const rax = /(melee|range)_rax_(top|mid|bot)/.exec(key);
  if (rax) return `${LANES[rax[2]]} ${rax[1] === "melee" ? "Melee" : "Ranged"} Barracks`;
  if (/fort/.test(key)) return "Ancient";
  return "A building";
}

/** "6:20" from seconds after the horn; negative times read "-0:30". */
export function clock(seconds: number): string {
  const s = Math.abs(seconds);
  return `${seconds < 0 ? "-" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
