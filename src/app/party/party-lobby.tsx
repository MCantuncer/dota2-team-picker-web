"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/account-menu";
import { PositionLabel } from "@/components/position-label";
import { PARTY_SIZE, POSITION_NAMES, toParty, type Party, type PartyMember } from "@/lib/party";
import { fetchPartyLink, type PartyLink } from "@/lib/party-link";
import { createClient } from "@/lib/supabase/client";
import { DraftCaptain } from "./draft-captain";
import { InviteFromStack, type StackOption } from "./invite-from-stack";
import { PartyLinkCard } from "./party-link";

export interface Invitee {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** "Friend", or the team you share. */
  detail: string;
}

/** Favourite heroes by player, then by position, best first. */
type Pool = Record<string, Record<number, number[]>>;

/**
 * The heroes behind each seat: your own favourites, plus everyone's when you run the party's
 * draft (party_hero_pool returns rows only to the draft captain, or the leader with no captain).
 * The art is decoration, so a failed read just leaves the seats plain.
 */
async function loadPool(supabase: ReturnType<typeof createClient>, userId: string): Promise<Pool> {
  const [own, party] = await Promise.all([
    supabase.from("favorite_heroes").select("user_id, position, hero_id").eq("user_id", userId).order("created_at"),
    supabase.rpc("party_hero_pool"),
  ]);
  if (own.error) console.error("Favourite heroes not loaded", own.error.message);
  if (party.error) console.error("Party hero pool not loaded", party.error.message);
  const pool: Pool = {};
  for (const row of [...(own.data ?? []), ...(party.data ?? [])]) {
    const byPos = (pool[row.user_id] ??= {});
    const list = (byPos[row.position] ??= []);
    if (!list.includes(row.hero_id)) list.push(row.hero_id);
  }
  return pool;
}

/** The hero shown on a seat: the player's best hero for their position this game, else any favourite. */
function seatHero(pool: Pool, member: PartyMember): number | null {
  const byPos = pool[member.id];
  if (!byPos) return null;
  if (member.position && byPos[member.position]?.[0]) return byPos[member.position]![0]!;
  const positions = Object.keys(byPos)
    .map(Number)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  return positions.length ? (byPos[positions[0]!]![0] ?? null) : null;
}

/** What the header chip shows of a party: which one, and how many players. */
function partyShape(party: Party | null): string {
  return party ? `${party.id}:${party.members.length}` : "";
}

