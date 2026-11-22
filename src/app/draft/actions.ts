"use server";

import { toParty } from "@/lib/party";
import { createClient } from "@/lib/supabase/server";

/** The database's answer when someone other than the party's Draft Captain changes the draft. */
const CAPTAIN_ONLY = "42501";

/**
 * New Draft from another page: the open draft ends here, before Draft opens, so the old board never shows. In a
 * party it is the party's draft (unless someone else is Draft Captain, who keeps it); otherwise the player's own.
 * An empty board is kept as it is. Returns a message when it failed, so Draft can try again once it has loaded.
 */
export async function startNewDraft(): Promise<string | null> {
  const supabase = await createClient();
  const [{ data: partyRows, error: partyError }, { data: open, error: openError }] = await Promise.all([
    supabase.rpc("party_view"),
    supabase.from("solo_drafts").select("id, side").is("ended_at", null).maybeSingle(),
  ]);
  if (partyError) return partyError.message;

  if (toParty(partyRows)) {
    const { data: draft, error } = await supabase.rpc("start_party_draft");
    if (error) return error.message;
    const { data: used, error: usedError } = await supabase.from("draft_actions").select("id").eq("draft_id", draft).limit(1);
    if (usedError) return usedError.message;
    if (!used.length) return null;
    const { error: endError } = await supabase.rpc("end_party_draft", { draft });
    // Someone else runs the draft: it stays, and Draft opens it.
    return endError && endError.code !== CAPTAIN_ONLY ? endError.message : null;
  }

  if (openError) return openError.message;
  if (!open) return null;
  if (!open.side) {
    const { data: used, error } = await supabase.from("solo_draft_actions").select("id").eq("draft_id", open.id).limit(1);
    if (error) return error.message;
    if (!used.length) return null;
  }
  const { error } = await supabase.rpc("new_solo_draft");
  return error ? error.message : null;
}
