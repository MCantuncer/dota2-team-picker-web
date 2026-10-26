import type { Position } from "@/lib/engine/types";

/** Where a hero sits in a draft: on your team (with its position when known), on the enemy team, or banned. */
export interface DraftEntry {
  heroId: number;
  kind: "ally" | "enemy" | "ban";
  position: Position | null;
}

/** One change to a draft. `remove` takes the hero back out. Party drafts store these as rows. */
export interface DraftAction {
  kind: DraftEntry["kind"] | "remove";
  heroId: number;
  position?: Position | null;
}

export const TEAM_SIZE = 5;
export const MAX_BANS = 24;

/**
 * The draft after one action, by the same rules as the party draft table: a hero is in the draft
 * once, a team has 5 picks, at most 24 bans, and only your own picks have a position. Entering an
 * ally again only changes its position. An action that breaks a rule returns the draft unchanged.
 */
export function applyAction(draft: DraftEntry[], action: DraftAction): DraftEntry[] {
  const current = draft.find((e) => e.heroId === action.heroId);
  if (action.kind === "remove") return current ? draft.filter((e) => e !== current) : draft;

  const position = action.kind === "ally" ? (action.position ?? null) : null;
  if (current) {
    if (current.kind !== "ally" || action.kind !== "ally" || current.position === position) return draft;
    return draft.map((e) => (e === current ? { ...e, position } : e));
  }
  const count = draft.filter((e) => e.kind === action.kind).length;
  if (count >= (action.kind === "ban" ? MAX_BANS : TEAM_SIZE)) return draft;
  return [...draft, { heroId: action.heroId, kind: action.kind, position }];
}

/** The draft built from a list of actions, oldest first. */
export const replay = (actions: DraftAction[]) => actions.reduce(applyAction, [] as DraftEntry[]);

/** The heroes of one kind, in the order they were entered. */
export const heroesOf = (draft: DraftEntry[], kind: DraftEntry["kind"]) =>
  draft.filter((e) => e.kind === kind).map((e) => e.heroId);

/**
 * Splits an optional position digit off a typed hero name, so "cm5" or "cm 5" is Crystal Maiden at
 * position 5. Only a trailing 1 to 5 counts.
 */
export function splitPosition(text: string): { query: string; position: Position | null } {
  const match = /^(.*?)\s*([1-5])$/.exec(text.trim());
  if (!match || !match[1]) return { query: text.trim(), position: null };
  return { query: match[1], position: Number(match[2]) as Position };
}
