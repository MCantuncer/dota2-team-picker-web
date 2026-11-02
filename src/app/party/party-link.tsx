"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { partyLinkUrl, type PartyLink, type PartyLinkResult } from "@/lib/party-link";

const noSubscribe = () => () => {};
const COPIED_MS = 2000;

/**
 * The leader's invite link: copy it into Discord or Steam chat, or make a new one so the old one
 * stops working. Loads the link itself when it has none, for example right after the player
 * starts a party or becomes leader.
 */
export function PartyLinkCard({
  initialLink,
  isFull,
  getLink,
}: {
  initialLink: PartyLink | null;
  /** A full party hides the link; it comes back when a slot opens. */
  isFull: boolean;
  /** Fetches the link from the database; `fresh` replaces it. */
  getLink: (fresh: boolean) => Promise<PartyLinkResult>;
}) {
  // The site's address is only known in the browser; the server renders the path alone.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const [link, setLink] = useState(initialLink);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async (fresh: boolean) => {
    setBusy(true);
    const result = await getLink(fresh);
    setBusy(false);
    setError(result.error);
    if (result.link) setLink(result.link);
    return result.link;
  };

  useEffect(() => {
    if (link || error) return;
    let cancelled = false;
    getLink(false).then((result) => {
      if (cancelled) return;
      setError(result.error);
      if (result.link) setLink(result.link);
    });
    return () => {
      cancelled = true;
    };
  }, [link, error, getLink]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const url = link ? partyLinkUrl(origin, link.code) : "";

  const copy = async () => {
    if (!link) return;
    let current = link;
    // A lobby left open past the expiry holds a dead link; get the live one first.
    if (Date.parse(link.expiresAt) <= Date.now()) {
      const fresh = await load(false);
      if (!fresh) return;
      current = fresh;
    } else {
      // Copying counts as using it: keep it working another 24 hours.
      void load(false);
    }
    try {
      await navigator.clipboard.writeText(partyLinkUrl(origin, current.code));
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions, or Safari after an await): the field below can still be copied by hand.
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="party-link-heading" className="card flex flex-col gap-2 p-3">
      <h2 id="party-link-heading" className="text-base font-semibold">
        Invite link
      </h2>
      <p className="text-sm text-muted">
        Paste it in Discord or Steam chat. Anyone with it can join, friend or not. It works for 24 hours after you copy it.
      </p>
      {isFull ? (
        <p className="text-sm text-subtle">The party is full. The link comes back when a slot opens.</p>
      ) : error ? (
        <div role="alert" className="notice notice-error items-center justify-between">
          <span>Invite link not loaded: {error}</span>
          <button onClick={() => load(false)} disabled={busy} className="btn btn-secondary btn-sm">
            Try again
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            placeholder="Loading…"
            aria-label="Party invite link"
            onFocus={(e) => e.currentTarget.select()}
            className="field min-w-0 flex-1 font-mono text-sm"
          />
          <button onClick={copy} disabled={!link || busy} className="btn btn-primary">
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            onClick={() => load(true)}
            disabled={!link || busy}
            title="Make a new link. The old one stops working."
            className="btn btn-ghost"
          >
            New link
          </button>
        </div>
      )}
    </section>
  );
}
