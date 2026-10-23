"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { disconnectSteam, syncSteam } from "./actions";

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
  /** Signed up with "Sign in with Steam", so Steam is their only way in. */
  steamOnly: boolean;
}

/** The connected Steam account, or an optional button to link one, for rank and hero record. */
export function SteamLink({ account, result }: { account: SteamAccount | null; result?: { text: string; ok: boolean } }) {
  return (
    <section className="card flex flex-col gap-3 px-4 py-3" aria-labelledby="steam-heading">
      {account ? <Connected account={account} /> : <NotLinked />}
      {result && (
        <p role="status" className={`text-sm ${result.ok ? "text-radiant" : "text-dire"}`}>
          {result.text}
        </p>
      )}
    </section>
  );
}

function NotLinked() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setPending(true);
    setError(null);
    const { data, error } = await createClient().functions.invoke<{ url: string }>("steam-link", {
      body: { next: "/my-heroes" },
    });
    if (error || !data?.url) {
      setPending(false);
      setError("Could not start linking. Please try again.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="mr-auto flex flex-col">
        <h2 id="steam-heading" className="font-semibold">
          Steam account
        </h2>
        <span className="text-sm text-muted">Optional. Linking adds your rank and hero record to suggestions.</span>
        {error && <span className="text-sm text-dire">{error}</span>}
      </div>
      <button onClick={link} disabled={pending} className="btn btn-secondary">
        {pending ? "Opening Steam…" : "Link Steam account"}
      </button>
    </div>
  );
}

function Connected({ account }: { account: SteamAccount }) {
  const [syncError, sync, syncing] = useActionState(syncSteam, null);
  const [disconnectError, disconnect, disconnecting] = useActionState(disconnectSteam, null);
  const [confirming, setConfirming] = useState(false);
  const profileUrl = `https://steamcommunity.com/profiles/${account.steamId}`;
  const openDotaUrl = `https://www.opendota.com/players/${account.accountId}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {account.avatarUrl ? (
          <Image src={account.avatarUrl} alt="" width={48} height={48} className="rounded-md ring-1 ring-line-strong" />
        ) : (
          <span aria-hidden className="h-12 w-12 rounded-md bg-hover ring-1 ring-line-strong" />
        )}
        <div className="mr-auto flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="steam-heading" className="truncate font-semibold">
              {account.name ?? "Steam account"}
            </h2>
            <span className="rounded-sm bg-radiant-strong/25 px-1.5 py-0.5 text-xs font-semibold text-radiant">
              Steam connected
            </span>
          </div>
          <p className="text-sm text-muted">
            <span className="text-fg">{account.rank ?? "Rank hidden"}</span>
            {" · "}
            {account.games > 0 ? `${account.games} games in the last 6 months` : "No public games yet"}
            {" · "}
            {account.syncedAgo ? `Updated ${account.syncedAgo}` : "Not updated yet"}
          </p>
          <p className="flex gap-3 text-xs">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="link">
              Steam profile
            </a>
            <a href={openDotaUrl} target="_blank" rel="noopener noreferrer" className="link">
              OpenDota
            </a>
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
              {syncing ? "Updating…" : "Update now"}
            </button>
          </form>
          {!account.steamOnly && !confirming && (
            <button onClick={() => setConfirming(true)} className="btn btn-ghost btn-sm">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <form action={disconnect} className="flex flex-wrap items-center gap-3 rounded-md bg-raised px-3 py-2 text-sm">
          <span className="mr-auto text-muted">
            Disconnect Steam? Your rank and hero record are removed from suggestions. You can link it again any time.
          </span>
          <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button type="submit" disabled={disconnecting} className="btn btn-secondary btn-sm text-dire">
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </form>
      )}

      {!account.rank && (
        <p className="text-xs text-subtle">
          OpenDota can&apos;t see your rank. In Dota 2, turn on Settings &gt; Options &gt; Social &gt;{" "}
          <em>Expose Public Match Data</em>, play a match, then update.
        </p>
      )}
      {account.steamOnly && (
        <p className="text-xs text-subtle">You sign in with Steam, so it stays connected.</p>
      )}
      {(syncError || disconnectError) && <p className="text-sm text-dire">{syncError ?? disconnectError}</p>}
    </>
  );
}
