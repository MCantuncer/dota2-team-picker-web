"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyAction, replay, type DraftAction, type DraftEntry } from "@/lib/draft";
import type { Side } from "@/lib/draft-reader/geometry";
import {
  diffActions,
  enteredElsewhere,
  undoActions,
  isPhone,
  mergeSoloRows,
  PHONE_FRESH_MS,
  soloAction,
  tabDevice,
  toSoloRow,
  WATCH_FRESH_MS,
  type SoloActionRow,
} from "@/lib/solo-draft";
import { createClient } from "@/lib/supabase/client";

const DRAFT_KEY = "solo-draft";
/** Set once this browser's old board has been moved to the server, so it never comes back after that. */
const IMPORTED_KEY = "solo-draft-imported";
const BEAT_MS = 5_000;
const SEEN_MS = 20_000;
const RETRIES = 3;
/** How long a hero read on the PC shows as just read on the phone. */
const FRESH_MS = 4_000;

const isPosition = (v: unknown) => v === null || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5);
const isDraft = (v: unknown): v is DraftEntry[] =>
  Array.isArray(v) &&
  v.every(
    (e) => Number.isInteger(e?.heroId) && ["ally", "enemy", "ban"].includes(e?.kind) && isPosition(e?.position),
  );

function readLocal(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not keeping it in this browser is fine.
  }
}

/** A failed call worth trying again: the network, not a rule of the draft. */
const isNetwork = (error: { code?: string }) => !error.code;

/**
 * A player's own draft out of a party. Signed in, it lives on the server as an action log (like party drafts), so the
 * phone they follow on sees what Watch Dota reads on their PC within a second or two, and both devices replay the
 * same entries in the same order. Signed out, it stays in this browser. Either way Undo goes back one of this
 * tab's own changes; on the server it does so through the log, so the other device sees it too.
 */
