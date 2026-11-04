"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import {
  MoveMark,
  OutsidePool,
  PickWhy,
  WeakHere,
} from "@/components/pick-why";
import { POSITION_NAMES } from "@/lib/party";
import type { PlayerColumn } from "@/lib/per-player";
import { useRankMoves } from "@/lib/pick-explain";
import type { Position } from "@/lib/engine/types";

/**
 * Per Player: the planner's view of what each party member who still has to pick should take.
 * One column per player, as wide as the panel allows: a single player gets the whole width, and players sit side
 * by side only when each column still has room. The top hero gets its full reasons and buttons, the rest are
 * hairline rows like My Picks, with their buttons shown on hover or focus.
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
  if (!columns.length)
    return (
      <p className="text-sm text-muted">Everyone in the party has a hero.</p>
    );
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-x-8 gap-y-8">
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
      <h3
        id={headingId}
        className="flex items-baseline gap-2 pb-2 font-semibold text-fg"
      >
        <span className="truncate">{name}</span>{" "}
        <span className="num text-sm font-normal text-subtle">
          Pos {c.position} {POSITION_NAMES[c.position]}
        </span>
      </h3>
      <ol aria-label={`Suggested heroes for ${name}`} className="flex flex-col">
        {c.suggestions.map((s, i) => {
          const top = i === 0;
          return (
            <li
              key={s.heroId}
              className="group relative grid grid-cols-[4rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-t border-line py-3"
            >
              {portrait(s.heroId, s.name)}
              <div className="flex min-w-0 flex-col gap-1">
                <span
                  className={`flex flex-wrap items-center gap-2 font-semibold ${top ? "text-accent" : "text-fg"}`}
                >
                  {s.name}
                  <MoveMark move={moves.get(s.heroId)} />
                  {c.outside.has(s.heroId) && (
                    <OutsidePool
                      title={`Not one of ${name}'s heroes for this position`}
                    />
                  )}
                  {c.weak.has(s.heroId) && <WeakHere />}
                </span>
                {top ? (
                  <PickWhy suggestion={s} className="text-sm text-fg/90" />
                ) : (
                  s.reasons[0] && (
                    <p className="text-sm text-muted">{s.reasons[0]}</p>
                  )
                )}
              </div>
              <span
                className="num w-12 text-right text-sm text-fg"
                title="Score in win-rate points"
              >
                {s.score >= 0 ? "+" : ""}
                {s.score.toFixed(1)}
              </span>
              <span
                className={
                  top
                    ? "col-span-2 col-start-2 flex gap-1.5"
                    : // On a mouse the buttons float over the reason on hover or keyboard focus, so they take no room;
                      // on touch they always show under it.
                      "col-span-2 col-start-2 flex gap-1.5 [@media(hover:hover)]:absolute [@media(hover:hover)]:right-14 [@media(hover:hover)]:top-1/2 [@media(hover:hover)]:-translate-y-1/2 [@media(hover:hover)]:bg-bg [@media(hover:hover)]:pl-4 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
                }
              >
                <button
                  onClick={() => onPicked(s.heroId, c.position)}
                  aria-label={`Picked ${s.name} for ${name}`}
                  className={`btn btn-sm ${top ? "btn-primary" : "btn-secondary"}`}
                >
                  <Icon name="check" />
                  Picked
                </button>
                <button
                  onClick={() => onBanned(s.heroId)}
                  aria-label={`Banned ${s.name}`}
                  className={`btn btn-sm ${top ? "btn-secondary" : "btn-ghost"}`}
                >
                  <Icon name="ban" />
                  Banned
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
