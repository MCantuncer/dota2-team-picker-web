/**
 * Admin Data Status page: how far the two slow STRATZ jobs have come.
 * - Two-path builds: each hero and position's skill build slice gets item paths (what wins bought when a key
 *   item was late) when the hero data refresh fetches it again, a few slices per run.
 * - Matchup fill: the hourly backfill caches the 10 most played heroes of each position against every enemy
 *   (the backend's backfillPlan), so the item checks have games to judge. Read from admin_matchup_fill.
 */
import { SNAPSHOT_URL } from "@/lib/engine/snapshot";
import type { Snapshot } from "@/lib/engine/types";

/** Heroes of each position the backfill fills first (backend backfill.ts HEROES_PER_POSITION). */
export const HEROES_PER_POSITION = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Done out of total, and the net change over the last day, for the pace. */
export interface Progress {
  done: number;
  total: number;
  /** Done in the last day, less any that will stop counting in the next day. */
  lastDay: number;
}

/** Two-path builds: slices with item paths for this patch, of every slice the refresh keeps. */
export interface TwoPathStatus extends Progress {
  /** Done slices where at least one key item has a late path. */
  withPath: number;
}

/** The current patch's STRATZ game version: the newest one any skill build slice has (backend patchVersion). */
export function patchVersion(snapshot: Pick<Snapshot, "skillBuilds">): number {
  let latest = 0;
  for (const byPosition of Object.values(snapshot.skillBuilds ?? {})) {
    for (const s of Object.values(byPosition)) latest = Math.max(latest, s?.gameVersionId ?? 0);
  }
  return latest;
}

/**
 * Every hero and position the refresh fetches skill builds for: the ones with item timings for every rank
 * (each hero's main positions, the backend's startRequests), for heroes in the hero list. A slice is done
 * when it has item paths for the current patch; until then the refresh fetches it again.
 */
export function twoPathStatus(snapshot: Pick<Snapshot, "heroes" | "skillBuilds" | "itemTimings">, nowMs: number): TwoPathStatus {
  const version = patchVersion(snapshot);
  let total = 0;
  let done = 0;
  let withPath = 0;
  let lastDay = 0;
  for (const [hero, byPosition] of Object.entries(snapshot.itemTimings ?? {})) {
    if (!snapshot.heroes[hero]) continue;
    for (const [position, slices] of Object.entries(byPosition)) {
      if (!slices.all) continue;
      total++;
      const s = snapshot.skillBuilds?.[hero]?.[position];
      if (!s?.itemPaths || s.gameVersionId !== version) continue;
      done++;
      if (Object.values(s.itemPaths).some((k) => k.path)) withPath++;
      if (nowMs - Date.parse(s.at) < DAY_MS) lastDay++;
    }
  }
  return { done, total, lastDay, withPath };
}

/** The hero data as published now, or null when it can't be read; several MB, so not kept in Next's data cache. */
export async function readSnapshot(): Promise<Snapshot | null> {
  try {
    const res = await fetch(SNAPSHOT_URL, { cache: "no-store" });
    if (!res.ok) {
      console.error("Data status: hero data download failed", res.status);
      return null;
    }
    // The backend's refresh workflow publishes the engine's Snapshot shape.
    return (await res.json()) as Snapshot;
  } catch (err) {
    console.error("Data status: hero data download failed", err);
    return null;
  }
}

/** One row of admin_matchup_fill: the cache for one hero and position. */
export interface FillRow {
  hero: number;
  position: number;
  slices: number;
  fresh: number;
  /** Fetched in the last day. */
  lastDay: number;
  /** Fresh now but stale within a day (fetched 6 to 7 days ago). */
  expiring: number;
  lastFetched: string;
}

/** One planned hero and position, with its fresh enemies out of every other hero. */
export interface FillHero {
  hero: number;
  fresh: number;
  total: number;
}

/** The backfill plan's progress: overall, and per position. */
export interface FillStatus extends Progress {
  positions: { position: number; heroes: FillHero[]; done: number; total: number }[];
  /** The newest fetch in the whole cache for this patch, users' lookups included. */
  lastFetched?: string;
}

