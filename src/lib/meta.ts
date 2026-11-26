import { SUPABASE_URL } from "@/lib/supabase/env";
import type { ItemInfo, NeutralItem } from "@/lib/engine/types";

/**
 * The Meta page numbers, built by the backend's refresh (services/engine/src/data/meta.ts) into meta.json in the
 * public hero-data bucket: each hero's games and wins per day of the current patch and of the last days of the patch
 * before, for every rank and each rank group.
 */
export const META_URL = `${SUPABASE_URL}/storage/v1/object/public/hero-data/meta.json`;

/** Rank slices: 0 every rank, then the four rank groups (two medals each). */
export type RankSlice = 0 | 1 | 2 | 3 | 4;
export const RANK_GROUPS: { slice: Exclude<RankSlice, 0>; name: string; medal: number }[] = [
  { slice: 1, name: "Herald and Guardian", medal: 2 },
  { slice: 2, name: "Crusader and Archon", medal: 4 },
  { slice: 3, name: "Legend and Ancient", medal: 6 },
  { slice: 4, name: "Divine and Immortal", medal: 8 },
];

/** A hero with fewer games than this in a rank slice is left out of it, so no number rests on a handful of games. */
export const MIN_GAMES = 2000;
/** A role counts as one of a hero's roles from this share of its games, in percent. */
export const ROLE_SHARE = 20;

export interface MetaDay {
  index: number;
  from: string;
  to: string;
  complete: boolean;
  /** Games per rank slice. */
  games: number[];
  /** Per hero id: [games, wins] per rank slice, flattened. */
  heroes: Record<string, number[]>;
}

export interface MetaFile {
  computedAt: string;
  patch: { name: string; startedAt: string };
  days: MetaDay[];
  base: MetaDay[];
  /** Per hero id: share of its games per position 1 to 5, in percent. */
  roles: Record<string, number[]>;
  /** The hero card extras; missing until the backend has built them. */
  extras?: MetaExtras;
}

/** A hero's games in a position, and how many of them ended with each item: [item id, games], most first. */
export interface HeroBuild {
  games: number;
  items: [number, number][];
  neutral: [number, number][];
  /** Games with buy minutes; the two fields below are missing until there are enough. */
  buyGames?: number;
  /** The usual minute each item in `items` is first bought: [item id, minute]. */
  minutes?: [number, number][];
  /** Cheap items bought in the first minutes: [item id, games of buyGames], most first. */
  early?: [number, number][];
}

/** A patch line: the ability's name ("Hero" for base stats, "Talent"), the text, and 1 buff, -1 nerf, 0 unclear. */
export interface PatchLine {
  ability: string;
  text: string;
  tone: 1 | 0 | -1;
}

/** An enemy as [hero id, win rate against it in percent, games]. */
export type Matchup = [number, number, number];

export interface MetaExtras {
  /** Saved ranked games of this patch with end-of-game items. */
  buildGames: number;
  /** Per hero id, per position "1" to "5" and "0" for every position. */
  builds: Record<string, Record<string, HeroBuild>>;
  /** Items new in this patch: games that ended with each, and its heroes as [hero id, games]. */
  newItems: { id: number; games: number; heroes: [number, number][] }[];
  matchups: Record<string, { best: Matchup[]; worst: Matchup[] }>;
  /** Shop data of the items above, for item cards. Neutral items have none. */
  items: Record<string, ItemInfo>;
  /** The tooltips of the neutral items in the builds (tier, spell, bonuses); missing in older files. */
  neutralItems?: Record<string, NeutralItem>;
  /** Per hero id: its biggest changes in the patch and how many it had; missing in older files. */
  patchNotes?: Record<string, { lines: PatchLine[]; changes: number }>;
}

