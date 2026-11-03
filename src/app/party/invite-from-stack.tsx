"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/account-menu";
import { Icon } from "@/components/icon";
import { steamAvatarOnly } from "@/lib/stacks";
import { createClient } from "@/lib/supabase/client";

/** A Stack you own or play in, for the lobby's Stack picker. */
export interface StackOption {
  id: string;
  name: string;
}

interface Mate {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Invite from Stack: pick one of your Stacks, tick who plays this game (as many as there are open
 * seats) and invite them all in one click. The database still checks each invite: the owner and
 * Managers can invite anyone in the Stack, everyone else only their friends.
 */
export function InviteFromStack({
  stacks,
  initialStack,
  memberIds,
  openSeats,
  onInvited,
}: {
  stacks: StackOption[];
  /** The party's own Stack, when it was started for one. */
  initialStack: string | null;
  /** Players already in the party. */
  memberIds: string[];
  openSeats: number;
  /** Called after the invites go out, so the lobby can show them as sent. */
  onInvited: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [stackId, setStackId] = useState(
    stacks.some((s) => s.id === initialStack) ? initialStack! : (stacks[0]?.id ?? ""),
  );
  const [mates, setMates] = useState<Mate[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const inParty = new Set(memberIds);
  const free = (mates ?? []).filter((m) => !inParty.has(m.id));

  useEffect(() => {
    if (!stackId) return;
    let cancelled = false;
    supabase.rpc("stack_members", { team: stackId }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setMates([]);
        return setMessage({ error: true, text: `Stack not loaded: ${error.message}` });
      }
      setMessage(null);
      setMates(
        (data ?? []).map((m) => ({
          id: m.user_id,
          name: m.display_name ?? "Unnamed",
          avatarUrl: steamAvatarOnly(m.avatar_url),
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, stackId]);

  const toggle = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else if (next.size < openSeats) next.add(id);
      return next;
    });

  const invite = async () => {
    setBusy(true);
    const chosen = free.filter((m) => picked.has(m.id));
    const results = await Promise.all(
      chosen.map(async (m) => ({ mate: m, error: (await supabase.rpc("invite_to_party", { target: m.id })).error })),
    );
    setBusy(false);
    const failed = results.filter((r) => r.error);
    const sent = results.length - failed.length;
    setPicked(new Set(failed.map((r) => r.mate.id)));
    setMessage(
      failed.length
        ? {
            error: true,
            text: `${sent ? `${sent} sent. ` : ""}Not sent to ${failed.map((r) => r.mate.name).join(", ")}: ${failed[0]!.error!.message}`,
          }
        : { error: false, text: sent === 1 ? "Invite sent." : `${sent} invites sent.` },
    );
    if (sent) onInvited();
  };

  if (!stacks.length) return null;
  return (
    <section aria-labelledby="stack-invite-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="stack-invite-heading" className="section-title">
          Invite from Stack
        </h2>
        {stacks.length > 1 && (
          <>
            <label htmlFor="stack-pick" className="sr-only">
              Stack
            </label>
            <select
              id="stack-pick"
              value={stackId}
              onChange={(e) => {
                setStackId(e.target.value);
                setMates(null);
                setPicked(new Set());
              }}
              className="field h-8 w-auto"
            >
              {stacks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        )}
        {stacks.length === 1 && <span className="text-sm text-muted">{stacks[0]!.name}</span>}
      </div>
      {mates === null ? (
        <p className="text-sm text-muted">Loading the Stack…</p>
      ) : free.length ? (
        <>
          <p className="text-sm text-muted">
            Tick who plays this game. <span className="num">{openSeats}</span>{" "}
            {openSeats === 1 ? "seat is" : "seats are"} open.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {free.map((m) => {
              const on = picked.has(m.id);
              return (
                <li key={m.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 ring-1 ring-inset ${
                      on ? "bg-hover ring-line-strong" : "ring-line"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && picked.size >= openSeats}
                      onChange={() => toggle(m.id)}
                    />
                    <Avatar
                      account={{ name: m.name, avatarUrl: m.avatarUrl, detail: null, steamLinked: false }}
                      size={28}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">{m.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button onClick={invite} disabled={busy || !picked.size} className="btn btn-primary self-start">
            <Icon name="send" />
            {picked.size > 1 ? `Invite ${picked.size} Players` : "Invite"}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">Everyone in this Stack is already in the party.</p>
      )}
      {message && <p className={`text-sm ${message.error ? "text-dire" : "text-radiant"}`}>{message.text}</p>}
    </section>
  );
}
