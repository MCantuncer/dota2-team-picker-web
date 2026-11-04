"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/account-menu";
import { Icon } from "@/components/icon";
import type { FriendInvite, Invite, Member } from "@/lib/stacks";
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

/** Invite someone who is not on the site yet: they get an email with a join link. */
export function EmailInvites({
  stackId,
  initial,
  onError,
}: {
  stackId: string;
  initial: Invite[];
  onError: (e: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState(initial);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const invite = async (address: string) => {
    setSending(true);
    setSent(null);
    const { data, error } = await supabase.functions.invoke<Invite>("team-invite", { body: { teamId: stackId, email: address } });
    setSending(false);
    if (error || !data) {
      // The function answers errors as {error}; the client wraps the response in error.context.
      const body = error && "context" in error ? await (error.context as Response).json().catch(() => null) : null;
      return onError(`Invite not sent: ${body?.error ?? error?.message ?? "unknown error"}`);
    }
    onError(null);
    setEmail("");
    setSent(data.email);
    setInvites((cur) => (cur.some((i) => i.id === data.id) ? cur : [...cur, { id: data.id, email: data.email }]));
  };

  const cancel = async (i: Invite) => {
    const { error } = await supabase.from("team_invites").delete().eq("id", i.id);
    if (error) return onError(`Invite not cancelled: ${error.message}`);
    onError(null);
    setInvites((cur) => cur.filter((x) => x.id !== i.id));
  };

  const copyLink = async (i: Invite) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${i.id}`);
      setCopied(i.id);
    } catch {
      onError("Could not copy the link.");
    }
  };

  return (
    <section aria-labelledby="email-invites-heading" className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
      <h3 id="email-invites-heading" className="flex items-center gap-2 font-semibold text-fg">
        <Icon name="send" />
        By Email
      </h3>
      <p className="text-sm text-subtle">For someone not on the site yet. They get a link, pick a name and password, then join.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) void invite(email.trim());
        }}
        className="flex flex-wrap gap-2"
      >
        <label htmlFor="invite-email" className="sr-only">
          Email address
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          autoComplete="off"
          className="field min-w-0 flex-1 basis-48"
        />
        <button type="submit" disabled={sending} className="btn btn-primary">
          <Icon name="send" />
          {sending ? "Sending…" : "Send Invite"}
        </button>
      </form>
      {sent && <p className="text-sm text-radiant">Invite sent to {sent}.</p>}
      {invites.length > 0 && (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="mr-auto truncate">{i.email}</span>
              <span className="text-xs text-subtle">Waiting</span>
              <button onClick={() => invite(i.email)} disabled={sending} className="btn btn-secondary btn-sm">
                Resend
              </button>
              <button onClick={() => copyLink(i)} className="btn btn-secondary btn-sm">
                {copied === i.id ? "Copied" : "Copy Link"}
              </button>
              <button onClick={() => cancel(i)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
