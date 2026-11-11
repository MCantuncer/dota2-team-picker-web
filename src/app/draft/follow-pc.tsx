"use client";

import { Icon } from "@/components/icon";
import type { Side } from "@/lib/draft-reader/geometry";

const SITE = "dota2teampicker.com";

/**
 * Phone Follows Your PC, on the phone: how to start (the PC reads Dota, this phone shows it), the live state while
 * the PC reads, and what to do when it stops. Shows nothing on an empty board while the draft is still loading.
 */
export function FollowPcPanel({
  live,
  stopped,
  empty,
  side,
  justRead,
  onAddByHand,
  className = "",
}: {
  /** The PC is reading the Dota window now. */
  live: boolean;
  /** The PC read Dota this draft and stopped. */
  stopped: boolean;
  /** Nothing on the board yet. */
  empty: boolean;
  side: Side | null;
  /** The name of the hero the PC read last, for a few seconds. */
  justRead: string | null;
  onAddByHand: () => void;
  /** For the live and stopped states, which the page may move above the picks. */
  className?: string;
}) {
  if (live)
    return (
      <div
        role="status"
        className={`sticky top-2 z-20 flex items-center gap-4 rounded-xl border border-radiant-strong bg-radiant-tint px-5 py-4 ${className}`}
      >
        <span aria-hidden className="live-dot text-radiant" />
        <span className="flex flex-col gap-1">
          <span className="font-semibold">Live from Your PC</span>
          <span className="text-sm text-muted">
            {justRead ? `${justRead} just read` : side ? `You are ${side === "radiant" ? "Radiant" : "Dire"}` : "Reading your Dota screen"}
          </span>
        </span>
      </div>
    );

  if (stopped && !empty)
    return (
      <div role="alert" className={`flex flex-col gap-4 rounded-xl border border-accent-deep bg-warn-tint px-5 py-5 ${className}`}>
        <span className="flex items-center gap-3 font-semibold">
          <span className="flex text-warn">
            <Icon name="alert" large />
          </span>
          Your PC Stopped Watching
        </span>
        <p className="leading-relaxed text-muted">
          Press Watch Dota on the PC again, or add the next heroes here.
        </p>
        <button onClick={onAddByHand} className="btn btn-primary self-start">
          <Icon name="pencil" />
          Add by Hand
        </button>
      </div>
    );

  if (!empty) return null;

  return (
    <section aria-labelledby="follow-pc-title" className="flex flex-col gap-5 rounded-xl border border-accent-deep bg-surface px-5 py-6">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-line-hover bg-raised text-accent">
          <Icon name="monitor" large />
        </span>
        <span className="flex flex-col gap-1">
          <h2 id="follow-pc-title" className="text-xl font-semibold">
            Fill Picks from Your PC
          </h2>
          <span className="leading-relaxed text-muted">Picks and bans land here by themselves while you draft.</span>
        </span>
      </div>
      <ol className="flex flex-col gap-3">
        {[
          <>
            Open <strong className="font-semibold">{SITE}</strong> on the PC you play on
          </>,
          <>
            Press <strong className="font-semibold">Watch Dota</strong> and pick the Dota window
          </>,
          <>Play. This phone follows the draft</>,
        ].map((step, i) => (
          <li key={i} className="flex items-center gap-4 rounded-lg bg-raised p-4">
            <span className="num flex size-8 shrink-0 items-center justify-center rounded-lg bg-bg font-semibold text-accent">
              {i + 1}
            </span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-hover px-4 py-3 text-sm text-muted">
        <span aria-hidden className="live-dot text-subtle" />
        Waiting for your PC
        <span className="ml-auto text-subtle">Same Steam Account</span>
      </div>
    </section>
  );
}

/** On the PC, next to Watch Dota: a phone signed in to this account has the draft open. */
export function PhoneFollowingChip() {
  return (
    <span className="flex h-8 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium">
      <span className="flex text-accent">
        <Icon name="smartphone" />
      </span>
      Phone Following
    </span>
  );
}
