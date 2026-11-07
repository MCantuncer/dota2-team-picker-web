"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/account-menu";
import { ExternalButton } from "@/components/external-button";
import { Icon } from "@/components/icon";
import { RankMedal } from "@/components/rank-medal";
import { type AdminPlayer, heroCountText, joinedText, PAGE_SIZE, readPlayers, steamProfileUrl } from "@/lib/admin-players";
import { rankName } from "@/lib/rank";
import { createClient } from "@/lib/supabase/client";

/*
 * Every row uses the same fixed columns, so ranks, hero counts and join times line up down the list
 * whatever the name or "Today" / "Yesterday" / "6 Nov" text. On phones the rank moves under the name.
 */
const ROW =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2.5 md:grid-cols-[2.5rem_minmax(0,1fr)_10rem_6.5rem_9.5rem_5.5rem] md:gap-x-4";

/** The newest Steam players, newest first, with Show More for the next page. */
export function NewestPlayers({ initial, nowMs }: { initial: AdminPlayer[]; nowMs: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [players, setPlayers] = useState(initial);
  const [more, setMore] = useState(initial.length === PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function showMore() {
    const last = players.at(-1);
    if (!last) return;
    setLoading(true);
    setError(false);
    const { data, error } = await supabase.rpc("admin_newest_players", {
      max_rows: PAGE_SIZE,
      before_at: last.joinedAt,
      before_id: last.userId,
    });
    setLoading(false);
    if (error) {
      console.error("Admin newest players:", error.message);
      return setError(true);
    }
    const next = readPlayers(data);
    setPlayers((p) => [...p, ...next]);
    setMore(next.length === PAGE_SIZE);
  }

  if (players.length === 0) {
    return <p className="card px-5 py-6 text-sm text-muted">No one has signed in with Steam yet.</p>;
  }

  return (
    <div className="card">
      <ul aria-label="Newest players">
        {players.map((p) => {
          const rank = rankName(p.rankTier);
          return (
            <li key={p.userId} className={`${ROW} border-t border-line first:border-t-0`}>
              <span className="row-span-2 md:row-span-1">
                <Avatar account={{ name: p.name, avatarUrl: p.avatarUrl, detail: null, steamLinked: true }} size={40} />
              </span>
              <span className="min-w-0 font-medium break-words text-fg">{p.name}</span>
              <span className="col-start-2 row-start-2 flex min-w-0 items-center gap-2 text-sm text-muted md:col-start-auto md:row-start-auto">
                {p.rankTier ? <RankMedal rankTier={p.rankTier} size={28} /> : null}
                {rank ?? "No rank yet"}
              </span>
              <span className="hidden text-sm text-muted md:block">{heroCountText(p.heroCount)}</span>
              <span className="num col-start-3 row-start-1 justify-self-end whitespace-nowrap text-sm font-medium text-muted md:col-start-auto md:row-start-auto">
                {joinedText(p.joinedAt, nowMs)}
              </span>
              <span className="col-start-3 row-start-2 justify-self-end md:col-start-auto md:row-start-auto">
                <ExternalButton href={steamProfileUrl(p.steamId)} label={`${p.name} on Steam`}>
                  Steam
                </ExternalButton>
              </span>
            </li>
          );
        })}
      </ul>
      {(more || error) && (
        <div className="flex flex-col items-center gap-2 border-t border-line p-3">
          {error && (
            <p role="alert" className="notice notice-error">
              Couldn&apos;t load more players. Please try again.
            </p>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={showMore} disabled={loading}>
            {loading ? "Loading…" : "Show More"}
            {!loading && <Icon name="chevronDown" />}
          </button>
        </div>
      )}
    </div>
  );
}
