"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { PickWhy } from "@/components/pick-why";
import type { Suggestion } from "@/lib/engine/types";

/**
 * Ranks 2 to 8. Closed, a row is the hero, its main reason and the score, with nothing on top of it. Opening the row
 * shows every reason and gives Picked and Banned a line of their own under them, so actions never cover text.
 */
export function SuggestionRow({
  suggestion: s,
  portrait,
  rank,
  scoreText,
  badges,
  gainText,
  counters,
  onPicked,
  onBanned,
}: {
  suggestion: Suggestion;
  portrait: ReactNode;
  /** The place in the list; null for a row shown outside it. */
  rank: number | null;
  /** The score with its sign, such as "+10.6". */
  scoreText: string;
  badges: ReactNode;
  gainText: ReactNode;
  counters: ReactNode[];
  onPicked?: () => void;
  onBanned?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <li className={`border-t border-line ${open ? "bg-surface" : ""}`}>
      {rank === 2 && <span className="block bg-bg px-2 pb-1 pt-3 text-sm text-subtle">Also Strong</span>}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[1.25rem_4rem_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-3 text-left hover:bg-hover"
      >
        <span className="num text-subtle">{rank ?? ""}</span>
        {portrait}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-fg">
            {s.name}
            {badges}
          </span>
          {!open && s.reasons[0] && <span className="truncate text-sm text-subtle">{s.reasons[0]}</span>}
        </span>
        <span className="flex items-center gap-2">
          {gainText}
          <span className="num w-12 text-right text-fg" title="Score in win-rate points">
            {scoreText}
          </span>
          <span className={`inline-flex text-subtle transition-transform ${open ? "rotate-180" : ""}`}>
            <Icon name="chevronDown" />
          </span>
        </span>
      </button>
      {counters.length > 0 && <div className="flex flex-col gap-2 px-2 pb-3 sm:pl-[7.25rem]">{counters}</div>}
      {/* The panel stays in the page for aria-controls; its content mounts only while open. */}
      <div id={panelId} hidden={!open} className="px-2 pb-4 pt-3 sm:pl-[7.25rem]">
        {open && (
          <>
            <PickWhy suggestion={s} className="text-sm text-fg/85" />
            {onPicked && onBanned && (
              <div className="mt-3 flex gap-2">
                <button onClick={onPicked} aria-label={`Picked ${s.name}`} className="btn btn-secondary btn-sm">
                  <Icon name="check" />
                  Picked
                </button>
                <button onClick={onBanned} aria-label={`Banned ${s.name}`} className="btn btn-ghost btn-sm">
                  <Icon name="ban" />
                  Banned
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
