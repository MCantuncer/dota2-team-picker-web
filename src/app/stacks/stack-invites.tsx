"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/account-menu";
import { Icon } from "@/components/icon";
import type { FriendInvite, Member } from "@/lib/stacks";
import { createClient } from "@/lib/supabase/client";
import type { Friend } from "./stack-board";

/** Your friends who are not in the Stack yet, each with Invite; they answer Join or Decline on the site. */
export function FriendInvites({
  stackId,
  friends,
  members,
  initial,
  onError,
}: {
  stackId: string;
  friends: Friend[];
  members: Member[];
  initial: FriendInvite[];
  onError: (e: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [invites, setInvites] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const inStack = new Set(members.map((m) => m.id));
  const waiting = new Map(invites.map((i) => [i.userId, i.id]));
  const list = friends.filter((f) => !inStack.has(f.id));

  const invite = async (friend: Friend) => {
    setBusy(friend.id);
    const { data, error } = await supabase.rpc("invite_friend_to_team", { team: stackId, target: friend.id });
    setBusy(null);
    if (error || !data) return onError(`Invite not sent: ${error?.message ?? "unknown error"}`);
    onError(null);
    setInvites((cur) => (cur.some((i) => i.id === data) ? cur : [...cur, { id: data, userId: friend.id }]));
  };

  const cancel = async (friend: Friend, inviteId: string) => {
    setBusy(friend.id);
    const { error } = await supabase.from("team_invites").delete().eq("id", inviteId);
    setBusy(null);
    if (error) return onError(`Invite not cancelled: ${error.message}`);
    onError(null);
    setInvites((cur) => cur.filter((i) => i.id !== inviteId));
  };

  return (
    <section aria-labelledby="friend-invites-heading" className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
      <h3 id="friend-invites-heading" className="flex items-center gap-2 font-semibold text-fg">
        <Icon name="users" />
        Friends
      </h3>
      <p className="text-sm text-subtle">They get the invite on the site and accept it there.</p>
      {list.length ? (
        <ul className="divide-y divide-line border-t border-line">
          {list.map((f) => {
            const inviteId = waiting.get(f.id);
            return (
              <li key={f.id} className="flex items-center gap-3 py-2">
                <Avatar account={{ name: f.name, avatarUrl: f.avatarUrl, detail: null, steamLinked: false }} size={28} />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{f.name}</span>
                {inviteId ? (
                  <>
                    <span className="text-xs text-subtle">Waiting</span>
                    <button onClick={() => cancel(f, inviteId)} disabled={busy === f.id} className="btn btn-secondary btn-sm">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => invite(f)} disabled={busy === f.id} className="btn btn-secondary btn-sm">
                    <Icon name="userPlus" />
                    Invite
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          {friends.length ? "All your friends are in this Stack." : "Add friends on the Friends page, then invite them here."}
        </p>
      )}
    </section>
  );
}

/** Someone not on the site yet signs in with Steam from your friend link, then shows up in Friends above. */
export function NewPlayers() {
  return (
    <section aria-labelledby="new-players-heading" className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
      <h3 id="new-players-heading" className="flex items-center gap-2 font-semibold text-fg">
        <Icon name="userPlus" />
        Not on the Site Yet
      </h3>
      <p className="text-sm text-subtle">
        Send them your friend link. They sign in with Steam and add you, then you can invite them here.
      </p>
      <Link href="/friends" className="btn btn-secondary self-start">
        Get Your Friend Link
      </Link>
    </section>
  );
}
