"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { MoveMark, OutsidePool, PickWhy, WeakHere } from "@/components/pick-why";
import { POSITION_NAMES } from "@/lib/party";
import type { PlayerColumn } from "@/lib/per-player";
import { useRankMoves } from "@/lib/pick-explain";
import type { Position } from "@/lib/engine/types";

/**
 * Per Player: the planner's view of what each party member who still has to pick should take.
 * One column per player; the top hero gets its full reasons, the rest one line each.
 */
export function PerPlayerView({
  columns,
  names,
  draftKey,
  portrait,
  onPicked,
  onBanned,
}: {
  columns: PlayerColumn[];
  names: Record<string, string>;
  /** Changes with every pick or ban, so each column can mark heroes that moved. */
  draftKey: string;
  portrait: (heroId: number, name: string) => ReactNode;
  onPicked: (heroId: number, position: Position) => void;
  onBanned: (heroId: number) => void;
}) {
  if (!columns.length) return <p className="text-sm text-muted">Everyone in the party has a hero.</p>;
  return (
    <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
      {columns.map((c) => (
        <Column
          key={`${c.playerId}:${c.position}`}
          column={c}
          name={names[c.playerId] ?? "Unnamed"}
          draftKey={draftKey}
          portrait={portrait}
          onPicked={onPicked}
          onBanned={onBanned}
        />
      ))}
    </div>
  );
}

function Column({
  column: c,
  name,
  draftKey,
  portrait,
  onPicked,
  onBanned,
}: {
  column: PlayerColumn;
  name: string;
  draftKey: string;
  portrait: (heroId: number, name: string) => ReactNode;
  onPicked: (heroId: number, position: Position) => void;
  onBanned: (heroId: number) => void;
}) {
  const moves = useRankMoves(
    c.suggestions.map((s) => s.heroId),
    draftKey,
    `${c.playerId}:${c.position}`,
  );
  const headingId = `per-player-${c.playerId}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col">
      <h3 id={headingId} className="flex items-baseline gap-2 pb-2 font-semibold text-fg">
        <span className="truncate">{name}</span>{" "}
        <span className="num text-sm font-normal text-subtle">
          Pos {c.position} {POSITION_NAMES[c.position]}
        </span>
      </h3>
      <ol aria-label={`Suggested heroes for ${name}`} className="flex flex-col">
        {c.suggestions.map((s, i) => (
          <li key={s.heroId} className="flex gap-3 border-t border-line py-3">
            <div className="shrink-0">{portrait(s.heroId, s.name)}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`flex flex-wrap items-center gap-2 font-semibold ${i === 0 ? "text-accent" : "text-fg"}`}>
                  {s.name}
                  <MoveMark move={moves.get(s.heroId)} />
                  {c.outside.has(s.heroId) && <OutsidePool title={`Not one of ${name}'s heroes for this position`} />}
                  {c.weak.has(s.heroId) && <WeakHere />}
                </span>
                <span className="num text-xs text-subtle" title="Score in win-rate points">
                  {s.score >= 0 ? "+" : ""}
                  {s.score.toFixed(1)}
                </span>
              </div>
              {i === 0 ? (
                <PickWhy suggestion={s} className="text-sm text-fg/90" />
              ) : (
                s.reasons[0] && <p className="text-sm text-muted">{s.reasons[0]}</p>
              )}
              <div className="flex gap-1.5 pt-0.5">
                <button
                  onClick={() => onPicked(s.heroId, c.position)}
                  aria-label={`Picked ${s.name} for ${name}`}
                  className={`btn btn-sm ${i === 0 ? "btn-primary" : "btn-secondary"}`}
                >
                  <Icon name="check" />
                  Picked
                </button>
                <button onClick={() => onBanned(s.heroId)} aria-label={`Banned ${s.name}`} className="btn btn-secondary btn-sm">
                  <Icon name="ban" />
                  Banned
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
