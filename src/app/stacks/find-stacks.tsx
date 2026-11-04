"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { StackCrest } from "@/components/stacks/stack-crest";
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
    return (
      <li key={s.id} className="flex min-w-0 flex-col gap-3 rounded-md bg-surface p-4 ring-1 ring-inset ring-line">
        <span className="flex items-start gap-3">
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
          {hot && (
            <span className="chip chip-accent shrink-0">
              <Icon name="flame" />
              Hot
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Icon name="users" />
            <span className="num text-fg">{s.members}</span> {s.members === 1 ? "Player" : "Players"}
          </span>
          {s.games > 0 && (
            <span className="flex items-center gap-1.5">
              <Icon name="swords" />
              <span className="num text-fg">{s.games}</span> {s.games === 1 ? "Game" : "Games"} in 2 Weeks
            </span>
          )}
        </span>
        <span className="mt-auto flex min-h-8 items-center justify-end gap-2">
          {own.has(s.id) ? (
            <span className="chip">Your Stack</span>
          ) : request ? (
            <>
              <span className="text-xs text-subtle">Asked</span>
              <button onClick={() => cancel(s, request)} disabled={busy === s.id} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => ask(s)} disabled={busy === s.id} className="btn btn-secondary btn-sm">
              Ask to Join
            </button>
          )}
        </span>
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
        {list.length ? (
          <ul className={grid}>{list.map((s) => card(s))}</ul>
        ) : (
          <p className="text-sm text-muted">
            {shownSearch ? `No open Stack matches "${shownSearch}".` : "No open Stacks yet. Yours could be the first."}
          </p>
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
