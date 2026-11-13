import type { SupabaseClient } from "@supabase/supabase-js";
import type { DraftEntry } from "@/lib/draft";
import type { Side } from "@/lib/draft-reader/geometry";
import type { Position } from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";

/** A planned teammate to seat and invite when the party starts. */
export interface PlannedSeat {
  id: string;
  name: string;
  position: Position;
}

/** What starting the party left undone, shown once on the party screen. */
export interface StartNote {
  /** Players whose invite failed, with why. They are still seated unless the seat itself failed. */
  notSent: { name: string; why: string }[];
  /** The board typed before the party, when it could not be copied into the party draft. */
  boardLost: boolean;
  /** The side picked before the party, so the party screen keeps it. */
  side: Side | null;
}

const NOTE_KEY = "party-start-note";

/** Keeps the note for the party screen, which loads after the page refreshes. */
export function saveStartNote(note: StartNote) {
  if (!note.notSent.length && !note.boardLost && !note.side) return;
  try {
    sessionStorage.setItem(NOTE_KEY, JSON.stringify(note));
  } catch {
    // Without storage the note is lost; the seats still show who is Not on Site.
  }
}

/** Reads the note once, then forgets it. Anything malformed reads as no note. */
export function takeStartNote(): StartNote | null {
  try {
    const raw = sessionStorage.getItem(NOTE_KEY);
    sessionStorage.removeItem(NOTE_KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const { notSent, boardLost, side } = v as Record<string, unknown>;
    if (!Array.isArray(notSent) || typeof boardLost !== "boolean") return null;
    const clean = notSent.filter(
      (n): n is { name: string; why: string } =>
        typeof n === "object" && n !== null && typeof n.name === "string" && typeof n.why === "string",
    );
    return { notSent: clean, boardLost, side: side === "radiant" || side === "dire" ? side : null };
  } catch {
    return null;
  }
}

/** "Not sent to Mert: ...". "Board Not Copied, Enter the Heroes Again." when the board stayed behind. */
export function startNoteLines(note: StartNote): string[] {
  return [
    ...note.notSent.map((n) => `Invite not sent to ${n.name}: ${n.why}`),
    ...(note.boardLost ? ["Board Not Copied, Enter the Heroes Again."] : []),
  ];
}

/**
 * Starts a party from the planned seats: the player leads it in their seat, each planned teammate is
 * seated and invited to theirs, and the board typed so far moves into the party draft. Only a failed
 * start stops it (nothing was made); failed invites and a failed board copy are reported in the note.
 */
export async function startPartyFromSeats(
  supabase: SupabaseClient<Database>,
  {
    team,
    mySeat,
    planned,
    board,
    side,
  }: { team: string | null; mySeat: Position; planned: PlannedSeat[]; board: DraftEntry[]; side: Side | null },
): Promise<{ error: string } | { note: StartNote }> {
  const { error } = await supabase.rpc("start_party", { seat: mySeat, ...(team ? { team } : {}) });
  if (error) return { error: `Party not started: ${error.message}` };

  const notSent: StartNote["notSent"] = [];
  for (const p of planned) {
    const { error: inviteError } = await supabase.rpc("invite_to_party", { target: p.id, seat: p.position });
    if (inviteError) notSent.push({ name: p.name, why: inviteError.message });
  }

  let boardLost = false;
  if (board.length) {
    const { data: draft, error: draftError } = await supabase.rpc("start_party_draft");
    const actions = board.map((e) => ({ kind: e.kind, hero_id: e.heroId, position: e.position }));
    const copied = draftError || !draft ? null : await supabase.rpc("copy_board_to_party_draft", { draft, actions });
    boardLost = !copied || Boolean(copied.error);
  }
  return { note: { notSent, boardLost, side } };
}
