"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/account-menu";
import { PARTY_SIZE, POSITION_NAMES, toParty, type Party, type PartyMember } from "@/lib/party";
import { createClient } from "@/lib/supabase/client";

export interface Invitee {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** "Friend", or the team you share. */
  detail: string;
}

/** The lobby: five slots, your position for this game, and invites for the leader to send. */
export function PartyLobby({
  userId,
  initialParty,
  invitees,
}: {
  userId: string;
  initialParty: Party | null;
  invitees: Invitee[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [party, setParty] = useState(initialParty);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const partyId = party?.id ?? null;

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("party_view");
    if (error) return setError(`Party not loaded: ${error.message}`);
    const next = toParty(data);
    setParty(next);
    if (!next) return setInvited(new Set());
    const { data: invites } = await supabase
      .from("party_invites")
      .select("user_id")
      .eq("party_id", next.id)
      .eq("status", "pending");
    setInvited(new Set((invites ?? []).map((i) => i.user_id as string)));
  }, [supabase]);

  // Live updates: players joining, leaving, picking positions, and the leader changing.
  useEffect(() => {
    if (!partyId) return;
    const channel = supabase
      .channel(`party:${partyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "parties", filter: `id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` }, refresh)
      // Realtime can't filter deletes, so they are checked here.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "party_members" }, (change) => {
        if ((change.old as { party_id?: string }).party_id === partyId) refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "party_invites", filter: `party_id=eq.${partyId}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, partyId, refresh]);

  const run = async (what: string, call: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true);
    const { error } = await call();
    setBusy(false);
    if (error) return setError(`${what}: ${error.message}`);
    setError(null);
    await refresh();
  };

  if (!party) {
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        {error && <p className="text-sm text-dire">{error}</p>}
        <section className="card flex flex-col items-start gap-3 p-4">
          <p className="text-sm text-muted">You&apos;re not in a party. Start one and invite your friends and teammates.</p>
          <button
            onClick={() => run("Party not started", () => supabase.rpc("start_party"))}
            disabled={busy}
            className="btn btn-primary"
          >
            Start a party
          </button>
        </section>
      </div>
    );
  }

  const isLeader = party.leaderId === userId;
  const memberIds = new Set(party.members.map((m) => m.id));
  const toInvite = invitees.filter((i) => !memberIds.has(i.id));
  const full = party.members.length >= PARTY_SIZE;
  const emptySlots = PARTY_SIZE - party.members.length;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {error && <p className="text-sm text-dire">{error}</p>}

      <section aria-label="Players" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Players{" "}
            <span className="font-heading text-xs text-subtle">
              {party.members.length}/{PARTY_SIZE}
            </span>
          </h2>
          <button
            onClick={() => run("Could not leave", () => supabase.rpc("leave_party"))}
            disabled={busy}
            className="btn btn-ghost btn-sm"
          >
            Leave party
          </button>
        </div>
        <ul className="card divide-y divide-line">
          {party.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isLeader={m.id === party.leaderId}
              isMe={m.id === userId}
              onPosition={(want) => run("Position not saved", () => supabase.rpc("set_party_position", { want }))}
              onRemove={
                isLeader && m.id !== userId
                  ? () => run("Could not remove", () => supabase.rpc("remove_from_party", { target: m.id }))
                  : undefined
              }
            />
          ))}
          {Array.from({ length: emptySlots }, (_, i) => (
            <li key={`empty-${i}`} className="flex h-12 items-center px-3 text-sm text-subtle">
              Open slot
            </li>
          ))}
        </ul>
      </section>

      {isLeader ? (
        <section aria-label="Invite" className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Invite <span className="font-heading text-xs text-subtle">{toInvite.length}</span>
          </h2>
          <ul className="card divide-y divide-line">
            {toInvite.length ? (
              toInvite.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar account={{ name: p.name, avatarUrl: p.avatarUrl, detail: null, steamLinked: false }} size={32} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-heading text-base font-semibold leading-tight text-fg">{p.name}</span>
                    <span className="truncate text-xs text-muted">{invited.has(p.id) ? "Invite sent" : p.detail}</span>
                  </span>
                  <button
                    onClick={() => run("Invite not sent", () => supabase.rpc("invite_to_party", { target: p.id }))}
                    disabled={busy || full}
                    className="btn btn-secondary btn-sm"
                  >
                    {invited.has(p.id) ? "Invite again" : "Invite"}
                  </button>
                </li>
              ))
            ) : (
              <li className="p-4 text-sm text-muted">
                No one to invite yet. Add friends on the Friends page, or join a team.
              </li>
            )}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted">The party leader sends the invites.</p>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isLeader,
  isMe,
  onPosition,
  onRemove,
}: {
  member: PartyMember;
  isLeader: boolean;
  isMe: boolean;
  onPosition: (want: number | null) => void;
  onRemove?: () => void;
}) {
  const position = member.position;
  return (
    <li className="flex items-center gap-2.5 px-3 py-2">
      <Avatar account={{ name: member.name, avatarUrl: member.avatarUrl, detail: null, steamLinked: false }} size={32} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-heading text-base font-semibold leading-tight text-fg">
          {member.name}
          {isMe && <span className="ml-1.5 text-xs font-medium text-muted">(you)</span>}
        </span>
        {isLeader && <span className="label-caps text-accent">Leader</span>}
      </span>
      {isMe ? (
        <select
          aria-label="Your position this game"
          value={position ?? ""}
          onChange={(e) => onPosition(e.target.value ? Number(e.target.value) : null)}
          className="field w-40 text-sm"
        >
          <option value="">Any position</option>
          {Object.entries(POSITION_NAMES).map(([n, name]) => (
            <option key={n} value={n}>
              {n} {name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-muted">{position ? `${position} ${POSITION_NAMES[position]}` : "Any position"}</span>
      )}
      {onRemove && (
        <button onClick={onRemove} aria-label={`Remove ${member.name}`} className="btn btn-ghost btn-sm">
          Remove
        </button>
      )}
    </li>
  );
}
