import type { Position } from "@/lib/engine/types";
import type { DraftAction, DraftEntry } from "@/lib/draft";

/** One row of a signed-in player's `solo_draft_actions` table. */
export interface SoloActionRow {
  id: number;
  kind: string;
  hero_id: number;
  position: number | null;
  /** The browser tab that made the entry. */
  device: string;
}

/** The PC counts as reading Dota this long after its last beat. It beats at least every 5 seconds while reading. */
export const WATCH_FRESH_MS = 15_000;
/** A phone counts as following this long after it was last seen. It says so every 20 seconds while open. */
export const PHONE_FRESH_MS = 45_000;

/**
 * The actions that turn board `from` into board `to`: removals first, then entries and position changes. Undo uses
 * it to go back to an earlier board through the action log, so the other device sees the Undo too and keeps any
 * entry it made in between.
 */
export function diffActions(from: DraftEntry[], to: DraftEntry[]): DraftAction[] {
  const before = new Map(from.map((e) => [e.heroId, e]));
  const after = new Map(to.map((e) => [e.heroId, e]));
  const removes: DraftAction[] = from
    .filter((e) => after.get(e.heroId)?.kind !== e.kind)
    .map((e) => ({ kind: "remove", heroId: e.heroId }));
  const adds: DraftAction[] = to
    .filter((e) => {
      const was = before.get(e.heroId);
      return was?.kind !== e.kind || was.position !== e.position;
    })
    .map((e) => ({ kind: e.kind, heroId: e.heroId, position: e.kind === "ban" ? null : e.position }));
  return [...removes, ...adds];
}

/**
 * What takes back one change, from the board before it to the board after it: only the heroes that change moved,
 * so an Undo never touches what the other device entered since.
 */
export function undoActions(before: DraftEntry[], after: DraftEntry[]): DraftAction[] {
  const key = (e: DraftEntry | undefined) => (e ? `${e.kind}:${e.position}` : "");
  const was = new Map(before.map((e) => [e.heroId, e]));
  const now = new Map(after.map((e) => [e.heroId, e]));
  const changed = new Set([...was.keys(), ...now.keys()].filter((id) => key(was.get(id)) !== key(now.get(id))));
  return diffActions(after, before).filter((a) => changed.has(a.heroId));
}

const KINDS = new Set(["ally", "enemy", "ban", "remove"]);

/** A row from the server or a live update, checked, or null when it isn't one. */
export function toSoloRow(v: unknown): SoloActionRow | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  const position = r.position ?? null;
  if (
    !Number.isSafeInteger(r.id) ||
    typeof r.kind !== "string" ||
    !KINDS.has(r.kind) ||
    !Number.isSafeInteger(r.hero_id) ||
    (r.hero_id as number) <= 0 ||
    typeof r.device !== "string" ||
    !(position === null || (Number.isInteger(position) && (position as number) >= 1 && (position as number) <= 5))
  )
    return null;
  return {
    id: r.id as number,
    kind: r.kind,
    hero_id: r.hero_id as number,
    position: position as Position | null,
    device: r.device,
  };
}

/** A row as a draft action. */
export const soloAction = (row: SoloActionRow): DraftAction => ({
  kind: row.kind as DraftAction["kind"],
  heroId: row.hero_id,
  position: row.position as Position | null,
});

/** Rows from a fresh load and from live updates together, each once, oldest first. */
export function mergeSoloRows(rows: SoloActionRow[], added: SoloActionRow[]): SoloActionRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const r of added) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/**
 * Heroes on the board that another device put there, so Watch Dota on this PC doesn't learn how they look from a
 * slot it couldn't read: the phone typed them in, the PC didn't miss them.
 */
export function enteredElsewhere(rows: SoloActionRow[], board: DraftEntry[], device: string): Set<number> {
  const last = new Map<number, string>();
  for (const r of rows) if (r.kind !== "remove") last.set(r.hero_id, r.device);
  return new Set(board.flatMap((e) => (last.has(e.heroId) && last.get(e.heroId) !== device ? [e.heroId] : [])));
}

/** A random id for this browser tab, kept for the tab's life so a reload stays the same device. */
export function tabDevice(): string {
  try {
    const saved = sessionStorage.getItem(DEVICE_KEY);
    if (saved && /^[0-9a-f-]{36}$/.test(saved)) return saved;
    const id = crypto.randomUUID();
    sessionStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const DEVICE_KEY = "solo-draft-device";

/** A phone or tablet: a touch screen with no mouse, which can't run Watch Dota and follows a PC instead. */
export const isPhone = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
