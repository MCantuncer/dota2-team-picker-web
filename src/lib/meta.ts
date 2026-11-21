import { SUPABASE_URL } from "@/lib/supabase/env";
import type { ItemInfo } from "@/lib/engine/types";

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
const isBuild = (x: unknown): x is HeroBuild => isRecord(x) && typeof x.games === "number" && isPairs(x.items, 2) && isPairs(x.neutral, 2);

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
    isRecord(x.items)
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
  /** Share of games the hero was in, and its win rate, this patch. */
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

function total(days: MetaDay[], hero: string, slice: RankSlice): [number, number] {
  let games = 0;
  let wins = 0;
  for (const d of days) {
    games += d.heroes[hero]?.[slice * 2] ?? 0;
    wins += d.heroes[hero]?.[slice * 2 + 1] ?? 0;
  }
  return [games, wins];
}

const gamesIn = (days: MetaDay[], slice: RankSlice) => days.reduce((n, d) => n + (d.games[slice] ?? 0), 0);

/** Every hero's numbers in a rank slice, leaving out heroes under MIN_GAMES this patch. */
export function heroRates(meta: MetaFile, slice: RankSlice): HeroRate[] {
  const games = gamesIn(meta.days, slice);
  const baseGames = gamesIn(meta.base, slice);
  const out: HeroRate[] = [];
  const ids = new Set(meta.days.flatMap((d) => Object.keys(d.heroes)));
  for (const id of ids) {
    const [g, w] = total(meta.days, id, slice);
    if (g < MIN_GAMES || games <= 0) continue;
    const [bg, bw] = total(meta.base, id, slice);
    const hasBase = bg >= MIN_GAMES && baseGames > 0;
    out.push({
      id: Number(id),
      games: g,
      pick: (g / games) * 100,
      win: (w / g) * 100,
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
    for (const b of Object.values(byPosition)) for (const [id] of [...b.items, ...b.neutral]) ids.add(id);
  }
  return [...ids];
}
