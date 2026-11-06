"use client";

import Image from "next/image";
import { useActionState } from "react";
import { ExternalButton } from "@/components/external-button";
import { SteamLogo } from "@/components/steam-button";
import { syncSteam } from "./actions";

export interface SteamAccount {
  steamId: string;
  /** The 32-bit id OpenDota and Dota use. */
  accountId: number;
  name: string | null;
  avatarUrl: string | null;
  rank: string | null;
  /** Games in the last six months that OpenDota can see. */
  games: number;
  topHeroes: { id: number; name: string; image: string; games: number }[];
  /** e.g. "12 min ago", or null if never synced. */
  syncedAgo: string | null;
}

/** The player's Steam account: rank, public games, most played heroes, and a button to read them again. */
export function SteamCard({ account }: { account: SteamAccount }) {
  const [syncError, sync, syncing] = useActionState(syncSteam, null);
  const profileUrl = `https://steamcommunity.com/profiles/${account.steamId}`;
  const openDotaUrl = `https://www.opendota.com/players/${account.accountId}`;

  return (
    <section className="flex flex-col gap-3 rounded-md bg-surface px-5 py-4" aria-labelledby="steam-heading">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {account.avatarUrl ? (
          <Image src={account.avatarUrl} alt="" width={48} height={48} className="rounded-md ring-1 ring-line-strong" />
        ) : (
          <span aria-hidden className="h-12 w-12 rounded-md bg-hover ring-1 ring-line-strong" />
        )}
        <div className="mr-auto flex min-w-0 flex-col gap-0.5">
          <h2 id="steam-heading" className="truncate font-semibold">
            {account.name ?? "Steam Account"}
          </h2>
          <p className="text-sm text-muted">
            <span className="text-fg">{account.rank ?? "Rank hidden"}</span>
            {" · "}
            {account.games > 0 ? `${account.games} games in the last 6 months` : "No public games yet"}
            {" · "}
            {account.syncedAgo ? `Updated ${account.syncedAgo}` : "Not updated yet"}
          </p>
          <p className="-ml-3 flex flex-wrap gap-1">
            <ExternalButton href={profileUrl}>
              <SteamLogo className="h-4 w-4" />
              Steam Profile
            </ExternalButton>
            <ExternalButton href={openDotaUrl}>OpenDota</ExternalButton>
          </p>
        </div>
        {account.topHeroes.length > 0 && (
          <ul className="flex gap-2" aria-label="Most played heroes">
            {account.topHeroes.map((h) => (
              <li key={h.id} className="flex flex-col items-center gap-0.5" title={`${h.name}: ${h.games} games`}>
                <Image src={h.image} alt={h.name} width={56} height={32} className="rounded-sm ring-1 ring-line-strong" />
                <span className="text-xs text-subtle">{h.games}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <form action={sync}>
            <button type="submit" disabled={syncing} className="btn btn-secondary btn-sm">
              {syncing ? "Updating…" : "Update Now"}
            </button>
          </form>
        </div>
      </div>

      {!account.rank && (
        <p className="text-xs text-subtle">
          OpenDota can&apos;t see your rank. In Dota 2, turn on Settings &gt; Options &gt; Social &gt;{" "}
          <em>Expose Public Match Data</em>, play a match, then update.
        </p>
      )}
      {syncError && <p className="text-sm text-dire">{syncError}</p>}
    </section>
  );
}
