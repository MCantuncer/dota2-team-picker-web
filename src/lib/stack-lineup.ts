import { POSITIONS, type Position } from "@/lib/engine/types";

/** Players in one game, so ticked players per Stack draft. */
export const LINEUP_MAX = 5;

/** Someone in the Stack, as the "Plan For" list shows them. */
export interface LineupPerson {
  id: string;
  name: string;
  /** Their favorite positions, best first. */
  positions: Position[];
  /** False when their heroes aren't shared with you (a Manager planning never gets the owner's). */
  canPlay: boolean;
}

/** One ticked player and the position they play this game. */
export interface LineupEntry {
  id: string;
  position: Position;
}

/** What the browser remembers between visits: which Stack, and who plays where. */
export interface SavedLineup {
  stackId: string;
  picks: LineupEntry[];
}

/** One saved lineup per account, so another account on the same browser never sees it. */
export const lineupStorageKey = (userId: string) => `stack-lineup:${userId}`;

const isPosition = (v: unknown): v is Position => POSITIONS.includes(v as Position);

export function isSavedLineup(v: unknown): v is SavedLineup {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.stackId === "string" &&
    Array.isArray(s.picks) &&
    s.picks.every(
      (p) => typeof p === "object" && p !== null && typeof (p as LineupEntry).id === "string" && isPosition((p as LineupEntry).position),
    )
  );
}

/** A person's first favorite position nobody has yet, else the first free position. */
export function defaultPosition(person: Pick<LineupPerson, "positions">, taken: Set<Position>): Position {
  return person.positions.find((p) => !taken.has(p)) ?? POSITIONS.find((p) => !taken.has(p)) ?? person.positions[0] ?? 1;
}

/** Ticks or unticks a person. Ticking past five, or someone who can't play, changes nothing. */
export function togglePerson(lineup: LineupEntry[], person: LineupPerson): LineupEntry[] {
  if (lineup.some((e) => e.id === person.id)) return lineup.filter((e) => e.id !== person.id);
  if (!person.canPlay || lineup.length >= LINEUP_MAX) return lineup;
  const taken = new Set(lineup.map((e) => e.position));
  return [...lineup, { id: person.id, position: defaultPosition(person, taken) }];
}

/** Moves a player to a position; whoever had it takes the player's old one. */
export function setPosition(lineup: LineupEntry[], id: string, position: Position): LineupEntry[] {
  const current = lineup.find((e) => e.id === id);
  if (!current || current.position === position) return lineup;
  return lineup.map((e) =>
    e.id === id ? { ...e, position } : e.position === position ? { ...e, position: current.position } : e,
  );
}

/**
 * A saved lineup checked against the Stack as it is now: people who left or can't be planned for
 * drop out, nobody appears twice, two players never share a position, and at most five stay.
 */
export function cleanLineup(saved: LineupEntry[], people: LineupPerson[]): LineupEntry[] {
  const playable = new Map(people.filter((p) => p.canPlay).map((p) => [p.id, p]));
  const out: LineupEntry[] = [];
  for (const e of saved) {
    const person = playable.get(e.id);
    if (!person || out.some((o) => o.id === e.id) || out.length >= LINEUP_MAX) continue;
    const taken = new Set(out.map((o) => o.position));
    out.push({ id: e.id, position: taken.has(e.position) ? defaultPosition(person, taken) : e.position });
  }
  return out;
}
