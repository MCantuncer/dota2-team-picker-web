"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { steamAvatar } from "@/lib/party";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./account-menu";

interface Invite {
  partyId: string;
  inviterName: string;
  inviterAvatarUrl: string | null;
  members: number;
}

/** Invites older than this don't pop up; the player has likely moved on. */
const FRESH_MS = 15 * 60 * 1000;

/**
 * Pops up a party invite the moment it is sent, on any page, like the party
 * invite in Dota. Join takes you to the lobby; Decline tells the leader.
 */
export function PartyInvitePopup({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("my_party_invites");
    const row = (data ?? []).find(
      (r: Record<string, unknown>) => Date.now() - new Date(r.created_at as string).getTime() < FRESH_MS,
    ) as Record<string, unknown> | undefined;
    setError(null);
    setInvite(
      row
        ? {
            partyId: row.party_id as string,
            inviterName: (row.inviter_name as string | null) ?? "A player",
            inviterAvatarUrl: steamAvatar(row.inviter_avatar_url as string | null),
            members: row.members as number,
          }
        : null,
    );
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
      if (pathname === "/party") router.refresh();
      else router.push("/party");
    }
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby="party-invite-title"
      aria-describedby="party-invite-detail"
      className="card fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 p-4"
    >
      <div className="flex items-center gap-2.5">
        <Avatar account={{ name: invite.inviterName, avatarUrl: invite.inviterAvatarUrl, detail: null, steamLinked: false }} size={36} />
        <div className="flex min-w-0 flex-col">
          <span className="label-caps text-accent">Party invite</span>
          <span id="party-invite-title" className="truncate font-heading text-base font-semibold leading-tight text-fg">
            {invite.inviterName} invited you
          </span>
        </div>
      </div>
      <p id="party-invite-detail" className="text-sm text-muted">
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