/** The lobby: five seats, your position for this game, and invites and the invite link for the leader. */
export function PartyLobby({
  userId,
  initialParty,
  initialLink,
  invitees,
  stacks = [],
  heroArt,
}: {
  userId: string;
  initialParty: Party | null;
  /** The invite link of initialParty, when the user leads it. */
  initialLink: PartyLink | null;
  invitees: Invitee[];
  /** Stacks you own or play in, for Invite from Stack. */
  stacks?: StackOption[];
  /** Hero name and landscape image by hero id, for the seats. */
  heroArt: Record<number, { name: string; image: string }>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [party, setParty] = useState(initialParty);
  const [pool, setPool] = useState<Pool>({});
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startStack, setStartStack] = useState("");
  const partyId = party?.id ?? null;
  const shownShape = useRef(partyShape(initialParty));
  const getLink = useCallback((fresh: boolean) => fetchPartyLink(supabase, fresh), [supabase]);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("party_view");
    if (error) return setError(`Party not loaded: ${error.message}`);
    const next = toParty(data);
    setParty(next);
    // The header's party chip is drawn on the server, so redraw it when the party or its size changes.
    const shape = partyShape(next);
    if (shape !== shownShape.current) {
      shownShape.current = shape;
      router.refresh();
    }
    if (!next) return setInvited(new Set());
    setPool(await loadPool(supabase, userId));
    const { data: invites } = await supabase.from("party_invites").select("user_id").eq("party_id", next.id).eq("status", "pending");
    setInvited(new Set((invites ?? []).map((i) => i.user_id as string)));
  }, [supabase, userId, router]);

  // Seat art after the first paint; refresh() reloads it as players join or move.
  useEffect(() => {
    if (!partyId) return;
    let cancelled = false;
    loadPool(supabase, userId).then((p) => {
      if (!cancelled) setPool(p);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, partyId]);

  // Live updates: players joining, leaving, picking positions, and the leader changing.
  useEffect(() => {
    if (!partyId) return;
    const channel = supabase
      .channel(`party:${partyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parties",
          filter: `id=eq.${partyId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "party_members",
          filter: `party_id=eq.${partyId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "party_members",
          filter: `party_id=eq.${partyId}`,
        },
        refresh,
      )
      // Realtime can't filter deletes, so they are checked here.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "party_members" }, (change) => {
        if ((change.old as { party_id?: string }).party_id === partyId) refresh();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_invites",
          filter: `party_id=eq.${partyId}`,
        },
        refresh,
      )
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
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-dire">{error}</p>}
        <ul aria-hidden className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: PARTY_SIZE }, (_, i) => (
            <li key={i} className={`aspect-video rounded-sm bg-surface ring-1 ring-inset ring-line ${i > 1 ? "max-sm:hidden" : ""}`} />
          ))}
        </ul>
        <div data-tour="party-start" className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-4">
          <p className="flex-1 text-sm text-muted">You&apos;re not in a party. Start one and invite your friends and teammates.</p>
          {stacks.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <label htmlFor="start-stack">Stack</label>
              <select
                id="start-stack"
                value={startStack}
                onChange={(e) => setStartStack(e.target.value)}
                className="field h-9 w-auto"
              >
                <option value="">No Stack</option>
                {stacks.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => run("Party not started", () => supabase.rpc("start_party", startStack ? { team: startStack } : {}))}
            disabled={busy}
            className="btn btn-primary"
          >
            Start a Party
          </button>
        </div>
      </div>
    );
  }

  const isLeader = party.leaderId === userId;
  const memberIds = new Set(party.members.map((m) => m.id));
  const toInvite = invitees.filter((i) => !memberIds.has(i.id));
  const full = party.members.length >= PARTY_SIZE;
  const emptySlots = PARTY_SIZE - party.members.length;

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-dire">{error}</p>}

      <section aria-label="Players" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="section-title">
            Players{" "}
            <span className="num text-base font-medium text-subtle">
              {party.members.length} of {PARTY_SIZE}
            </span>
          </h2>
          <button
            onClick={() => run("Could not leave", () => supabase.rpc("leave_party"))}
            disabled={busy}
            className="btn btn-ghost btn-sm"
          >
            Leave Party
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {party.members.map((m) => {
            const hero = seatHero(pool, m);
            return (
              <Seat
                key={m.id}
                member={m}
                art={hero !== null ? heroArt[hero] : undefined}
                isLeader={m.id === party.leaderId}
                isCaptain={m.id === party.captain.id}
                isMe={m.id === userId}
                // Every member holds a position; taking a held one swaps the two players.
                onPosition={(want) => run("Position not saved", () => supabase.rpc("set_party_position", { want }))}
                onRemove={
                  isLeader && m.id !== userId
                    ? () => run("Could not remove", () => supabase.rpc("remove_from_party", { target: m.id }))
                    : undefined
                }
              />
            );
          })}
          {Array.from({ length: emptySlots }, (_, i) => (
            <li key={`empty-${i}`} className="flex flex-col gap-2">
              <div className="grid aspect-video place-items-center rounded-sm bg-surface text-sm text-subtle ring-1 ring-inset ring-line">
                Open seat
              </div>
              <span className="text-sm text-subtle">Waiting for a player</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 rounded-md bg-surface p-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
        <div data-tour="party-captain" className="min-w-0 flex-1">
          <DraftCaptain
            party={party}
            userId={userId}
            busy={busy}
            run={run}
            become={() => supabase.rpc("become_captain")}
            stepDown={() => supabase.rpc("step_down_captain")}
          />
        </div>
        <Link href="/draft" data-tour="party-draft" className="btn btn-secondary shrink-0">
          Open Party Draft
        </Link>
      </div>

      {isLeader && (
        <PartyLinkCard
          // A new party starts with a new link.
          key={party.id}
          initialLink={party.id === initialParty?.id ? initialLink : null}
          isFull={full}
          getLink={getLink}
        />
      )}

      {isLeader && !full && (
        <InviteFromStack
          stacks={stacks}
          initialStack={party.teamId}
          memberIds={party.members.map((m) => m.id)}
          openSeats={emptySlots}
          onInvited={refresh}
        />
      )}

      {isLeader ? (
        <section aria-label="Invite" data-tour="party-invite" className="flex flex-col gap-2">
          <h2 className="section-title">
            Invite <span className="num text-base font-medium text-subtle">{toInvite.length}</span>
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {toInvite.length ? (
              toInvite.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <Avatar
                    account={{
                      name: p.name,
                      avatarUrl: p.avatarUrl,
                      detail: null,
                      steamLinked: false,
                    }}
                    size={32}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium leading-tight text-fg">{p.name}</span>
                    <span className="truncate text-xs text-muted">{invited.has(p.id) ? "Invite sent" : p.detail}</span>
                  </span>
                  <button
                    onClick={() => run("Invite not sent", () => supabase.rpc("invite_to_party", { target: p.id }))}
                    disabled={busy || full}
                    className="btn btn-secondary btn-sm"
                  >
                    {invited.has(p.id) ? "Invite Again" : "Invite"}
                  </button>
                </li>
              ))
            ) : (
              <li className="py-4 text-sm text-muted">No one to invite yet. Add friends on the Friends page, or join a Stack.</li>
            )}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted">The party leader sends the invites.</p>
      )}
    </div>
  );
}

function Seat({
  member,
  art,
  isLeader,
  isCaptain,
  isMe,
  onPosition,
  onRemove,
}: {
  member: PartyMember;
  art?: { name: string; image: string };
  isLeader: boolean;
  isCaptain: boolean;
  isMe: boolean;
  onPosition: (want: number) => void;
  onRemove?: () => void;
}) {
  const position = member.position;
  return (
    <li className="group flex min-w-0 flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-sm bg-surface ring-1 ring-inset ring-line">
        {art ? (
          <Image src={art.image} alt={art.name} fill sizes="(min-width: 1024px) 20vw, 50vw" unoptimized className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center">
            <Avatar
              account={{
                name: member.name,
                avatarUrl: member.avatarUrl,
                detail: null,
                steamLinked: false,
              }}
              size={48}
            />
          </div>
        )}
        {isMe && (
          <span className="absolute right-1.5 top-1.5 rounded-xs bg-radiant px-1.5 text-xs font-semibold leading-4 text-bg">You</span>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${member.name}`}
            title={`Remove ${member.name}`}
            className="absolute left-1.5 top-1.5 grid size-7 place-items-center rounded-sm bg-bg/80 text-muted hover:text-dire focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium leading-tight text-fg">{member.name}</span>
        {isMe ? (
          <select
            aria-label="Your position this game"
            data-tour="party-position"
            value={position ?? ""}
            onChange={(e) => {
              if (e.target.value) onPosition(Number(e.target.value));
            }}
            className="field h-8 w-full py-0 text-sm"
          >
            {!position && (
              <option value="" disabled>
                Pick a Position
              </option>
            )}
            {Object.entries(POSITION_NAMES).map(([n, name]) => (
              <option key={n} value={n}>
                {name}
              </option>
            ))}
          </select>
        ) : position ? (
          <PositionLabel position={position} size={14} className="min-w-0 text-sm text-muted" />
        ) : (
          <span className="truncate text-sm text-muted">No Position Yet</span>
        )}
        {(isLeader || isCaptain) && (
          <span className="flex flex-wrap gap-1">
            {isCaptain && <span className="chip chip-accent micro">Draft Captain</span>}
            {isLeader && <span className="chip micro">Leader</span>}
          </span>
        )}
      </div>
    </li>
  );
}
