/**
 * Hero pool cards: "Add Monkey King to your carry heroes?", opened by the backend's trends job
 * from the player's own recent games. The card's words come from the backend, fixed when it opened.
 */

/** A card ready to show. */
export interface PoolCard {
  id: string;
  heroId: number;
  position: number;
  question: string;
  reason: string;
}

/** One pool_suggestions row, as the site reads it. */
export interface PoolCardRow {
  id: string;
  hero_id: number;
  position: number;
  status: string;
  question: string;
  reason: string;
  snooze_until: string | null;
}

/** Position names inside a sentence (pos 1 to 5). */
export const POSITION_WORDS: Record<number, string> = {
  1: "carry",
  2: "mid",
  3: "offlane",
  4: "soft support",
  5: "hard support",
};

/** Pages where a card would get in the way: the draft, and the sign in and join flows. */
const HIDDEN_PREFIXES = ["/draft", "/login", "/signup", "/invite", "/join"];

/** True on pages that never show a card. */
export function isPoolCardHidden(pathname: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Cards are behind a flag until the coverage looks good (NEXT_PUBLIC_POOL_CARDS=on). */
export function poolCardsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_POOL_CARDS === "on";
}

/**
 * The card to show now: an open one, or a snoozed one whose snooze ran out. Rows come newest
 * first, so the newest due card wins. Rows with an unknown position are skipped.
 */
export function dueCard(rows: PoolCardRow[], now: number): PoolCard | null {
  const row = rows.find(
    (r) =>
      POSITION_WORDS[r.position] !== undefined &&
      (r.status === "open" || (r.status === "snoozed" && r.snooze_until !== null && Date.parse(r.snooze_until) <= now)),
  );
  return row ? { id: row.id, heroId: row.hero_id, position: row.position, question: row.question, reason: row.reason } : null;
}
