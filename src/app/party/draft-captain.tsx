"use client";

import { useEffect, useRef, useState } from "react";
import type { Party } from "@/lib/party";

type Run = (what: string, call: () => PromiseLike<{ error: { message: string } | null }>) => Promise<void>;

/** The one captain button a player has now: Step Down, Become or Take Captain, or Ask for it. */
export interface CaptainAction {
  label: string;
  onClick: () => void;
  disabled: boolean;
  /** Step Down is the quiet one. */
  quiet: boolean;
}

/**
 * Who runs the party's draft, as a line and the button the player has. The draft captain enters
 * picks for everyone and plans all five heroes; with no captain, anyone in the party can enter the
 * draft. `note` says when the role moved away from the player or the captain kept it.
 */
export function useDraftCaptain({
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

  let action: CaptainAction | null = null;
  if (isCaptain) action = { label: "Step Down", onClick: () => run("Could not step down", stepDown), disabled: busy, quiet: true };
  else if (canTake) action = { label: captainId ? "Take Captain" : "Become Captain", onClick: take, disabled: busy, quiet: false };
  else if (canAsk && !waiting)
    action = {
      label: waitLeft > 0 ? `Ask Again in ${waitLeft} s` : `Ask ${captainId ? name(captainId) : "the Captain"} for Captain`,
      onClick: take,
      disabled: busy || waitLeft > 0,
      quiet: false,
    };
  return { line, note, waiting, action };
}

/** The Draft Captain section of the party lobby: who runs the draft, and the player's captain button. */
export function DraftCaptain(props: Parameters<typeof useDraftCaptain>[0]) {
  const { line, note, action } = useDraftCaptain(props);
  return (
    <section aria-label="Draft Captain" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-fg">Draft Captain</span>
        <p className="text-sm text-muted" aria-live="polite">
          {note ?? line}
        </p>
      </div>
      {action && (
        <button onClick={action.onClick} disabled={action.disabled} className={`btn btn-sm ${action.quiet ? "btn-ghost" : "btn-secondary"}`}>
          {action.label}
        </button>
      )}
    </section>
  );
}
