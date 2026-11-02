/**
 * The numbers of a post-game report, as the backend's build-reports job saves them in
 * `match_reports.facts` (backend `supabase/functions/_shared/report/facts.ts` and `fights.ts`).
 *
 * This is a copy of the backend type, checked against the backend's saved fixture in the tests.
 * The backend changes the shape only together with `facts_version`; every version stays
 * readable here for good, so add a new version beside the old one instead of changing it.
 */

export type LaneName = "bottom" | "mid" | "top";

export interface Swing {
  fromMinute: number;
  toMinute: number;
  /** Change in our gold lead over the window; negative when it went their way. */
  change: number;
}

export interface LaneResult {
  lane: LaneName;
  ourHeroes: number[];
  theirHeroes: number[];
  /** Our side's total net worth in this lane at 10 minutes minus theirs. */
  netWorthDiff: number;
}

export interface HeroCard {
  heroId: number;
  kills: number;
  deaths: number;
  assists: number;
  goldPerMin: number;
  xpPerMin: number;
  lastHits: number;
  denies: number;
  netWorth: number;
  heroDamage: number;
  towerDamage: number;
  heroHealing: number;
  level: number;
  abandoned: boolean;
  /** The fields below need a parsed replay and are null without one. */
  lane: LaneName | "jungle" | null;
  isRoaming: boolean | null;
  /** Percent (0 to 100) of the hero's players this game beat. */
  benchmarks: { goldPerMin: number; xpPerMin: number; lastHitsPerMin: number; heroDamagePerMin: number } | null;
  /** Share (0 to 1) of the team's kills this hero took part in. */
  teamfightShare: number | null;
  stunSeconds: number | null;
  deathsBefore10: number | null;
  goldLostToDeaths: number | null;
  secondsDead: number | null;
  /** Key items in the order bought, with the minute of the first purchase. */
  keyItems: { itemId: number; minute: number }[] | null;
  wards: { observers: number; sentries: number; destroyed: number } | null;
}

export interface FightFact {
  startMinute: number;
  ourDeaths: number;
  theirDeaths: number;
  /** Gold our side gained in the fight minus what theirs gained. */
  goldSwing: number;
  /** Our heroes who did no damage, no healing and didn't die in it. */
  missingHeroes: number[];
}

export interface DamageSource {
  /** The enemy ability or item key, like `lina_laguna_blade`, or "attacks". */
  source: string;
  damage: number;
  /** Share (0 to 1) of all damage our heroes took. */
  share: number;
}

export interface EnemyBest {
  heroId: number;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
}

export interface DraftPickFact {
  heroId: number;
  /** 1 for the top suggestion. Null when the hero wasn't in the list. */
  suggestionRank: number | null;
  /** How many heroes were shown; 0 means no list. */
  listSize: number;
}

/** Facts version 1. */
export interface Facts {
  version: 1;
  /** Built without a parsed replay: the parse-only fields are null. */
  isBasic: boolean;
  matchId: number;
  durationS: number;
  gameMode: number;
  lobbyType: number;
  side: "radiant" | "dire";
  won: boolean;
  score: { ours: number; theirs: number };
  /** Our gold lead at each minute (negative when behind). */
  goldLead: number[] | null;
  swings: Swing[] | null;
  /** Null when the game ended before 10 minutes or the replay isn't parsed. */
  lanes: LaneResult[] | null;
  /** Our five, in slot order. */
  heroes: HeroCard[];
  enemyHeroes: number[];
  fights: FightFact[] | null;
  damageTaken: DamageSource[] | null;
  enemyBest: EnemyBest | null;
  draft: DraftPickFact[] | null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNums = (v: unknown): v is number[] => Array.isArray(v) && v.every(isNum);
const hasNums = (o: unknown, keys: string[]): o is Obj => isObj(o) && keys.every((k) => isNum(o[k]));
const listOf = (v: unknown, ok: (x: unknown) => boolean) => Array.isArray(v) && v.every(ok);
const orNull = (v: unknown, ok: (x: unknown) => boolean) => v === null || ok(v);

const LANES = ["bottom", "mid", "top"];

const isHeroCard = (h: unknown) =>
  hasNums(h, ["heroId", "kills", "deaths", "assists", "goldPerMin", "xpPerMin", "lastHits", "denies", "netWorth",
    "heroDamage", "towerDamage", "heroHealing", "level"]) &&
  typeof h.abandoned === "boolean" &&
  orNull(h.lane, (l) => typeof l === "string" && [...LANES, "jungle"].includes(l)) &&
  orNull(h.benchmarks, (b) => hasNums(b, ["goldPerMin", "xpPerMin", "lastHitsPerMin", "heroDamagePerMin"])) &&
  orNull(h.keyItems, (items) => listOf(items, (i) => hasNums(i, ["itemId", "minute"]))) &&
  orNull(h.wards, (w) => hasNums(w, ["observers", "sentries", "destroyed"])) &&
  ["teamfightShare", "stunSeconds", "deathsBefore10", "goldLostToDeaths", "secondsDead"].every((k) => orNull(h[k], isNum));

/**
 * The facts of a report, when they are a version this site reads; null otherwise, so a report
 * the site can't read shows as "not available" instead of breaking the page.
 */
export function readFacts(raw: unknown, version: number | null): Facts | null {
  if (version !== 1 || !isObj(raw) || raw.version !== 1) return null;
  const f = raw;
  const ok =
    hasNums(f, ["matchId", "durationS", "gameMode", "lobbyType"]) &&
    typeof f.isBasic === "boolean" &&
    typeof f.won === "boolean" &&
    (f.side === "radiant" || f.side === "dire") &&
    hasNums(f.score, ["ours", "theirs"]) &&
    orNull(f.goldLead, isNums) &&
    orNull(f.swings, (s) => listOf(s, (x) => hasNums(x, ["fromMinute", "toMinute", "change"]))) &&
    orNull(f.lanes, (s) =>
      listOf(s, (x) =>
        hasNums(x, ["netWorthDiff"]) && LANES.includes(x.lane as string) && isNums(x.ourHeroes) && isNums(x.theirHeroes)
      )) &&
    listOf(f.heroes, isHeroCard) &&
    isNums(f.enemyHeroes) &&
    orNull(f.fights, (s) =>
      listOf(s, (x) => hasNums(x, ["startMinute", "ourDeaths", "theirDeaths", "goldSwing"]) && isNums(x.missingHeroes))) &&
    orNull(f.damageTaken, (s) =>
      listOf(s, (x) => hasNums(x, ["damage", "share"]) && typeof x.source === "string")) &&
    orNull(f.enemyBest, (x) => hasNums(x, ["heroId", "kills", "deaths", "assists", "netWorth"])) &&
    orNull(f.draft, (s) =>
      listOf(s, (x) => hasNums(x, ["heroId", "listSize"]) && orNull(x.suggestionRank, isNum)));
  // Checked field by field above, against the type it is cast to.
  return ok ? (f as unknown as Facts) : null;
}
