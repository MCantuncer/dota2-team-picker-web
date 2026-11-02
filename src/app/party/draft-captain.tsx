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
  /** Calls become_captain(); resolves to its answer, "captain" or "requested". */
  become: () => PromiseLike<{ data: string | null; error: { message: string } | null }>;
  stepDown: () => PromiseLike<{ error: { message: string } | null }>;
}) {
  const [note, setNote] = useState<string | null>(null);
  const captainId = party.captain.id;
  const name = (id: string) => party.members.find((m) => m.id === id)?.name ?? "Someone";

  // Tell the old captain when the role moves away from them, so it never just disappears.
  const previous = useRef(captainId);
  useEffect(() => {
    const was = previous.current;
    previous.current = captainId;
    if (was === captainId) return;
    const taker = party.members.find((m) => m.id === captainId)?.name ?? "Someone";
    const message = was === userId && captainId && captainId !== userId ? `${taker} took draft captain` : null;
    const timer = setTimeout(() => setNote(message), 0);
    return () => clearTimeout(timer);
  }, [captainId, userId, party.members]);

  const take = () =>
    run("Not captain", async () => {
      const { data, error } = await become();
      if (!error) setNote(data === "requested" ? `${captainId ? name(captainId) : "The captain"} is still here, so you asked them instead` : null);
      return { error };
    });

  const isCaptain = captainId === userId;
  const isLeader = party.leaderId === userId;
  // The leader takes the role without asking, and nobody waits on a captain who has left the site.
  // Asking an online captain arrives with the captain's prompt.
  const canTake = !isCaptain && (captainId === null || isLeader || !party.captain.online);

  let line: string;
  if (isCaptain) line = "You enter the draft for the party.";
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
    </section>
  );
}
