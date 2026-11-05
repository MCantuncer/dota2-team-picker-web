/**
 * Game check-in: once a Draft board holds all 10 heroes it is saved for the player, Start Game marks it as
 * a game they are playing, and after the game the site asks how it went. The backend finds the result on
 * OpenDota; this module holds the page-side rules.
 */
import type { DraftEntry } from "./draft";
import { TEAM_SIZE } from "./draft";

/** The check-in is behind a flag until Can turns it on (NEXT_PUBLIC_GAME_CHECKIN=on). */
export function gameCheckInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GAME_CHECKIN === "on";
}

/** True when both teams have all five heroes. */
export function isFullBoard(draft: DraftEntry[]): boolean {
  return (
    draft.filter((e) => e.kind === "ally").length === TEAM_SIZE && draft.filter((e) => e.kind === "enemy").length === TEAM_SIZE
  );
}

/** The arguments `save_game_check_in` takes for a board. */
export interface CheckInBoard {
  key: string | null;
  party_draft: string | null;
  allies: number[];
  ally_positions: number[];
  enemies: number[];
  bans: number[];
  my_position: number;
  my_hero: number | null;
  shown: number[];
  story_shown: boolean;
}

/**
 * The board as the save function wants it. A party board sends only the party draft: the backend reads
 * the heroes from the shared draft. Positions nobody set are 0.
 */
export function toCheckInBoard({
  draft,
  key,
  partyDraftId,
  myPosition,
  myHero,
  shown,
  storyShown,
}: {
  draft: DraftEntry[];
  key: string | null;
  partyDraftId: string | null;
  myPosition: number;
  myHero: number | null;
  shown: number[];
  storyShown: boolean;
}): CheckInBoard {
  const allies = draft.filter((e) => e.kind === "ally");
  return {
    key: partyDraftId ? null : key,
    party_draft: partyDraftId,
    allies: allies.map((e) => e.heroId),
    ally_positions: allies.map((e) => e.position ?? 0),
    enemies: draft.filter((e) => e.kind === "enemy").map((e) => e.heroId),
    bans: draft.filter((e) => e.kind === "ban").map((e) => e.heroId),
    my_position: myPosition,
    my_hero: myHero,
    shown: shown.slice(0, 8),
    story_shown: storyShown,
  };
}

const KEY = "solo-draft-key";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The id of the solo board in this browser, made the first time it is needed and kept with the board,
 * so edits to the same board update the same saved game. `forgetSoloBoardKey` starts a new one.
 */
export function soloBoardKey(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && UUID.test(saved)) return saved;
    const key = crypto.randomUUID();
    localStorage.setItem(KEY, key);
    return key;
  } catch {
    // Without storage a reload makes a new board; the backend's daily limit keeps that in check.
    return crypto.randomUUID();
  }
}

export function forgetSoloBoardKey(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing kept, nothing to forget.
  }
}

/** "Started 14 min ago", "Started just now". */
export function startedAgo(startedAt: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(startedAt)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return "Started just now";
  if (minutes < 60) return `Started ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `Started ${hours} h ${minutes % 60} min ago`;
}