export function useSoloBoard(userId: string | null) {
  const synced = userId !== null;
  const supabase = useMemo(() => createClient(), []);
  // This tab's id; the server render never sends anything, so it needs none.
  const [device] = useState(() => (typeof window === "undefined" ? "" : tabDevice()));

  // In this browser only.
  const [local, setLocal] = useState<DraftEntry[]>([]);
  // On the server: the open draft, its confirmed rows, and this tab's entries still on their way.
  const [draftId, setDraftId] = useState<string | null>(null);
  const [rows, setRows] = useState<SoloActionRow[]>([]);
  const [pending, setPending] = useState<DraftAction[]>([]);
  const [ready, setReady] = useState(!synced);
  const [error, setError] = useState<string | null>(null);
  // Each of this tab's changes, newest last, for Undo: the board before it, and what takes it back.
  const [history, setHistory] = useState<{ board: DraftEntry[]; back: DraftAction[] }[]>([]);
  const [side, setSideState] = useState<Side | null>(null);
  // When this device heard that the PC read Dota, and that a phone was open (its own clock, so the two devices'
  // clocks never get compared).
  const [beatAt, setBeatAt] = useState<number | null>(null);
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const [pcWasWatching, setPcWasWatching] = useState(false);
  const [fresh, setFresh] = useState<{ heroId: number; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const confirmed = useMemo(() => replay(rows.map(soloAction)), [rows]);
  const draft = useMemo(
    () => (synced ? (ready ? pending.reduce(applyAction, confirmed) : []) : local),
    [synced, ready, pending, confirmed, local],
  );
  // The board as of the last change, ahead of the next render: Watch Dota can add picks twice in a row before the
  // page renders (it is in the background while Dota is in front), and the second must build on the first.
  const latest = useRef<DraftEntry[]>([]);
  const latestDraftId = useRef<string | null>(null);
  useEffect(() => {
    latest.current = draft;
    latestDraftId.current = draftId;
  });
  // The beat and phone check-in times last heard, as the server wrote them.
  const lastWatching = useRef<string | null>(null);
  const lastSeen = useRef<string | null>(null);

  /** A new open draft, from this tab or another: everything of the old one goes. */
  const switchTo = useCallback((id: string) => {
    if (id === latestDraftId.current) return;
    latestDraftId.current = id;
    setDraftId(id);
    setRows([]);
    setPending([]);
    setPcWasWatching(false);
    setFresh(null);
  }, []);

  const loadRows = useCallback(
    async (id: string) => {
      const [{ data, error }, status] = await Promise.all([
        supabase.from("solo_draft_actions").select("id, kind, hero_id, position, device").eq("draft_id", id).order("id"),
        supabase.rpc("solo_draft_status", { draft: id }),
      ]);
      if (error || status.error) return setError(`Draft not loaded: ${(error ?? status.error)?.message}`);
      if (id !== latestDraftId.current) return;
      const loaded = (data ?? []).flatMap((r) => toSoloRow(r) ?? []);
      setRows((current) => mergeSoloRows(current, loaded));
      const row = status.data?.[0];
      if (row) {
        setSideState(row.side === "radiant" || row.side === "dire" ? row.side : null);
        // The generated types call these numbers, but they are null when never set.
        const watchAge = row.watch_age as number | null;
        const phoneAge = row.phone_age as number | null;
        lastWatching.current = (row.watching_at as string | null) ?? null;
        lastSeen.current = (row.phone_seen_at as string | null) ?? null;
        const t = Date.now();
        const watching = watchAge !== null && watchAge * 1000 < WATCH_FRESH_MS;
        setBeatAt(watching ? t - watchAge * 1000 : null);
        if (watching) setPcWasWatching(true);
        setSeenAt(phoneAge !== null ? t - phoneAge * 1000 : null);
      }
      setError(null);
      setReady(true);
    },
    [supabase],
  );

  const open = useCallback(async () => {
    const { data, error } = await supabase.rpc("start_solo_draft");
    if (error) return setError(`Draft not opened: ${error.message}`);
    switchTo(data);
    await loadRows(data);
  }, [supabase, switchTo, loadRows]);

  // Signed out: the board kept in this browser.
  useEffect(() => {
    if (synced) return;
    const saved = readLocal(DRAFT_KEY);
    const timer = setTimeout(() => setLocal(isDraft(saved) ? saved : []), 0);
    return () => clearTimeout(timer);
  }, [synced]);

  // Signed in: the open draft, live. Coming back to the tab loads it again in case a live update was missed.
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => void open(), 0);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void open().then(() => {
        if (latestDraftId.current) void loadRows(latestDraftId.current);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    const channel = supabase
      .channel(`solo-draft:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "solo_draft_actions" }, (change) => {
        const row = toSoloRow(change.new);
        const id = (change.new as { draft_id?: unknown }).draft_id;
        if (!row || id !== latestDraftId.current) return;
        setRows((current) => mergeSoloRows(current, [row]));
        if (row.device !== device && row.kind !== "remove") setFresh({ heroId: row.hero_id, at: Date.now() });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "solo_drafts", filter: `user_id=eq.${userId}` }, (change) => {
        const id = (change.new as { id?: unknown }).id;
        // Start Over on the other device. This tab's own Start Over already moved here, and keeps its Undo.
        if (typeof id !== "string" || id === latestDraftId.current) return;
        switchTo(id);
        setHistory([]);
        void loadRows(id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "solo_drafts", filter: `user_id=eq.${userId}` }, (change) => {
        const row = change.new as { id?: unknown; ended_at?: unknown; side?: unknown; watching_at?: unknown; phone_seen_at?: unknown };
        if (row.id !== latestDraftId.current) return;
        if (row.ended_at) return void open();
        setSideState(row.side === "radiant" || row.side === "dire" ? row.side : null);
        // Every update carries the whole row, so a beat or a phone check-in is told apart by its time changing.
        const watching = typeof row.watching_at === "string" ? row.watching_at : null;
        if (watching !== lastWatching.current) {
          lastWatching.current = watching;
          if (watching) {
            setBeatAt(Date.now());
            setPcWasWatching(true);
          } else setBeatAt(null);
        }
        const seen = typeof row.phone_seen_at === "string" ? row.phone_seen_at : null;
        if (seen !== lastSeen.current) {
          lastSeen.current = seen;
          if (seen) setSeenAt(Date.now());
        }
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, open, loadRows, switchTo, device]);

  // Sends entries one at a time, in order. A network failure is tried again; a rule of the draft (a full team,
  // a hero entered on the other device a moment ago) drops the entry and says why.
  const sending = useRef(false);
  const queue = useRef<DraftAction[]>([]);
  const send = async (actions: DraftAction[]) => {
    const id = latestDraftId.current;
    if (!id || !actions.length) return;
    queue.current.push(...actions);
    setPending((p) => [...p, ...actions]);
    if (sending.current) return;
    sending.current = true;
    while (queue.current.length) {
      const batch = queue.current.splice(0);
      let failed: string | null = null;
      for (const a of batch) {
        for (let attempt = 0; ; attempt++) {
          const { error } = await supabase.rpc("add_solo_draft_action", {
            draft: id,
            action: a.kind,
            hero: a.heroId,
            device: device,
            pos: a.kind === "ally" || a.kind === "enemy" ? (a.position ?? undefined) : undefined,
          });
          if (!error) break;
          if (!isNetwork(error) || attempt + 1 >= RETRIES) {
            failed = error.message;
            break;
          }
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        }
      }
      // The confirmed rows come first, then this batch leaves pending, so the board never drops a hero between.
      await loadRows(id);
      setPending((p) => p.slice(batch.length));
      setError(failed ? `Not saved: ${failed}` : null);
    }
    sending.current = false;
  };

  // This browser's old board moves to the server once, on a PC, into an empty draft.
  const imported = useRef(false);
  useEffect(() => {
    if (!synced || !ready || imported.current) return;
    imported.current = true;
    if (readLocal(IMPORTED_KEY) === true) return;
    writeLocal(IMPORTED_KEY, true);
    const saved = readLocal(DRAFT_KEY);
    if (!isPhone() && rows.length === 0 && isDraft(saved) && saved.length) void send(diffActions([], saved));
  });

  const act = (actions: DraftAction[]) => {
    const before = latest.current;
    const after = actions.reduce(applyAction, before);
    if (after === before) return;
    setHistory((h) => [...h.slice(-49), { board: before, back: undoActions(before, after) }]);
    latest.current = after;
    if (synced) void send(actions);
    else {
      setLocal(after);
      writeLocal(DRAFT_KEY, after);
    }
  };

  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    if (synced) void send(last.back);
    else {
      latest.current = last.board;
      setLocal(last.board);
      writeLocal(DRAFT_KEY, last.board);
    }
  };

  /** Start Over: an empty board on every device. Undo brings the old board back. */
  const startOver = async () => {
    const before = latest.current;
    if (before.length) setHistory((h) => [...h.slice(-49), { board: before, back: undoActions(before, []) }]);
    setSideState(null);
    if (!synced) {
      latest.current = [];
      setLocal([]);
      writeLocal(DRAFT_KEY, []);
      return;
    }
    const { data, error } = await supabase.rpc("new_solo_draft");
    if (error) return setError(`Couldn't start over: ${error.message}`);
    switchTo(data);
    setReady(true);
  };

  const setSide = (s: Side | null) => {
    setSideState(s);
    const id = latestDraftId.current;
    // A new draft starts with no side, so only a chosen side is saved.
    if (!synced || !id || !s) return;
    void supabase.rpc("set_solo_draft_side", { draft: id, side: s }).then(({ error }) => {
      if (error) setError(`Your side was not saved: ${error.message}`);
    });
  };

  // The PC tells the phone it is reading Dota: on every read, at most every 5 seconds, and once when it stops.
  const lastBeat = useRef<{ at: number; watching: boolean }>({ at: 0, watching: false });
  const beat = useCallback((watching: boolean) => {
    const id = latestDraftId.current;
    if (!synced || !id) return;
    const t = Date.now();
    if (watching && lastBeat.current.watching && t - lastBeat.current.at < BEAT_MS) return;
    if (!watching && !lastBeat.current.watching) return;
    lastBeat.current = { at: t, watching };
    void supabase.rpc("solo_draft_beat", { draft: id, watching }).then(({ error }) => {
      if (error) console.warn("Watch Dota beat not saved", error.message);
    });
  }, [supabase, synced]);

  // A phone says it is open every 20 seconds while in front, so the PC can show Phone Following.
  useEffect(() => {
    if (!synced || !draftId || !isPhone()) return;
    const say = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.rpc("solo_draft_seen", { draft: draftId }).then(({ error }) => {
        if (error) console.warn("Phone seen not saved", error.message);
      });
    };
    say();
    const timer = setInterval(say, SEEN_MS);
    return () => clearInterval(timer);
  }, [supabase, synced, draftId]);

  // Ticks while a status can go stale, so Live and Phone Following end on time without a new event.
  useEffect(() => {
    if (beatAt === null && seenAt === null && fresh === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [beatAt, seenAt, fresh]);

  const elsewhere = useMemo(
    () => (synced ? enteredElsewhere(rows, draft, device) : new Set<number>()),
    [synced, rows, draft, device],
  );
  const pcWatching = beatAt !== null && now - beatAt < WATCH_FRESH_MS;
  return {
    draft,
    ready,
    error,
    act,
    undo,
    canUndo: history.length > 0,
    startOver,
    side,
    setSide,
    /** The server draft's id while signed in, for the saved game's key; null in this browser only. */
    boardKey: synced ? draftId : null,
    synced,
    beat,
    pcWatching,
    /** The PC was reading Dota this draft and stopped. */
    pcStopped: pcWasWatching && !pcWatching,
    phoneFollowing: seenAt !== null && now - seenAt < PHONE_FRESH_MS,
    /** A hero the PC just read, to light it up on the phone. */
    freshHero: fresh && now - fresh.at < FRESH_MS ? fresh.heroId : null,
    /** Heroes another device entered, which Watch Dota here must not learn a look from. */
    elsewhere,
  };
}
