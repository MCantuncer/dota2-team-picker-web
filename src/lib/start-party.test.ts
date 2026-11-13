import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { saveStartNote, startNoteLines, startPartyFromSeats, takeStartNote } from "@/lib/start-party";

type Answer = { data?: unknown; error: { message: string } | null };
function client(answers: Record<string, Answer | ((args: Record<string, unknown>) => Answer)>) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    const a = answers[name] ?? { data: null, error: null };
    return typeof a === "function" ? a(args) : a;
  });
  return { rpc, supabase: { rpc } as unknown as SupabaseClient<Database> };
}

const planned = [
  { id: "mert", name: "Mert", position: 5 as const },
  { id: "arda", name: "Arda", position: 4 as const },
];

describe("startPartyFromSeats", () => {
  it("leads from the player's seat, seats and invites each teammate, and copies the board", async () => {
    const { rpc, supabase } = client({ start_party_draft: { data: "d1", error: null } });
    const result = await startPartyFromSeats(supabase, {
      team: "owls",
      mySeat: 2,
      planned,
      board: [
        { kind: "ally", heroId: 8, position: 1 },
        { kind: "ban", heroId: 14, position: null },
      ],
      side: "dire",
    });
    expect(result).toEqual({ note: { notSent: [], boardLost: false, side: "dire" } });
    expect(rpc.mock.calls).toEqual([
      ["start_party", { seat: 2, team: "owls" }],
      ["invite_to_party", { target: "mert", seat: 5 }],
      ["invite_to_party", { target: "arda", seat: 4 }],
      ["start_party_draft"],
      [
        "copy_board_to_party_draft",
        {
          draft: "d1",
          actions: [
            { kind: "ally", hero_id: 8, position: 1 },
            { kind: "ban", hero_id: 14, position: null },
          ],
        },
      ],
    ]);
  });

  it("stops when the party can't start, before any invite", async () => {
    const { rpc, supabase } = client({ start_party: { error: { message: "Not signed in" } } });
    const result = await startPartyFromSeats(supabase, { team: null, mySeat: 1, planned, board: [], side: null });
    expect(result).toEqual({ error: "Party not started: Not signed in" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("lists failed invites by name and says when the board stayed behind", async () => {
    const { rpc, supabase } = client({
      invite_to_party: (args) => (args.target === "mert" ? { error: { message: "Mert Is in Emre's Party" } } : { error: null }),
      start_party_draft: { data: "d1", error: null },
      copy_board_to_party_draft: { error: { message: "This draft already has heroes" } },
    });
    const result = await startPartyFromSeats(supabase, {
      team: null,
      mySeat: 1,
      planned,
      board: [{ kind: "enemy", heroId: 2, position: null }],
      side: null,
    });
    expect(rpc).toHaveBeenCalledWith("start_party", { seat: 1 });
    expect(result).toEqual({ note: { notSent: [{ name: "Mert", why: "Mert Is in Emre's Party" }], boardLost: true, side: null } });
    if ("note" in result)
      expect(startNoteLines(result.note)).toEqual([
        "Invite not sent to Mert: Mert Is in Emre's Party",
        "Board Not Copied, Enter the Heroes Again.",
      ]);
  });

  it("skips the draft when nothing was typed", async () => {
    const { rpc, supabase } = client({});
    await startPartyFromSeats(supabase, { team: null, mySeat: 3, planned: [], board: [], side: null });
    expect(rpc.mock.calls.map((c) => c[0])).toEqual(["start_party"]);
  });
});

describe("start note", () => {
  beforeEach(() => sessionStorage.clear());

  it("is read once, and only when there is something to say", () => {
    saveStartNote({ notSent: [], boardLost: false, side: null });
    expect(takeStartNote()).toBeNull();
    saveStartNote({ notSent: [{ name: "Mert", why: "x" }], boardLost: false, side: "radiant" });
    expect(takeStartNote()).toEqual({ notSent: [{ name: "Mert", why: "x" }], boardLost: false, side: "radiant" });
    expect(takeStartNote()).toBeNull();
  });

  it("reads a tampered note as safely as it can", () => {
    sessionStorage.setItem("party-start-note", JSON.stringify({ notSent: [{ name: 1 }, { name: "A", why: "b" }], boardLost: true, side: "top" }));
    expect(takeStartNote()).toEqual({ notSent: [{ name: "A", why: "b" }], boardLost: true, side: null });
    sessionStorage.setItem("party-start-note", "{");
    expect(takeStartNote()).toBeNull();
  });
});
