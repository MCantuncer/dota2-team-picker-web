"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { POSITION_NAMES, steamAvatar } from "@/lib/party";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./account-menu";

interface Invite {
  partyId: string;
  inviterName: string;
  inviterAvatarUrl: string | null;
  members: number;
  /** The seat held for them, when the leader seated them. */
  position: number | null;
  /** The pop-up's 15 minutes are up, but their seat is still held: a Join card, not an invite. */
  late: boolean;
}

/** Turns a `my_party_invites` row into an invite; the database already left out expired, unseated ones. */
export function toInvite(r: Record<string, unknown>, now: number): Invite | null {
  if (typeof r.party_id !== "string") return null;
  const expires = typeof r.expires_at === "string" ? new Date(r.expires_at).getTime() : NaN;
  const seated = r.seated === true;
  const late = !(expires > now);
  if (late && !seated) return null;
  return {
    partyId: r.party_id,
    inviterName: typeof r.inviter_name === "string" && r.inviter_name ? r.inviter_name : "A player",
    inviterAvatarUrl: steamAvatar(typeof r.inviter_avatar_url === "string" ? r.inviter_avatar_url : null),
    members: typeof r.members === "number" ? r.members : 1,
    position: typeof r.position === "number" && POSITION_NAMES[r.position] ? r.position : null,
    late,
  };
}

/**
 * Pops up a party invite the moment it is sent, on any page, like the party invite in Dota. After
 * 15 minutes a seated player still gets it as a Join card, since their seat waits for them. Join
 * takes you to the lobby; Decline tells the leader and frees the seat.
 */
export function PartyInvitePopup({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_party_invites");
    // A failed check shows nothing; the next change or page load checks again.
    if (error) return;
    const now = Date.now();
    setError(null);
    setInvite(((data ?? []) as Record<string, unknown>[]).map((r) => toInvite(r, now)).find((i) => i !== null) ?? null);
  }, [supabase]);

  useEffect(() => {
    // Checks once on page load, for an invite sent just before, then listens.
    const timer = setTimeout(load, 0);
    const channel = supabase
      .channel(`party-invites:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_invites", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load]);

  if (!invite) return null;

  const answer = async (accept: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("answer_party_invite", { party: invite.partyId, accept });
    setBusy(false);
    if (error) return setError(error.message);
    setInvite(null);
    if (accept) {
      if (pathname !== "/draft") router.push("/draft");
      // Also redraws the header's party chip, which page changes alone leave as it was.
      router.refresh();
    }
  };

  return (
    <div
      role="alertdialog"
      data-urgent-prompt
      aria-labelledby="party-invite-title"
      aria-describedby="party-invite-detail"
      className="card fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 p-4"
    >
      <div className="flex items-center gap-2.5">
        <Avatar account={{ name: invite.inviterName, avatarUrl: invite.inviterAvatarUrl, detail: null, steamLinked: false }} size={36} />
        <div className="flex min-w-0 flex-col">
          <span className="label-caps text-accent">{invite.late ? "Your Seat Is Waiting" : "Party Invite"}</span>
          <span id="party-invite-title" className="truncate font-medium leading-tight text-fg">
            {invite.late ? `Join ${invite.inviterName}'s Party` : `${invite.inviterName} invited you`}
          </span>
        </div>
      </div>
      <p id="party-invite-detail" className="text-sm text-muted">
        {invite.position ? `Your seat is ${POSITION_NAMES[invite.position]}. ` : ""}
        {invite.members} of 5 players in the party.
      </p>
      {error && <p className="text-sm text-dire">{error}</p>}
      <div className="flex gap-2">
        <button autoFocus onClick={() => answer(true)} disabled={busy} className="btn btn-primary flex-1">
          Join
        </button>
        <button onClick={() => answer(false)} disabled={busy} className="btn btn-secondary flex-1">
          Decline
        </button>
      </div>
    </div>
  );
}
