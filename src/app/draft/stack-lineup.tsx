"use client";

import type { Position } from "@/lib/engine/types";
import { SOLO_QUEUE } from "@/lib/solo-queue";
import { LINEUP_MAX, type LineupEntry, type LineupPerson } from "@/lib/stack-lineup";
import { PositionPicker } from "./position-picker";
import type { PlannableStack } from "./use-stack-lineup";

/**
 * Plan For: pick a Stack you run, tick who plays this game (up to five, online or not) and where.
 * "Just Me" keeps the plain solo draft. "Solo Queue" adds picks for the teammates you get, as if
 * they can play any hero (`stackId` is SOLO_QUEUE then).
 */
export function StackLineup({
  stacks,
  stackId,
  people,
  picks,
  notice,
  onChoose,
  onToggle,
  onMove,
}: {
  stacks: PlannableStack[];
  stackId: string;
  people: LineupPerson[] | null;
  picks: LineupEntry[];
  notice: string | null;
  onChoose: (id: string) => void;
  onToggle: (person: LineupPerson) => void;
  onMove: (id: string, position: Position) => void;
}) {
  const full = picks.length >= LINEUP_MAX;
  const isSoloQueue = stackId === SOLO_QUEUE;
  const isStack = Boolean(stackId) && !isSoloQueue;
  return (
    <section aria-label="Plan For" className="flex flex-col gap-3 border-b border-line pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="plan-for" className="label-caps">
          Plan For
        </label>
        <select id="plan-for" value={stackId} onChange={(e) => onChoose(e.target.value)} className="field btn-sm w-auto">
          <option value="">Just Me</option>
          <option value={SOLO_QUEUE}>Solo Queue</option>
          {stacks.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {isSoloQueue && (
          <span className="text-sm text-muted">Picks for every teammate too, ranked on this draft as if they can play any hero.</span>
        )}
        {isStack && (
          <span className="text-sm text-muted">
            Tick who plays this game, online or not. <span className="num">{picks.length}</span> of {LINEUP_MAX}.
          </span>
        )}
      </div>
      {notice && (
        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      )}
      {isStack && !people && !notice && <p className="text-sm text-muted">Loading the Stack…</p>}
      {isStack && people && (
        <ul aria-label="Playing This Game" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => {
            const pick = picks.find((e) => e.id === p.id);
            return (
              <li key={p.id} className={`flex flex-wrap items-center gap-3 rounded-md px-3 py-2 ring-1 ring-inset ${pick ? "ring-line-strong" : "ring-line"}`}>
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(pick)}
                    disabled={!p.canPlay || (!pick && full)}
                    onChange={() => onToggle(p)}
                  />
                  <span className="truncate font-medium text-fg">{p.name}</span>
                </label>
                {!p.canPlay && <span className="text-xs text-subtle">Not shared with Managers</span>}
                {pick && <PositionPicker heroName={p.name} position={pick.position} isGuess={false} onChange={(pos) => pos && onMove(p.id, pos)} />}
              </li>
            );
          })}
        </ul>
      )}
      {isStack && people && people.length < 2 && (
        <p className="text-sm text-muted">Nobody else is in this Stack yet. Invite people from its Stack page.</p>
      )}
    </section>
  );
}
