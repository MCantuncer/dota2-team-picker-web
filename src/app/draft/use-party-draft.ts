"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { actorsOf, applyAction, lastEntryBy, mergeRows, replay, toAction, type ActionRow, type DraftAction } from "@/lib/draft";
import { createClient } from "@/lib/supabase/client";

/**
 * The party's shared draft: everyone in the party sees it and can enter picks and bans. Entries
 * are rows added through `add_draft_action`, which checks the same rules as the solo screen, and
 * arrive live for everyone else. Each entry shows at once and is confirmed by a reload after the
 * database takes it, so a missed live update never leaves the screen behind.
 */
export function usePartyDraft(partyId: string | null, userId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [draftId, setDraftId] = useState<string | null>(null);
  // Rows are kept with the draft they belong to, so a new draft starts empty.
  const [loaded, setLoaded] = useState<{ draftId: string | null; rows: ActionRow[] }>({ draftId: null, rows: [] });
  const [pending, setPending] = useState<DraftAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // The party's open draft, started now if there is none.
  const open = useCallback(async () => {
    const { data, error } = await supabase.rpc("start_party_draft");
    if (error) return setError(`Party draft not opened: ${error.message}`);
    setDraftId(data);
  }, [supabase]);

  const add = useCallback((id: string, added: ActionRow[]) => {
    setLoaded((l) => ({ draftId: id, rows: mergeRows(l.draftId === id ? l.rows : [], added) }));
  }, []);

  const load = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from("draft_actions")
        .select("id, actor_id, kind, hero_id, position")
        .eq("draft_id", id)
        .order("id");
      if (error) return setError(`Party draft not loaded: ${error.message}`);
      add(id, data);
    },
    [supabase, add],
  );
  const rows = useMemo(() => (loaded.draftId === draftId ? loaded.rows : []), [loaded, draftId]);

  useEffect(() => {
    if (!partyId) return;
    const timer = setTimeout(open, 0);
    return () => clearTimeout(timer);
  }, [partyId, open]);

  // Live entries from the rest of the party, and a new draft when someone starts one.
  useEffect(() => {
    if (!draftId || !partyId) return;
    const timer = setTimeout(() => load(draftId), 0);
    // Players alt-tab between the game and this page, so coming back also reloads, in case a live
    // update was missed while the tab was in the background.
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(draftId);
    };
    document.addEventListener("visibilitychange", onVisible);
    const channel = supabase
      .channel(`party-draft:${draftId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "draft_actions", filter: `draft_id=eq.${draftId}` }, (change) =>
        add(draftId, [change.new as ActionRow]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "party_drafts", filter: `party_id=eq.${partyId}` }, () => void open())
      .subscribe();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [supabase, draftId, partyId, load, open, add]);

  const act = async (actions: DraftAction[]) => {
    if (!draftId || !actions.length) return;
    setPending((p) => [...p, ...actions]);
    let failed = false;
    for (const a of actions) {
      const { error } = await supabase.rpc("add_draft_action", {
        draft: draftId,
        action: a.kind,
        hero: a.heroId,
        pos: a.kind === "ally" ? (a.position ?? undefined) : undefined,
      });
      if (error) {
        setError(`Not saved: ${error.message}`);
        failed = true;
        break;
      }
    }
    if (!failed) setError(null);
    await load(draftId);
    // Entries finish in the order they were made, so this batch is at the front.
    setPending((p) => p.slice(actions.length));
  };

  const confirmed = useMemo(() => replay(rows.map(toAction).filter((a) => a !== null)), [rows]);
  const draft = useMemo(() => pending.reduce(applyAction, confirmed), [confirmed, pending]);

  const newDraft = async () => {
    if (!draftId) return;
    const { error } = await supabase.rpc("end_party_draft", { draft: draftId });
    if (error) return setError(`Draft not ended: ${error.message}`);
    await open();
  };

  return {
    ready: draftId !== null,
    draft,
    actors: actorsOf(rows),
    lastMine: userId ? lastEntryBy(rows, confirmed, userId) : null,
    error,
    act,
    newDraft,
  };
}
