"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { useDraftCaptain } from "@/app/party/draft-captain";
import type { Position } from "@/lib/engine/types";
import type { Party } from "@/lib/party";
import type { PartySeat } from "@/lib/party-seats";
import { createClient } from "@/lib/supabase/client";
import { PartySeats } from "./party-seats";

/**
 * The party on Draft: its Team Seats with the player's captain button and Leave Party in the head,
 * and captain notes and errors under the seats. Leaving takes the screen back to the player's own draft.
 */
export function PartyPanel({
  party,
  seats,
  userId,
  hero,
  heroAt,
  refresh,
}: {
  party: Party;
  seats: PartySeat[];
  userId: string;
  hero: (id: number) => { name: string; image?: string };
  heroAt: (position: Position) => number | null;
  refresh: () => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (what: string, call: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true);
    const { error } = await call();
    setBusy(false);
    if (error) return setError(`${what}: ${error.message}`);
    setError(null);
    await refresh();
  };
  const captain = useDraftCaptain({
    party,
    userId,
    busy,
    run,
    become: () => supabase.rpc("become_captain"),
    stepDown: () => supabase.rpc("step_down_captain"),
  });
  const leave = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("leave_party");
    setBusy(false);
    if (error) return setError(`Could not leave: ${error.message}`);
    setError(null);
    router.refresh();
  };

  const leader = party.members.find((m) => m.id === party.leaderId)?.name;
  // The crown on a seat says who the captain is; the line only shows what just changed or a request's countdown.
  const captainLine = captain.note ?? (captain.waiting ? captain.line : null);
  return (
    <PartySeats
      title={leader ? `${leader}'s Party` : "Your Party"}
      seats={seats}
      userId={userId}
      captainId={party.captain.id}
      hero={hero}
      heroAt={heroAt}
      actions={
        <>
          {captain.action && (
            <button
              type="button"
              onClick={captain.action.onClick}
              disabled={captain.action.disabled}
              className={`btn btn-sm ${captain.action.quiet ? "btn-ghost" : "btn-secondary"}`}
            >
              {!captain.action.quiet && <Icon name="crown" />}
              {captain.action.label}
            </button>
          )}
          <button type="button" onClick={leave} disabled={busy} className="btn btn-secondary btn-sm">
            Leave Party
          </button>
        </>
      }
      footer={
        <>
          <p className="text-sm text-muted empty:hidden" aria-live="polite">
            {captainLine}
          </p>
          {error && (
            <p role="alert" className="notice notice-error text-sm">
              {error}
            </p>
          )}
        </>
      }
    />
  );
}