/** Games a position needs before the backend lists its build. */
export const MIN_BUILD_GAMES = 40;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isNumbers = (x: unknown): x is number[] => Array.isArray(x) && x.every((n) => typeof n === "number" && Number.isFinite(n));
const isDay = (x: unknown): x is MetaDay =>
  isRecord(x) &&
  typeof x.index === "number" &&
  typeof x.from === "string" &&
  isNumbers(x.games) &&
  x.games.length === 5 &&
  isRecord(x.heroes) &&
  Object.values(x.heroes).every((h) => isNumbers(h) && h.length === 10);

const isPairs = (x: unknown, size: number) => Array.isArray(x) && x.every((p) => isNumbers(p) && p.length === size);
const isBuild = (x: unknown): x is HeroBuild =>
  isRecord(x) &&
  typeof x.games === "number" &&
  isPairs(x.items, 2) &&
  isPairs(x.neutral, 2) &&
  (x.minutes === undefined || isPairs(x.minutes, 2)) &&
  (x.early === undefined || isPairs(x.early, 2));
const isLine = (x: unknown) => isRecord(x) && typeof x.ability === "string" && typeof x.text === "string" && [1, 0, -1].includes(x.tone as number);
const isNotes = (x: unknown) =>
  isRecord(x) && Object.values(x).every((n) => isRecord(n) && typeof n.changes === "number" && Array.isArray(n.lines) && n.lines.every(isLine));

const isNeutralItems = (x: unknown) =>
  isRecord(x) &&
  Object.values(x).every((n) => isRecord(n) && typeof n.name === "string" && typeof n.img === "string" && (n.kind === "artifact" || n.kind === "enchantment"));

/** True when the extras have the shape the page reads; the page then shows the rest without them. */
export function isExtras(x: unknown): x is MetaExtras {
  return (
    isRecord(x) &&
    typeof x.buildGames === "number" &&
    isRecord(x.builds) &&
    Object.values(x.builds).every((b) => isRecord(b) && Object.values(b).every(isBuild)) &&
    Array.isArray(x.newItems) &&
    x.newItems.every((n) => isRecord(n) && typeof n.id === "number" && typeof n.games === "number" && isPairs(n.heroes, 2)) &&
    isRecord(x.matchups) &&
    Object.values(x.matchups).every((m) => isRecord(m) && isPairs(m.best, 3) && isPairs(m.worst, 3)) &&
    isRecord(x.items) &&
    (x.neutralItems === undefined || isNeutralItems(x.neutralItems)) &&
    (x.patchNotes === undefined || isNotes(x.patchNotes))
  );
}

/** True when `x` has the shape the page reads; anything else is not shown. */
export function isMeta(x: unknown): x is MetaFile {
  return (
    isRecord(x) &&
    isRecord(x.patch) &&
    typeof x.patch.name === "string" &&
    typeof x.patch.startedAt === "string" &&
    Array.isArray(x.days) &&
    x.days.length > 0 &&
    x.days.every(isDay) &&
    Array.isArray(x.base) &&
    x.base.every(isDay) &&
    isRecord(x.roles)
  );
}

