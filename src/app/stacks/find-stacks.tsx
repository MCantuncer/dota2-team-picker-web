"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/account-menu";
import { RankMedal } from "@/components/rank-medal";
import { rankName } from "@/lib/rank";
import { toStackCard, type StackCard } from "@/lib/stacks";
import { createClient } from "@/lib/supabase/client";

/** browse_stacks answers 50 a page. */
const PAGE = 50;

/**
 * Hot Stacks (most games together lately) and a searchable list of every open Stack. You can't join
 * directly: Ask to Join sends a request the owner accepts or declines on the site.
 */
export function FindStacks({
  hot,
  all: firstPage,
  mine,
  requests: initialRequests,
}: {
  hot: StackCard[];
  all: StackCard[];
  /** Stacks you own or play in: no Ask to Join there. */
  mine: string[];
  /** Your open requests: Stack id to request id. */
  requests: Record<string, string>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState(initialRequests);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [shownSearch, setShownSearch] = useState("");
  const [list, setList] = useState(firstPage);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(firstPage.length === PAGE);
  const [loading, setLoading] = useState(false);
  const own = new Set(mine);

  const load = async (term: string, next: number) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("browse_stacks", {
      search: term || undefined,
      page: next,
    });
    setLoading(false);
    if (error) return setError(`Could not load Stacks: ${error.message}`);
    setError(null);
    const cards = (data ?? []).map(toStackCard);
    setList((cur) => (next === 0 ? cards : [...cur, ...cards]));
    setPage(next);
    setMore(cards.length === PAGE);
    setShownSearch(term);
  };

  const ask = async (stack: StackCard) => {
    setBusy(stack.id);
    const { data, error } = await supabase.rpc("ask_to_join_team", {
      team: stack.id,
    });
    setBusy(null);
    if (error || !data) return setError(`Request not sent: ${error?.message ?? "unknown error"}`);
    setError(null);
    setRequests((cur) => ({ ...cur, [stack.id]: data }));
  };

  const cancel = async (stack: StackCard, request: string) => {
    setBusy(stack.id);
    const { error } = await supabase.rpc("cancel_join_request", { request });
    setBusy(null);
    if (error) return setError(`Request not cancelled: ${error.message}`);
    setError(null);
    setRequests((cur) => Object.fromEntries(Object.entries(cur).filter(([id]) => id !== stack.id)));
  };

  const card = (s: StackCard, hot = false) => {
    const request = requests[s.id];
    const rank = s.averageRank ? rankName(s.averageRank) : null;
    return (
      <li key={s.id} className="stack-banner group relative flex min-w-0 flex-col">
        <div className="flex items-center gap-3.5 p-4 pb-3.5">
          {s.averageRank && rank ? (
            <RankMedal rankTier={s.averageRank} size={60} />
          ) : (
            <Image src="/ranks/rank_icon_0.png" alt="" aria-hidden width={60} height={60} className="shrink-0 opacity-60" />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <Link
              href={`/stacks/${s.id}`}
              className="row-link text-lg leading-6 font-semibold break-words transition-colors group-hover:text-accent-bright"
            >
              {s.name}
            </Link>
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
              <Avatar account={{ name: s.ownerName, avatarUrl: s.ownerAvatarUrl, detail: null, steamLinked: false }} size={20} />
              <span className="truncate">{s.ownerName}</span>
              <span className="flex shrink-0 items-center gap-1 text-subtle">
                <Icon name="crown" />
                Owner
              </span>
            </span>
          </span>
          {hot && (
            <span className="chip chip-accent shrink-0 self-start">
              <Icon name="flame" />
              Hot
            </span>
          )}
        </div>

        <dl className="grid grid-cols-3 border-y border-line bg-bg/40">
          <Fact label={s.members === 1 ? "Player" : "Players"}>
            <span className="num">{s.members}</span>
          </Fact>
          <Fact label="Games in 2 Weeks">
            <span className={s.games ? "num" : "num text-subtle"}>{s.games}</span>
          </Fact>
          <Fact label="Average Rank">{rank ?? <span className="text-subtle">No Rank</span>}</Fact>
        </dl>

        <div className="relative z-10 mt-auto flex min-h-14 items-center gap-2 px-4 py-2.5">
          {own.has(s.id) ? (
            <>
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <span aria-hidden className="grid size-5 place-items-center rounded-full bg-radiant text-bg">
                  <Icon name="check" />
                </span>
                Your Stack
              </span>
              <Link href={`/stacks/${s.id}`} className="btn btn-secondary btn-sm ml-auto">
                Stack Page
                <Icon name="chevronRight" />
              </Link>
            </>
          ) : request ? (
            <>
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <Icon name="clock" />
                Request Sent
              </span>
              <button
                onClick={() => cancel(s, request)}
                disabled={busy === s.id}
                className="btn btn-ghost btn-sm ml-auto"
              >
                <Icon name="x" />
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => ask(s)} disabled={busy === s.id} className="btn btn-secondary btn-sm w-full">
              <Icon name="userPlus" />
              Ask to Join
            </button>
          )}
        </div>
      </li>
    );
  };
  const grid = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="flex max-w-6xl flex-col gap-8 border-t border-line pt-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="section-title">Find a Stack</h2>
        <p className="text-sm text-muted">Ask to join and the owner answers on the site.</p>
      </div>
      {error && <p className="text-sm text-dire">{error}</p>}

      {hot.length > 0 && (
        <section aria-labelledby="hot-heading" className="flex flex-col gap-2">
          <h3 id="hot-heading" className="flex items-center gap-2 font-semibold text-fg">
            <Icon name="flame" />
            Hot Stacks
          </h3>
          <ul className={grid}>{hot.map((s) => card(s, true))}</ul>
        </section>
      )}

      <section aria-labelledby="all-heading" className="flex flex-col gap-3">
        <h3 id="all-heading" className="font-semibold text-fg">
          All Stacks
        </h3>
        {(list.length > 0 || shownSearch) && (
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              void load(search.trim(), 0);
            }}
            className="flex max-w-md gap-2"
          >
            <label htmlFor="stack-search" className="sr-only">
              Search Stacks by name
            </label>
            <input
              id="stack-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name"
              maxLength={40}
              className="field flex-1"
            />
            <button type="submit" disabled={loading} className="btn btn-secondary">
              <Icon name="search" />
              Search
            </button>
          </form>
        )}
        {list.length ? (
          <ul className={grid}>{list.map((s) => card(s))}</ul>
        ) : shownSearch ? (
          <p className="text-sm text-muted">No open Stack matches &quot;{shownSearch}&quot;.</p>
        ) : (
          <div className="flex items-center gap-3.5 rounded-md border border-dashed border-line-strong p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-raised text-subtle ring-1 ring-inset ring-line-strong">
              <Icon name="flame" large />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-semibold text-fg">No Open Stacks Yet</span>
              <span className="text-sm text-subtle">Yours could be the first.</span>
            </span>
          </div>
        )}
        {more && (
          <button
            onClick={() => load(shownSearch, page + 1)}
            disabled={loading}
            className="btn btn-ghost btn-sm self-start"
          >
            {loading ? "Loading…" : "Show More"}
          </button>
        )}
      </section>
    </div>
  );
}

/** One number on a Stack card: the value over its label. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-1 py-2.5 text-center not-first:border-l not-first:border-line">
      <dt className="micro order-2 whitespace-nowrap text-subtle">{label}</dt>
      <dd className="text-base font-semibold text-fg">{children}</dd>
    </div>
  );
}
