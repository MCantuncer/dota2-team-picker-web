"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/account-menu";
import { Icon } from "@/components/icon";
import { MemberList, type HeroFace } from "@/components/stacks/member-list";
import { bannerHero, StackBanner, type BannerStack } from "@/components/stacks/stack-banner";
import { StackCrest } from "@/components/stacks/stack-crest";
import { StackLineup, type HeroArt } from "@/components/stacks/stack-lineup";
import type { Seat } from "@/lib/stack-seats";
import type { FriendInvite, Member, StackRef } from "@/lib/stacks";
import { createClient } from "@/lib/supabase/client";
import { FriendInvites, NewPlayers } from "./stack-invites";

/** A Stack you play in but do not run. */
export interface JoinedStack {
  id: string;
  name: string;
  ownerName: string;
}

/** A friend invite sent to you, waiting for Join or Decline. */
export interface OpenInvite {
  id: string;
  stackName: string;
  inviterName: string;
  inviterAvatarUrl: string | null;
  members: number;
}

export interface Friend {
  id: string;
  name: string;
  avatarUrl: string | null;
}

const EMPTY_COPY =
  "Everyone you play with, saved in one place. Pick who's in for this game and draft for all of them together. Arguing about who plays mid is still up to you.";

export function StackBoard({
  userId,
  stacks,
  joined,
  current,
  members: initialMembers,
  friendInvites,
  openInvites,
  friends,
  icons,
  art = {},
  banner = null,
  seats = [],
  waiting = 0,
}: {
  userId: string;
  /** Stacks you own or manage. */
  stacks: StackRef[];
  joined: JoinedStack[];
  current: StackRef | null;
  members: Member[];
  friendInvites: FriendInvite[];
  openInvites: OpenInvite[];
  friends: Friend[];
  icons: Record<number, HeroFace>;
  /** 16:9 portraits for the Lineup. */
  art?: Record<number, HeroArt>;
  /** The open Stack's head; null when it couldn't be read. */
  banner?: BannerStack | null;
  /** The open Stack's players in Lineup order. */
  seats?: Seat[];
  /** Players asking to join the open Stack. */
  waiting?: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [allHeroes, setAllHeroes] = useState(false);
  const none = !stacks.length && !joined.length;

  const remove = async (m: Member) => {
    if (!current) return;
    const { error } = await supabase.from("team_members").delete().eq("team_id", current.id).eq("user_id", m.id);
    if (error) return setError(`Member not removed: ${error.message}`);
    setError(null);
    setMembers((cur) => cur.filter((x) => x.id !== m.id));
  };

  const setRole = async (m: Member, role: Member["role"]) => {
    if (!current) return;
    const { error } = await supabase.from("team_members").update({ role }).eq("team_id", current.id).eq("user_id", m.id);
    if (error) return setError(`Role not changed: ${error.message}`);
    setError(null);
    setMembers((cur) => cur.map((x) => (x.id === m.id ? { ...x, role } : x)));
  };

  const leave = async (stack: JoinedStack) => {
    const { error } = await supabase.from("team_members").delete().eq("team_id", stack.id).eq("user_id", userId);
    if (error) return setError(`Could not leave ${stack.name}: ${error.message}`);
    router.refresh();
  };

  return (
    <div className="flex max-w-6xl flex-col gap-8">
      {openInvites.length > 0 && <InvitesToYou invites={openInvites} onError={setError} />}
      {error && <p className="text-sm text-dire">{error}</p>}

      {none ? (
        <section aria-labelledby="no-stack" className="card flex flex-col gap-4 p-6">
          <h2 id="no-stack" className="text-lg font-semibold">
            Create Your First Stack
          </h2>
          <p className="max-w-prose text-sm text-muted">{EMPTY_COPY}</p>
          <CreateStack userId={userId} />
        </section>
      ) : (
        <>
          <nav aria-label="Your Stacks" className="flex flex-wrap items-center gap-2">
            {stacks.map((s) => (
              <Link
                key={s.id}
                href={`/stacks?stack=${s.id}`}
                aria-current={s.id === current?.id ? "page" : undefined}
                className={`btn btn-sm ${s.id === current?.id ? "btn-secondary text-fg" : "btn-ghost text-muted"}`}
              >
                {s.name}
                {!s.owned && <span className="text-xs text-subtle">Manager</span>}
              </Link>
            ))}
            <CreateStack userId={userId} compact />
          </nav>

          {current && (
            <div className="flex flex-col gap-8">
              {banner && (
                <StackBanner
                  stack={banner}
                  seats={seats}
                  hero={bannerHero(seats, userId, art)}
                  waiting={waiting}
                  inviteHref="#invite-heading"
                  onError={setError}
                />
              )}
              {seats.length > 0 && (
                <StackLineup
                  seats={seats}
                  hero={(id) => art[id] ?? { name: `Hero ${id}` }}
                  youId={userId}
                  action={
                    <button type="button" onClick={() => setAllHeroes((o) => !o)} aria-expanded={allHeroes} className="btn btn-ghost btn-sm">
                      {allHeroes ? "Hide All Heroes" : "Show All Heroes"}
                    </button>
                  }
                />
              )}
              <section aria-labelledby="invite-heading" className="flex flex-col gap-3.5">
                <h2 id="invite-heading" className="section-title">
                  Invite Players
                </h2>
                <div className="grid grid-cols-1 divide-line rounded-md ring-1 ring-inset ring-line max-md:divide-y md:grid-cols-2 md:divide-x">
                  <FriendInvites stackId={current.id} friends={friends} members={members} initial={friendInvites} onError={setError} />
                  <NewPlayers />
                </div>
              </section>
              {(allHeroes || !seats.length) && (
                <MemberList
                  members={members}
                  hero={(id) => icons[id] ?? { name: `Hero ${id}` }}
                  isOwner={current.owned}
                  onRemove={remove}
                  onRole={setRole}
                />
              )}
            </div>
          )}

          {joined.length > 0 && (
            <section aria-labelledby="joined-heading" className="flex flex-col gap-3.5">
              <h2 id="joined-heading" className="section-title">
                Stacks You Play In
              </h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {joined.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-md bg-surface p-3 ring-1 ring-inset ring-line">
                    <StackCrest name={s.name} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Link href={`/stacks/${s.id}`} className="truncate font-semibold text-fg hover:underline">
                        {s.name}
                      </Link>
                      <span className="flex items-center gap-1 text-sm text-subtle">
                        <Icon name="crown" />
                        <span className="truncate">{s.ownerName}</span>
                      </span>
                    </span>
                    <button onClick={() => leave(s)} className="btn btn-secondary btn-sm">
                      Leave
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Friend invites waiting for your answer. Joining shares your heroes and positions with the Stack's owner and Managers. */
function InvitesToYou({ invites, onError }: { invites: OpenInvite[]; onError: (e: string | null) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const answer = async (invite: OpenInvite, accept: boolean) => {
    setBusy(invite.id);
    const { error } = await supabase.rpc("answer_team_invite", { invite: invite.id, accept });
    setBusy(null);
    if (error) return onError(`Invite not answered: ${error.message}`);
    onError(null);
    router.refresh();
  };

  return (
    <section aria-labelledby="invites-heading" className="flex flex-col gap-2">
      <h2 id="invites-heading" className="text-lg font-semibold">
        Invites
      </h2>
      <p className="text-sm text-muted">Joining shares your heroes and positions with the Stack&apos;s owner and Managers.</p>
      <ul className="divide-y divide-line border-y border-line">
        {invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <Avatar account={{ name: i.inviterName, avatarUrl: i.inviterAvatarUrl, detail: null, steamLinked: false }} size={32} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-fg">{i.stackName}</span>
              <span className="text-xs text-muted">
                {i.inviterName} invited you · <span className="num">{i.members}</span> {i.members === 1 ? "member" : "members"}
              </span>
            </span>
            <button onClick={() => answer(i, true)} disabled={busy === i.id} className="btn btn-primary btn-sm">
              Join
            </button>
            <button onClick={() => answer(i, false)} disabled={busy === i.id} className="btn btn-secondary btn-sm">
              Decline
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Starts a new Stack and opens it. */
function CreateStack({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [open, setOpen] = useState(!compact);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    const { data, error } = await supabase.from("teams").insert({ owner_id: userId, name: trimmed }).select("id").single();
    setBusy(false);
    if (error || !data) return setError(`Stack not created: ${error?.message ?? "unknown error"}`);
    router.push(`/stacks?stack=${data.id}`);
    router.refresh();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm">
        <Icon name="plus" />
        New Stack
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label htmlFor="new-stack-name" className="sr-only">
        Stack name
      </label>
      <input
        id="new-stack-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => compact && e.key === "Escape" && setOpen(false)}
        placeholder="Stack name, e.g. Friday Five"
        maxLength={40}
        autoFocus={compact}
        className={`field ${compact ? "h-8 w-56" : "w-64"}`}
      />
      <button type="submit" disabled={busy || !name.trim()} className={`btn btn-primary ${compact ? "btn-sm" : ""}`}>
        Create Stack
      </button>
      {error && <span className="text-sm text-dire">{error}</span>}
    </form>
  );
}
