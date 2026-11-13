"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/account-menu";
import { Icon } from "@/components/icon";
import { PageTour } from "@/components/page-tour";
import { RankMedal } from "@/components/rank-medal";
import type { HeroArt } from "@/components/stacks/stack-lineup";
import { winPercent, type Friend, type FriendRequest, type SharedGame } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { FriendDetail } from "./friend-detail";

/** A player from one of your Stacks you haven't added yet. */
export interface Suggestion {
  id: string;
  name: string;
  avatarUrl: string | null;
  stackName: string;
}

/** Your place in your open party, which decides whether you can invite. */
export type PartyRole = "leader" | "member" | null;

/**
 * The Friends page: your friend link, then your friends as a list (requests, in your party, the rest,
 * players from your Stacks) with the selected friend opened beside it. On phones the list and the friend
 * are separate screens: `opened` says the address named a friend.
 */
export function FriendsBoard({
  friendCode,
  friends,
  requests,
  suggestions,
  selected,
  opened,
  games,
  heroes,
  partyRole,
  now,
}: {
  friendCode: string | null;
  friends: Friend[];
  requests: FriendRequest[];
  suggestions: Suggestion[];
  selected: Friend | null;
  opened: boolean;
  games: SharedGame[];
  heroes: Record<number, HeroArt>;
  partyRole: PartyRole;
  /** When the page was rendered, so "2 hours ago" reads the same on the server and in the browser. */
  now: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  /** Runs one change, then reloads the page data so every part agrees. Says whether it worked. */
  const act = async (id: string, what: string, change: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(id);
    const { error } = await change();
    setBusy(null);
    if (error) {
      setError(`${what}: ${error.message}`);
      return false;
    }
    setError(null);
    router.refresh();
    return true;
  };
  // Decline, cancel and unfriend all delete the one row between the two of you.
  const unfriend = (id: string, what: string) =>
    act(id, what, () => supabase.from("friendships").delete().or(`requester_id.eq.${id},addressee_id.eq.${id}`));

  const incoming = requests.filter((r) => r.incoming);
  const sent = requests.filter((r) => !r.incoming);
  const inParty = friends.filter((f) => f.party === "yours");
  const rest = friends.filter((f) => f.party !== "yours");

  return (
    <>
      {/* Title, friend link, then the page's ?, each in its own column; on a phone the link drops under both. */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] ${opened ? "max-lg:hidden" : ""}`}
      >
        <div className="flex flex-col gap-1.5">
          <h1 className="page-title">Friends</h1>
          <p className="text-sm text-muted">Who you queue with, and how you do together.</p>
        </div>
        {friendCode && (
          <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <FriendLink code={friendCode} />
          </div>
        )}
        <div className="self-start sm:col-start-3 sm:row-start-1">
          <PageTour tour="friends" />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-dire">{error}</p>}
      {opened && (
        <Link href="/friends" scroll={false} className="btn btn-ghost btn-sm self-start lg:hidden">
          All Friends
        </Link>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside aria-label="Your friends" data-tour="friends-list" className={`card overflow-hidden ${opened ? "max-lg:hidden" : ""}`}>
          {incoming.length > 0 && (
            <Group title="Requests" count={incoming.length} accent>
              {incoming.map((r) => (
                <Row key={r.id} person={r} detail="Wants to be friends">
                  <button disabled={busy === r.id} onClick={() => act(r.id, "Request not accepted", () => supabase.rpc("accept_friend_request", { requester: r.id }))} className="btn btn-primary btn-sm">
                    Accept
                  </button>
                  <button disabled={busy === r.id} onClick={() => unfriend(r.id, "Decline failed")} aria-label={`Decline ${r.name}`} className="btn btn-ghost btn-icon btn-sm">
                    <Icon name="x" />
                  </button>
                </Row>
              ))}
            </Group>
          )}
          {inParty.length > 0 && (
            <Group title="In Your Party" count={inParty.length}>
              {inParty.map((f) => <FriendRow key={f.id} friend={f} selected={f.id === selected?.id} now={now} />)}
            </Group>
          )}
          <Group title="Friends" count={rest.length}>
            {rest.length ? (
              rest.map((f) => <FriendRow key={f.id} friend={f} selected={f.id === selected?.id} now={now} />)
            ) : (
              <p className="px-4 py-3 text-sm text-muted">
                {inParty.length ? "Everyone is in your party." : "No friends yet. Share your friend link, or add players from your Stacks."}
              </p>
            )}
          </Group>
          {sent.length > 0 && (
            <Group title="Sent" count={sent.length}>
              {sent.map((r) => (
                <Row key={r.id} person={r} detail="Waiting for them to accept">
                  <button disabled={busy === r.id} onClick={() => unfriend(r.id, "Cancel failed")} className="btn btn-ghost btn-sm">
                    Cancel
                  </button>
                </Row>
              ))}
            </Group>
          )}
          {suggestions.length > 0 && (
            <Group title="From Your Stacks" count={suggestions.length}>
              {suggestions.map((s) => (
                <Row key={s.id} person={s} detail={`In ${s.stackName} with you`}>
                  <button disabled={busy === s.id} onClick={() => act(s.id, "Request not sent", () => supabase.rpc("send_friend_request", { target: s.id }))} className="btn btn-secondary btn-sm">
                    Add Friend
                  </button>
                </Row>
              ))}
            </Group>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 pl-4 pr-2">
            <p className="text-xs text-subtle">Friends see your heroes for drafting.</p>
            <Link href="/profile#sharing" className="btn btn-ghost btn-sm">
              <Icon name="settings" />
              Sharing Settings
            </Link>
          </div>
        </aside>

        {selected ? (
          <FriendDetail
            key={selected.id}
            friend={selected}
            games={games}
            heroes={heroes}
            partyRole={partyRole}
            lastGame={selected.lastGame ? timeAgo(selected.lastGame, now) : null}
            className={opened ? "" : "max-lg:hidden"}
            onRemove={() => unfriend(selected.id, "Remove failed").then((done) => done && router.replace("/friends", { scroll: false }))}
          />
        ) : (
          <section className="card flex flex-col gap-2 p-6 max-lg:hidden">
            <h2 className="section-title">Add Your Squad</h2>
            <p className="max-w-prose text-sm text-muted">
              Send your friend link to the people you queue with. Once they accept, their heroes, your games together and
              who is in a party show here.
            </p>
          </section>
        )}
      </div>
    </>
  );
}

function Group({ title, count, accent = false, children }: { title: string; count: number; accent?: boolean; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="border-b border-line py-1.5 last-of-type:border-b-0">
      <h2 className={`flex items-center gap-1.5 px-4 pt-2 pb-1 text-sm font-semibold ${accent ? "text-accent" : "text-muted"}`}>
        {accent && <Icon name="user-plus" />}
        {title} <span className="num font-medium text-subtle">{count}</span>
      </h2>
      <ul>{children}</ul>
    </section>
  );
}

function Row({ person, detail, children }: { person: { name: string; avatarUrl: string | null }; detail: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <Avatar account={{ name: person.name, avatarUrl: person.avatarUrl, detail: null, steamLinked: false }} size={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-fg">{person.name}</span>
        <span className="truncate text-sm text-subtle">{detail}</span>
      </span>
      <span className="flex shrink-0 gap-1.5">{children}</span>
    </li>
  );
}

/** One friend: avatar with a party dot, name and medal, what they're up to, and your win rate together. */
function FriendRow({ friend: f, selected, now }: { friend: Friend; selected: boolean; now: number }) {
  const won = winPercent(f.together);
  const status =
    f.party === "yours"
      ? "In your party"
      : f.party === "other"
        ? `In a party${f.partySize ? ` · ${f.partySize} of 5` : ""}`
        : !f.shared
          ? "Rank hidden"
          : f.lastGame
            ? `Last game ${timeAgo(f.lastGame, now)}`
            : "No recent games";
  return (
    <li>
      <Link
        href={`/friends?friend=${f.id}`}
        scroll={false}
        aria-current={selected ? "page" : undefined}
        className={`relative flex items-center gap-3 px-4 py-2.5 hover:bg-hover focus-visible:bg-hover focus-visible:outline-none ${
          selected ? "bg-raised before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-xs before:bg-accent" : ""
        }`}
      >
        <span className="relative shrink-0">
          <Avatar account={{ name: f.name, avatarUrl: f.avatarUrl, detail: null, steamLinked: false }} size={44} />
          {f.party && (
            <span aria-hidden className={`absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-[2.5px] ring-surface ${f.party === "yours" ? "bg-radiant" : "bg-muted"}`} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 font-semibold text-fg">
            <span className="truncate">{f.name}</span>
            {f.rankTier !== null && <RankMedal rankTier={f.rankTier} size={20} />}
          </span>
          <span className={`truncate text-sm ${f.party === "yours" ? "text-radiant" : "text-subtle"}`}>{status}</span>
        </span>
        {won !== null && (
          <span className="flex w-18 shrink-0 flex-col items-end">
            <span className="num text-sm">{won}%</span>
            <span className="text-xs text-subtle">
              in <span className="num font-normal text-subtle">{f.together.games}</span> {f.together.games === 1 ? "game" : "games"}
            </span>
            <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line-hover">
              <span className={`block h-full rounded-full ${won >= 55 ? "bg-radiant" : "bg-muted"}`} style={{ width: `${won}%` }} />
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}

/** "2 hours ago", "3 days ago". */
export function timeAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

const noSubscribe = () => () => {};

function FriendLink({ code }: { code: string }) {
  // The site's address is only known in the browser; the server renders the path alone.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const link = `${origin}/add/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div data-tour="friends-link" className="flex w-full flex-col gap-1.5 sm:w-[27rem]">
      <label htmlFor="friend-link" className="text-sm text-subtle">
        Your Friend Link
      </label>
      <div className="flex gap-2">
        <input id="friend-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 text-sm" />
        <button onClick={copy} className="btn btn-primary">
          <Icon name={copied ? "check" : "copy"} />
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