const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** The rows admin_matchup_fill returns, or null when any isn't the shape we expect, so the page shows an error. */
export function readFill(rows: unknown): FillRow[] | null {
  if (!Array.isArray(rows)) return null;
  const out: FillRow[] = [];
  // Array.isArray narrows to any[]; unknown keeps each row checked.
  for (const row of rows as unknown[]) {
    if (!row || typeof row !== "object") return null;
    // An object; every field is checked before it is used.
    const { hero_id, position, slices, fresh, last_day, expiring, last_fetched } = row as Record<string, unknown>;
    if (!count(hero_id) || !count(position) || !count(slices) || !count(fresh) || !count(last_day) || !count(expiring)) return null;
    if (typeof last_fetched !== "string" || Number.isNaN(Date.parse(last_fetched))) return null;
    out.push({ hero: hero_id, position, slices, fresh, lastDay: last_day, expiring, lastFetched: last_fetched });
  }
  return out;
}

/**
 * The backfill plan (the HEROES_PER_POSITION most played heroes of each position, by the item timings'
 * games, against every other hero) and how much of it the cache holds fresh. The pace is the last day's
 * fetches (the backfill's and users' lookups) less the fresh ones going stale within a day, so it can be 0
 * or below while the cache only keeps up.
 */
export function fillStatus(snapshot: Pick<Snapshot, "heroes" | "itemTimings">, rows: FillRow[]): FillStatus {
  const heroes = Object.keys(snapshot.heroes).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
  const enemies = Math.max(heroes.length - 1, 0);
  const played = (hero: number, position: number) => snapshot.itemTimings?.[hero]?.[position]?.all?.games ?? 0;
  const byKey = new Map(rows.map((r) => [`${r.hero}:${r.position}`, r]));
  let lastDay = 0;
  const positions = [1, 2, 3, 4, 5].map((position) => {
    const list = heroes
      .filter((h) => played(h, position) > 0)
      .sort((a, b) => played(b, position) - played(a, position) || a - b)
      .slice(0, HEROES_PER_POSITION)
      .map((hero): FillHero => {
        const r = byKey.get(`${hero}:${position}`);
        lastDay += Math.min(r?.lastDay ?? 0, enemies) - Math.min(r?.expiring ?? 0, enemies);
        return { hero, fresh: Math.min(r?.fresh ?? 0, enemies), total: enemies };
      });
    return {
      position,
      heroes: list,
      done: list.reduce((n, h) => n + h.fresh, 0),
      total: list.reduce((n, h) => n + h.total, 0),
    };
  });
  const lastFetched = rows.reduce<string | undefined>((m, r) => (!m || Date.parse(r.lastFetched) > Date.parse(m) ? r.lastFetched : m), undefined);
  return {
    done: positions.reduce((n, p) => n + p.done, 0),
    total: positions.reduce((n, p) => n + p.total, 0),
    lastDay,
    positions,
    lastFetched,
  };
}

/** Whole percent, never 100 until every one is done. */
export function percent({ done, total }: { done: number; total: number }): number {
  if (total <= 0) return 0;
  const p = Math.floor((done / total) * 100);
  return done < total ? Math.min(p, 99) : 100;
}

/** "About 3 days left" at the last day's pace, or why there is no estimate. */
export function etaText({ done, total, lastDay }: Progress): string {
  const left = total - done;
  if (left <= 0) return "Done";
  if (lastDay <= 0) return "Not gaining at the last day's pace";
  const days = Math.ceil(left / lastDay);
  return days <= 1 ? "About a day left at this pace" : `About ${days} days left at this pace`;
}

/**
 * The next scheduled run after `nowMs` of a GitHub cron that runs at `minute` past each of `hours` (UTC).
 * GitHub often starts scheduled runs late or skips them, so the page says "about".
 */
export function nextRun(nowMs: number, hours: number[], minute: number): number {
  const day = Math.floor(nowMs / DAY_MS) * DAY_MS;
  const times = [0, 1].flatMap((d) => hours.map((h) => day + d * DAY_MS + (h * 60 + minute) * 60 * 1000));
  return times.filter((t) => t > nowMs).sort((a, b) => a - b)[0] ?? day + DAY_MS;
}

/** Hours (UTC) of the hero data refresh: "17 2,6,10,14 * * *" in the backend's refresh-data workflow. */
export const REFRESH_HOURS = [2, 6, 10, 14];
/** Minute past the hour of the hero data refresh. */
export const REFRESH_MINUTE = 17;
/** Hours (UTC) of the matchup backfill: "40 * * * *" in the backend's matchup-backfill workflow, every hour. */
export const BACKFILL_HOURS = Array.from({ length: 24 }, (_, h) => h);
/** Minute past the hour of the matchup backfill. */
export const BACKFILL_MINUTE = 40;
