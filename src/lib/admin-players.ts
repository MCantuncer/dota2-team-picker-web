/** Admin Players page: reading the admin only database functions and showing their numbers in Turkey time. */

/** The admin's own clock; the database counts days in the same zone. */
export const TURKEY = "Europe/Istanbul";
/** How many days the signup chart shows, as admin_signup_stats returns them. */
export const CHART_DAYS = 14;
/** Players per page of the newest players list. */
export const PAGE_SIZE = 20;

export interface SignupStats {
  total: number;
  today: number;
  last7Days: number;
  /** The date of perDay[0], as YYYY-MM-DD in Turkey time. */
  firstDay: string;
  /** One count per day, oldest first, ending today. */
  perDay: number[];
}

export interface AdminPlayer {
  userId: string;
  name: string;
  avatarUrl: string | null;
  steamId: string;
  rankTier: number | null;
  joinedAt: string;
  heroCount: number;
}

const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** The one row admin_signup_stats returns, or null when it isn't the shape we expect. */
export function readStats(rows: unknown): SignupStats | null {
  const row: unknown = Array.isArray(rows) ? rows[0] : null;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const perDay = r.per_day;
  if (!count(r.total) || !count(r.today) || !count(r.last_7_days)) return null;
  if (typeof r.first_day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.first_day)) return null;
  if (!Array.isArray(perDay) || perDay.length !== CHART_DAYS || !perDay.every(count)) return null;
  return { total: r.total, today: r.today, last7Days: r.last_7_days, firstDay: r.first_day, perDay };
}

/** The rows admin_newest_players returns. */
export function readPlayers(
  rows: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    steam_id: string;
    rank_tier: number | null;
    joined_at: string;
    hero_count: number;
  }[],
): AdminPlayer[] {
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.display_name || "Player",
    avatarUrl: r.avatar_url,
    steamId: r.steam_id,
    rankTier: r.rank_tier,
    joinedAt: r.joined_at,
    heroCount: r.hero_count,
  }));
}

/** The calendar date of a moment in Turkey time, as YYYY-MM-DD. */
export function turkeyDate(ms: number): string {
  // en-CA writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TURKEY, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}

/** YYYY-MM-DD plus some days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "6 Nov" for a YYYY-MM-DD date. */
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${date}T00:00:00Z`));
}

/** When a player joined, in Turkey time: "Today, 14:32", "Yesterday, 23:41" or "6 Nov, 18:07". */
export function joinedText(joinedAt: string, nowMs: number): string {
  const at = Date.parse(joinedAt);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TURKEY, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
  const day = turkeyDate(at);
  const today = turkeyDate(nowMs);
  if (day === today) return `Today, ${time}`;
  if (day === addDays(today, -1)) return `Yesterday, ${time}`;
  return `${shortDate(day)}, ${time}`;
}

/** "1 hero", "12 heroes", "No heroes". */
export function heroCountText(n: number): string {
  if (n === 0) return "No heroes";
  return n === 1 ? "1 hero" : `${n} heroes`;
}

/** The player's Steam Community page. */
export function steamProfileUrl(steamId: string): string {
  return `https://steamcommunity.com/profiles/${steamId}`;
}