/** The published numbers, cached for 10 minutes; null when there are none yet or they do not have the expected shape. */
export async function getMeta(): Promise<MetaFile | null> {
  const res = await fetch(META_URL, { next: { revalidate: 600 } });
  // Supabase Storage answers 400 for an object that does not exist.
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Meta numbers download failed (${res.status})`);
  const body: unknown = await res.json();
  if (!isMeta(body)) {
    console.error("Meta numbers have an unexpected shape");
    return null;
  }
  if (body.extras !== undefined && !isExtras(body.extras)) {
    console.error("Meta extras have an unexpected shape");
    delete body.extras;
  }
  return body;
}

/** One hero's numbers in one rank slice. Rates are in percent. */
export interface HeroRate {
  id: number;
  games: number;
  /** Share of games the hero was in, and its win rate, this patch, recent days weighing more (dayWeights). */
  pick: number;
  win: number;
  /** The same in the last days of the patch before, or null when it had too few games then. */
  basePick: number | null;
  baseWin: number | null;
  /** Win rate per day of this patch, oldest first; null for a day with too few games. */
  days: (number | null)[];
  /** Positions 1 to 5 the hero is played in at least ROLE_SHARE of its games. */
  roles: number[];
}

/** A day's games of one hero needed to show its win rate that day. */
const MIN_DAY_GAMES = 300;

/**
 * Days this old count half, so the rates follow a letter patch within a day or two without starting over: the day
 * after 7.42a Riki won 53.8%, while the plain average of the patch still said 56.6%.
 */
export const HALF_LIFE_DAYS = 1;

/**
 * Each day's weight for the patch's rates: 1 for the newest complete day (and the day still running, whose few games
 * already weigh little), halving every HALF_LIFE_DAYS before it.
 */
export function dayWeights(days: MetaDay[]): number[] {
  let newest = days.length - 1;
  while (newest > 0 && !days[newest]?.complete) newest--;
  return days.map((_, i) => 0.5 ** (Math.max(0, newest - i) / HALF_LIFE_DAYS));
}

/** A hero's games and wins over the days, each day times its weight (1 for all by default). */
function total(days: MetaDay[], hero: string, slice: RankSlice, weights: number[] = []): [number, number] {
  let games = 0;
  let wins = 0;
  days.forEach((d, i) => {
    const w = weights[i] ?? 1;
    games += w * (d.heroes[hero]?.[slice * 2] ?? 0);
    wins += w * (d.heroes[hero]?.[slice * 2 + 1] ?? 0);
  });
  return [games, wins];
}

const gamesIn = (days: MetaDay[], slice: RankSlice, weights: number[] = []) =>
  days.reduce((n, d, i) => n + (weights[i] ?? 1) * (d.games[slice] ?? 0), 0);

/**
 * Every hero's numbers in a rank slice, leaving out heroes under MIN_GAMES this patch. Pick and win rates weigh recent
 * days more (dayWeights); games are the plain count.
 */
export function heroRates(meta: MetaFile, slice: RankSlice): HeroRate[] {
  const weights = dayWeights(meta.days);
  const games = gamesIn(meta.days, slice, weights);
  const baseGames = gamesIn(meta.base, slice);
  const out: HeroRate[] = [];
  const ids = new Set(meta.days.flatMap((d) => Object.keys(d.heroes)));
  for (const id of ids) {
    const [g] = total(meta.days, id, slice);
    const [wg, ww] = total(meta.days, id, slice, weights);
    if (g < MIN_GAMES || games <= 0 || wg <= 0) continue;
    const [bg, bw] = total(meta.base, id, slice);
    const hasBase = bg >= MIN_GAMES && baseGames > 0;
    out.push({
      id: Number(id),
      games: g,
      pick: (wg / games) * 100,
      win: (ww / wg) * 100,
      basePick: hasBase ? (bg / baseGames) * 100 : null,
      baseWin: hasBase ? (bw / bg) * 100 : null,
      days: meta.days.map((d) => {
        const dg = d.heroes[id]?.[slice * 2] ?? 0;
        return dg >= MIN_DAY_GAMES ? ((d.heroes[id]?.[slice * 2 + 1] ?? 0) / dg) * 100 : null;
      }),
      roles: (meta.roles[id] ?? []).flatMap((share, i) => (share >= ROLE_SHARE ? [i + 1] : [])),
    });
  }
  return out;
}

/** Games this patch in a rank slice. */
export const sliceGames = (meta: MetaFile, slice: RankSlice) => gamesIn(meta.days, slice);

export type Measure = "win" | "pick";

/** The change since the patch before, in points; null without a base. */
export function change(h: HeroRate, measure: Measure): number | null {
  const base = measure === "win" ? h.baseWin : h.basePick;
  return base === null ? null : (measure === "win" ? h.win : h.pick) - base;
}

/** The `count` heroes that rose and fell most since the patch before. Win rate movers need a 1% pick rate. */
export function movers(rates: HeroRate[], measure: Measure, count: number): { up: HeroRate[]; down: HeroRate[] } {
  const moved = rates
    .filter((h) => change(h, measure) !== null && (measure === "pick" || h.pick >= 1))
    .sort((a, b) => (change(b, measure) ?? 0) - (change(a, measure) ?? 0));
  return {
    up: moved.slice(0, count).filter((h) => (change(h, measure) ?? 0) > 0),
    down: moved.slice(-count).reverse().filter((h) => (change(h, measure) ?? 0) < 0),
  };
}

/** Day of the patch, 1 on the day it came out. */
export function patchDay(meta: MetaFile, now: Date): number {
  const started = Date.parse(meta.patch.startedAt);
  return Math.max(1, Math.floor((now.getTime() - started) / (24 * 60 * 60 * 1000)) + 1);
}

/** A day's short label, like "Nov 19": the date at the day's middle, since a patch day starts at the patch's hour. */
export function dayLabel(day: Pick<MetaDay, "from">): string {
  const mid = new Date(Date.parse(day.from) + 12 * 60 * 60 * 1000);
  return mid.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** "+4.3" or "−2.1" (a true minus sign), one decimal. */
export function signed(points: number): string {
  const text = Math.abs(points).toFixed(1);
  return points > 0.05 ? `+${text}` : points < -0.05 ? `−${text}` : text;
}

/** The patch before, like "7.41" for "7.42"; null when it can't be told from the name. */
export function previousPatch(name: string): string | null {
  const m = /^(\d+)\.(\d{2})$/.exec(name);
  if (!m || m[2] === "00") return null;
  return `${m[1]}.${String(Number(m[2]) - 1).padStart(2, "0")}`;
}

/** Build rows by how often games end with them: in most games, in many, and in some. Shares are in percent. */
export const BUILD_GROUPS = [
  { name: "Core", min: 50 },
  { name: "Common", min: 20 },
  { name: "Situational", min: 0 },
] as const;

/** A build's items as shares of its games, in BUILD_GROUPS; groups with no items are left out. */
export function buildGroups(build: HeroBuild): { name: string; items: { id: number; share: number }[] }[] {
  const items = build.items.map(([id, games]) => ({ id, share: (games / build.games) * 100 }));
  return BUILD_GROUPS.map((g, i) => ({
    name: g.name,
    items: items.filter((it) => it.share >= g.min && (i === 0 || it.share < BUILD_GROUPS[i - 1]!.min)),
  })).filter((g) => g.items.length > 0);
}

/** Every item id the extras show, neutral items included, for loading their names and pictures. */
export function extrasItemIds(extras: MetaExtras): number[] {
  const ids = new Set<number>(extras.newItems.map((n) => n.id));
  for (const byPosition of Object.values(extras.builds)) {
    for (const b of Object.values(byPosition)) for (const [id] of [...b.items, ...b.neutral, ...(b.early ?? [])]) ids.add(id);
  }
  return [...ids];
}

/** A hero counts for a role from this share of its games there, if the role is its main one or holds ROLE_FIRM of them. */
export const ROLE_MIN = 30;
export const ROLE_FIRM = 40;
export const LEADERS = 6;
export const DARK_HORSES = 4;
/** Dark horses with at least this win rate come first. */
const DARK_HORSE_WIN = 49;

/** A hero of a role: its numbers, its share of games in the role, and its wins above even there. */
export interface RoleHero {
  rate: HeroRate;
  share: number;
  /** Games in the role times how far the win rate is over 50%: the wins it adds over a coin flip. */
  extraWins: number;
}

/**
 * A role's heroes, its six leaders (the most wins above even, those over 50% first) and four dark horses (the
 * biggest risers since the patch before that are not leaders, those winning at least DARK_HORSE_WIN first).
 */
export function roleLeaders(meta: MetaFile, rates: HeroRate[], role: number): { pool: RoleHero[]; leaders: RoleHero[]; dark: RoleHero[] } {
  const pool: RoleHero[] = [];
  for (const rate of rates) {
    const shares = meta.roles[rate.id] ?? [];
    const share = shares[role - 1] ?? 0;
    const roleGames = (rate.games * share) / 100;
    if (share < ROLE_MIN || roleGames < MIN_GAMES || (share < ROLE_FIRM && share < Math.max(...shares))) continue;
    pool.push({ rate, share, extraWins: (roleGames * (rate.win - 50)) / 100 });
  }
  pool.sort((a, b) => b.extraWins - a.extraWins || a.rate.id - b.rate.id);
  const leaders = [...pool.filter((h) => h.rate.win >= 50), ...pool.filter((h) => h.rate.win < 50)].slice(0, LEADERS);
  const risers = pool
    .filter((h) => !leaders.includes(h) && (change(h.rate, "win") ?? 0) > 0)
    .sort((a, b) => (change(b.rate, "win") ?? 0) - (change(a.rate, "win") ?? 0));
  const dark = [...risers.filter((h) => h.rate.win >= DARK_HORSE_WIN), ...risers.filter((h) => h.rate.win < DARK_HORSE_WIN)].slice(0, DARK_HORSES);
  return { pool, leaders, dark };
}

/** Core items cost at least this; cheaper ones are early items. */
export const CORE_COST = 2000;
/** Core items end at least this share of games, in percent. */
export const CORE_SHARE = 12;
export const CORE_ITEMS = 6;

/**
 * A build as a path: early items (cheap ones bought in the first minutes, once there are buy minutes), then core
 * items (from CORE_COST, in at least CORE_SHARE of games) in the order they are bought when minutes are known,
 * else by share. Shares are in percent.
 */
export function buildPath(build: HeroBuild, items: Record<string, ItemInfo>) {
  const minutes = new Map(build.minutes ?? []);
  const core = build.items
    .filter(([id, games]) => (items[id]?.cost ?? 0) >= CORE_COST && (games / build.games) * 100 >= CORE_SHARE)
    .slice(0, CORE_ITEMS)
    .map(([id, games]) => ({ id, share: (games / build.games) * 100, minute: minutes.get(id) ?? null }));
  if (minutes.size) core.sort((a, b) => (a.minute ?? Infinity) - (b.minute ?? Infinity) || b.share - a.share);
  const early = (build.early ?? []).map(([id, games]) => ({ id, share: (games / (build.buyGames || 1)) * 100 }));
  return { early, core };
}

/** A role's items show from this many games of its heroes with builds, and at least this share of them, in percent. */
export const ROLE_ITEM_GAMES = 100;
export const ROLE_ITEM_SHARE = 5;
export const ROLE_ITEMS = 12;

/**
 * What a role builds: the share of the role's games, over every hero in `heroes` with a build in the role, that
 * ended with each core item (CORE_COST and up) or item new in this patch, most first. Twelve or six items, so the
 * tiles fill whole rows of six, three and two; empty under ROLE_ITEM_GAMES games.
 */
export function roleItems(extras: MetaExtras, heroes: number[], role: number): { games: number; items: { id: number; share: number; isNew: boolean }[] } {
  const fresh = new Set(extras.newItems.map((n) => n.id));
  const counts = new Map<number, number>();
  let games = 0;
  for (const hero of heroes) {
    const build = extras.builds[hero]?.[role];
    if (!build) continue;
    games += build.games;
    for (const [id, n] of build.items) {
      if ((extras.items[id]?.cost ?? 0) >= CORE_COST || fresh.has(id)) counts.set(id, (counts.get(id) ?? 0) + n);
    }
  }
  if (games < ROLE_ITEM_GAMES) return { games, items: [] };
  const items = [...counts]
    .map(([id, n]) => ({ id, share: (n / games) * 100, isNew: fresh.has(id) }))
    .filter((i) => i.share >= ROLE_ITEM_SHARE)
    .sort((a, b) => b.share - a.share || a.id - b.id);
  const shown = items.length >= ROLE_ITEMS ? ROLE_ITEMS : items.length >= 6 ? 6 : items.length;
  return { games, items: items.slice(0, shown) };
}
