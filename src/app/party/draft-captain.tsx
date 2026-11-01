"use client";

import { useEffect, useRef, useState } from "react";
import type { Party } from "@/lib/party";

type Run = (what: string, call: () => PromiseLike<{ error: { message: string } | null }>) => Promise<void>;

/**
 * Who runs the party's draft. The draft captain enters picks for everyone and plans all five
 * heroes; with no captain, anyone in the party can enter the draft.
 */
export function DraftCaptain({
  party,
  userId,
  busy,
  run,
  become,
  stepDown,
}: {
  party: Party;
  userId: string;
  busy: boolean;
  run: Run;
  /** Calls become_captain(): takes the role, or asks the captain for it. */
  become: () => PromiseLike<{ error: { message: string } | null }>;
  stepDown: () => PromiseLike<{ error: { message: string } | null }>;
}) {
  const [note, setNote] = useState<string | null>(null);
  const captainId = party.captain.id;
  const name = (id: string) => party.members.find((m) => m.id === id)?.name ?? "Someone";

  const requestBy = party.captain.requestBy;
  const myWaitMs = party.members.find((m) => m.id === userId)?.askWaitMs ?? 0;

  // Tell the old captain when the role moves away from them, and the asker when the captain kept
  // it, so nothing just disappears.
  const previous = useRef({ captainId, requestBy });
  useEffect(() => {
    const was = previous.current;
    previous.current = { captainId, requestBy };
    let message: string | null | undefined;
    const holder = party.members.find((m) => m.id === captainId)?.name ?? "The captain";
    if (was.captainId !== captainId) {
      message = was.captainId === userId && captainId && captainId !== userId ? `${holder} took draft captain` : null;
    } else if (was.requestBy === userId && requestBy !== userId && captainId) {
      message = `${holder} kept draft captain`;
    }
    if (message === undefined) return;
    const timer = setTimeout(() => setNote(message), 0);
    return () => clearTimeout(timer);
  }, [captainId, requestBy, userId, party.members]);

  // Local deadlines for my open request and my wait before asking again, ticking once a second.
  const [clock, setClock] = useState({ received: 0, now: 0 });
  useEffect(() => {
    const t = Date.now();
    const timer = setTimeout(() => setClock({ received: t, now: t }), 0);
    if (!(requestBy === userId || myWaitMs > 0)) return () => clearTimeout(timer);
    const interval = setInterval(() => setClock((c) => ({ ...c, now: Date.now() })), 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [party, requestBy, userId, myWaitMs]);
  const elapsed = clock.now - clock.received;
  const askedLeft = requestBy === userId ? Math.ceil((party.captain.requestMsLeft - elapsed) / 1000) : 0;
  const waitLeft = Math.ceil((myWaitMs - elapsed) / 1000);

  const take = () =>
    run("Not captain", async () => {
      const { error } = await become();
      if (!error) setNote(null);
      return { error };
    });

  const isCaptain = captainId === userId;
  const isLeader = party.leaderId === userId;
  // The leader takes the role without asking, and nobody waits on a captain who has left the site.
  // Everyone else asks; the captain gets a Yes/No prompt on whatever page they have open.
  const canTake = !isCaptain && (captainId === null || isLeader || !party.captain.online);
  const canAsk = !isCaptain && !canTake && captainId !== null;
  const waiting = canAsk && askedLeft > 0;

  let line: string;
  if (isCaptain) line = "You enter the draft for the party.";
  else if (waiting && captainId) line = `Asked ${name(captainId)}. ${askedLeft} s to answer.`;
  else if (captainId) line = `${name(captainId)} enters the draft for the party.`;
  else line = "None yet. Anyone can enter the draft.";

  return (
    <section aria-label="Draft captain" className="card flex items-center gap-3 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <span className="label-caps">Draft captain</span>
        <p className="text-sm text-muted" aria-live="polite">
          {note ?? line}
        </p>
      </div>
      {isCaptain && (
        <button onClick={() => run("Could not step down", stepDown)} disabled={busy} className="btn btn-ghost btn-sm">
          Step down
        </button>
      )}
      {canTake && (
        <button onClick={take} disabled={busy} className="btn btn-secondary btn-sm">
          {captainId ? "Take captain" : "Become captain"}
        </button>
      )}
      {canAsk && !waiting && (
        <button onClick={take} disabled={busy || waitLeft > 0} className="btn btn-secondary btn-sm">
          {waitLeft > 0 ? `Ask again in ${waitLeft} s` : `Ask ${captainId ? name(captainId) : "the captain"}`}
        </button>
      )}
    </section>
  );
}
