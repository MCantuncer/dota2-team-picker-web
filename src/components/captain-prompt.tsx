"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toParty, type Party } from "@/lib/party";
import { createClient } from "@/lib/supabase/client";

/** How often the draft captain's open page tells the database it is still there. */
const HEARTBEAT_MS = 20_000;
/** The full length of a request, for the countdown bar (matches the database). */
const REQUEST_MS = 30_000;

/**
 * For the party's draft captain, on any page: keeps their presence fresh so nobody takes the role
 * while they are around, and pops up "Ali wants draft captain" with Yes and No when someone asks.
 * No answer keeps the captain; the bar shows how long is left.
 */
export function CaptainPrompt({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [party, setParty] = useState<Party | null>(null);
  // When the open request runs out, on this browser's own clock (the database gave the time left).
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("party_view");
    // Fails closed: without a fresh party there is nothing to answer.
    if (error) return setParty(null);
    const next = toParty(data);
    setParty(next);
    setDeadline(Date.now() + (next?.captain.requestMsLeft ?? 0));
    setNow(Date.now());
    setError(null);
  }, [supabase]);

  const partyId = party?.id ?? null;
  const isCaptain = party?.captain.id === userId;

  // Joining or leaving a party, then any change to the party row (captain, request).
  useEffect(() => {
    const timer = setTimeout(load, 0);
    const channel = supabase
      .channel(`captain-prompt:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_members", filter: `user_id=eq.${userId}` }, load);
    if (partyId) {
      channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "parties", filter: `id=eq.${partyId}` }, load);
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, partyId, load]);

  // The captain's heartbeat, while any page of the site is open.
  useEffect(() => {
    if (!isCaptain) return;
    const beat = () => void supabase.rpc("captain_heartbeat");
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, isCaptain]);

  const requestBy = isCaptain ? party?.captain.requestBy : null;
  const open = Boolean(requestBy) && now < deadline;

  // Ticks the countdown once a second while a request is open.
  useEffect(() => {
    if (!requestBy) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [requestBy]);

  if (!party || !requestBy || !open) return null;

  const name = party.members.find((m) => m.id === requestBy)?.name ?? "A player";
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));

  const answer = async (accept: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("answer_captain_request", { accept });
    setBusy(false);
    if (error) return setError(error.code === "P0002" ? "Too late, the request ran out" : error.message);
    await load();
  };

  return (
    <CaptainPromptCard
      name={name}
      secondsLeft={secondsLeft}
      fractionLeft={Math.max(0, deadline - now) / REQUEST_MS}
      busy={busy}
      error={error}
      onAnswer={answer}
    />
  );
}

/** The Yes/No card itself, kept apart from the live data so it can be shown on its own. */
export function CaptainPromptCard({
  name,
  secondsLeft,
  fractionLeft,
  busy,
  error,
  onAnswer,
}: {
  name: string;
  secondsLeft: number;
  /** 1 when the request just arrived, 0 when it runs out. */
  fractionLeft: number;
  busy: boolean;
  error: string | null;
  onAnswer: (accept: boolean) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Draft captain request"
      className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 overflow-hidden rounded-lg border border-line-strong bg-surface p-4 shadow-lg sm:left-auto sm:w-88"
    >
      <div className="flex flex-col">
        <span className="label-caps">Draft captain</span>
        <span role="alert" className="font-heading text-base font-semibold leading-tight text-fg">
          {name} wants draft captain
        </span>
      </div>
      <p className="text-sm text-muted">
        You keep it if you don&apos;t answer in <span className="num">{secondsLeft}</span> s.
      </p>
      {error && <p className="text-sm text-dire">{error}</p>}
      {/* Buttons take no focus by themselves, so a search box keeps the keyboard mid-typing. */}
      <div className="flex gap-2">
        <button onClick={() => onAnswer(true)} disabled={busy} className="btn btn-primary flex-1">
          Give captain
        </button>
        <button onClick={() => onAnswer(false)} disabled={busy} className="btn btn-secondary flex-1">
          Keep it
        </button>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
        <div
          className="h-full origin-left bg-accent motion-safe:transition-transform motion-safe:duration-1000 motion-safe:ease-linear"
          style={{ transform: `scaleX(${fractionLeft})` }}
        />
      </div>
    </div>
  );
}
