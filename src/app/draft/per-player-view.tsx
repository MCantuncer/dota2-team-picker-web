"use client";

import type { ReactNode } from "react";
import { PositionIcon } from "@/components/position-icon";
import type { PickFirst, PlannedSlot } from "@/lib/engine/plan";
import type { Position } from "@/lib/engine/types";
import { verdicts } from "@/lib/engine/verdict";
import { POSITION_NAMES } from "@/lib/party";
import type { PlayerColumn } from "@/lib/per-player";
import { outsiderText, useRankMoves } from "@/lib/pick-explain";
import type { NamedHero } from "@/lib/pick-lines";
import { ForkNode, LaneGutter, OUTSIDER_NODE, PICK_NODE, PickCard, type PickCtx } from "./my-picks";
import { Face, HeadMark, minus, Stop, type PlanHeroOf } from "./team-plan";

/*
 * Per Player as the Lane Board's mid lane, full width: the lane starts at the mark beside the view tabs, then one
 * section per player who still has to pick. Each section starts at its seat (a stop with the position icon) and the
 * player's heroes follow as the same cards as My Picks, two to a row from 1024px, one stop per row. Copper only on
 * the card that is the Team Plan's Pick First.
 */

interface PerPlayerLaneProps {
  /** The head of the lane, beside its mark: the view tabs. */
  head: ReactNode;
  columns: PlayerColumn[];
  /** Display names by player id. */
  names: Record<string, string>;
  /** The reader's player id, whose seat shows the green You pill. */
  myId: string | null;
  /** The Team Plan's heroes per seat and its Pick First, when there is a plan. */
  plan: { slots: PlannedSlot[]; pickFirst: PickFirst | null } | null;
  /** Changes with every pick or ban, so each list can mark heroes that moved. */
  draftKey: string;
  hero: PlanHeroOf;
  /** Every hero, to find the heroes a reason names. */
  heroes: readonly NamedHero[];
  /** Enemy picks, whose faces get the Dire edge. */
  enemies: readonly number[];
  /** Games a player has on a hero from outside their pool, for its Outside Pool chip. */
  gamesOf?: (playerId: string, heroId: number) => number | null;
  /** Change in the team's win chance in points for a pick, when a checked model gives one. */
  gainOf?: (heroId: number) => number | null;
  /** Left out when the player can't change the draft. */
  onPicked?: (heroId: number, position: Position) => void;
  onBanned?: (heroId: number) => void;
}

/** Per Player: the lane's head, then one section per player who still has to pick. */
export function PerPlayerLane({
  head,
  columns,
  names,
  myId,
  plan,
  draftKey,
  hero,
  heroes,
  enemies,
  gamesOf,
  gainOf,
  onPicked,
  onBanned,
}: PerPlayerLaneProps) {
  const enemySet = new Set(enemies);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Stop isFirst node={<HeadMark />} nodeClass="top-[1.1875rem]">
        <div className="flex min-h-[2.375rem] min-w-0 items-center">{head}</div>
      </Stop>
      {columns.length ? (
        <div className="flex min-w-0 flex-col gap-6">
          {columns.map((c, i) => (
            <PlayerSection
              key={`${c.playerId}:${c.position}`}
              column={c}
              name={names[c.playerId] ?? "Unnamed"}
              isMine={myId !== null && c.playerId === myId}
              isLast={i === columns.length - 1}
              planned={plan?.slots.find((s) => s.position === c.position)}
              pickFirst={plan?.pickFirst?.position === c.position ? plan.pickFirst : null}
              draftKey={draftKey}
              ctx={{ hero, heroes, enemies: enemySet, position: c.position }}
              gamesOf={gamesOf}
              gainOf={gainOf}
              onPicked={onPicked}
              onBanned={onBanned}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 md:grid-cols-[1.75rem_minmax(0,1fr)] md:gap-x-3">
          <span className="relative" aria-hidden>
            <span className="lane-spine -top-4 h-10" />
            <span className="absolute top-6 left-1/2 flex -translate-x-1/2 -translate-y-1/2">
              <span className="lane-node lane-node-done" />
            </span>
          </span>
          <p className="rounded-xl bg-surface px-5 py-3.5 text-sm text-muted ring-1 ring-line ring-inset">
            Everyone in the party has a hero.
          </p>
        </div>
      )}
    </div>
  );
}

/** A seat's stop on the lane: the position icon in a small Lane frame. */
function SeatNode({ position }: { position: Position }) {
  return (
    <span className="flex size-[1.375rem] items-center justify-center rounded-md bg-bg text-fg ring-2 ring-(--lane-line) ring-inset">
      <PositionIcon position={position} size={14} />
    </span>
  );
}

/**
 * One player's stretch of the lane: the seat as on the Team Plan (position icon, Pos and role, the name or the green
 * You pill, the plan's hero for the seat), then their heroes as cards, and the hero from outside their pool in the
 * next free cell when the data proves one.
 */
function PlayerSection({
  column: c,
  name,
  isMine,
  isLast,
  planned,
  pickFirst,
  draftKey,
  ctx: base,
  gamesOf,
  gainOf,
  onPicked,
  onBanned,
}: {
  column: PlayerColumn;
  name: string;
  isMine: boolean;
  /** The last section ends the lane. */
  isLast: boolean;
  /** The Team Plan's hero for this seat. */
  planned?: PlannedSlot;
  /** The plan's Pick First, when it is this seat's. */
  pickFirst: PickFirst | null;
  draftKey: string;
  ctx: Omit<PickCtx, "owner" | "onPicked" | "onBanned">;
  gamesOf?: (playerId: string, heroId: number) => number | null;
  gainOf?: (heroId: number) => number | null;
  onPicked?: (heroId: number, position: Position) => void;
  onBanned?: (heroId: number) => void;
}) {
  const list = c.suggestions;
  const moves = useRankMoves(
    list.map((s) => s.heroId),
    draftKey,
    `${c.playerId}:${c.position}`,
  );
  const owner = isMine ? undefined : name;
  const ctx: PickCtx = {
    ...base,
    owner,
    onPicked: onPicked && ((heroId) => onPicked(heroId, c.position)),
    onBanned,
  };
  const heroName = (id: number) => base.heroes.find((h) => h.id === id)?.name ?? "";
  // Each hero against the list's first, in this player's name.
  const verdictOf = new Map(verdicts(list, heroName, c.position, owner).map((v) => [v.heroId, v]));
  const leader = list[0]?.name;
  const isNow = (id: number) => pickFirst?.heroId === id;
  const now = pickFirst && { title: minus(`${pickFirst.reason.lead} ${pickFirst.reason.text}`) };
  // The cell that ends the lane: the last card (or the outsider) of the last section; the others run on.
  const last = isLast ? list.length - (c.outsider ? 0 : 1) : Number.MAX_SAFE_INTEGER;
  const headingId = `per-player-${c.playerId}`;
  const role = POSITION_NAMES[c.position];
  const own = list.length - c.played.size;

  // A card's node: copper on Pick First, filled for the player's first, open after. From 1024px a row has one stop,
  // so the first of a row turns copper there when its neighbour is Pick First.
  const nodeOf = (i: number) => {
    const id = list[i]!.heroId;
    const kind = isNow(id) ? "now" : i === 0 ? "done" : "open";
    const pairNow = i % 2 === 0 && list[i + 1] !== undefined && isNow(list[i + 1]!.heroId) && kind !== "now";
    if (!pairNow) return <span className={`lane-node lane-node-${kind}`} />;
    return (
      <>
        <span className={`lane-node lane-node-${kind} lg:hidden`} />
        <span className="lane-node lane-node-now max-lg:hidden" />
      </>
    );
  };

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
      <Stop node={<SeatNode position={c.position} />} nodeClass="top-7">
        <div className="flex min-h-14 min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-surface px-5 py-3 ring-1 ring-line ring-inset">
          <h3
            id={headingId}
            aria-label={`${isMine ? "You" : name}, Pos ${c.position} ${role}`}
            className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2"
          >
            <span className="flex items-center gap-1.5 text-subtle">
              <PositionIcon position={c.position} size={16} />
              <span className="text-sm font-medium text-muted">
                Pos {c.position} {role}
              </span>
            </span>
            {isMine ? (
              <span className="micro rounded-full bg-radiant px-2 leading-5 font-semibold text-bg">You</span>
            ) : (
              <span className="text-base font-semibold break-words text-fg">{name}</span>
            )}
          </h3>
          {c.fromAll ? (
            <span
              className="chip micro h-auto min-h-6 shrink-0 px-2 py-1"
              title={
                c.fromAll === "none"
                  ? `${isMine ? "You have" : `${name} has`} no heroes for this position, so these are the best of every hero`
                  : `All of ${isMine ? "your" : `${name}'s`} heroes for this position are taken, so these are the best of every hero`
              }
            >
              Any Hero
            </span>
          ) : (
            list.length > 0 && (
              <span className="micro text-subtle tabular-nums">
                {own} of {isMine ? "Your" : `${name}'s`} Heroes{c.played.size > 0 && ` and ${c.played.size} Played`}
              </span>
            )
          )}
          {planned && (
            <span className="micro flex shrink-0 items-center gap-2 text-subtle sm:ml-auto" title="The Team Plan's hero for this seat">
              Team Plan{" "}
              <span className="flex items-center gap-2">
                <Face id={planned.heroId} hero={base.hero} size={20} isEnemy={false} />
                <span className="font-medium text-fg">{planned.name}</span>
              </span>
            </span>
          )}
        </div>
      </Stop>
      <div className="grid gap-4 pl-7 md:pl-10 lg:grid-cols-2">
        <ol aria-label={`Suggested heroes for ${name}`} className="contents">
          {list.map((s, i) => (
            <li key={s.heroId} className={`relative min-w-0 ${PICK_NODE}`}>
              <LaneGutter cell={i} last={last} isWideFirst={false} node={nodeOf(i)} />
              <PickCard
                entry={{
                  suggestion: s,
                  move: moves.get(s.heroId),
                  isWeak: c.weak.has(s.heroId),
                  verdict: verdictOf.get(s.heroId),
                  playedGames: c.played.has(s.heroId) ? (gamesOf?.(c.playerId, s.heroId) ?? null) : null,
                  gain: gainOf?.(s.heroId) ?? null,
                }}
                rank={i + 1}
                leader={leader}
                ctx={ctx}
                now={isNow(s.heroId) ? now : null}
                isInPlan={planned?.heroId === s.heroId}
              />
            </li>
          ))}
        </ol>
        {c.outsider && (
          <ol aria-label={`Hero from outside ${isMine ? "your" : `${name}'s`} pool`} className="contents">
            <li className={`relative min-w-0 ${OUTSIDER_NODE}`}>
              <LaneGutter cell={list.length} last={last} isWideFirst={false} node={<ForkNode />} />
              <PickCard
                entry={{ suggestion: c.outsider.pick, gain: gainOf?.(c.outsider.pick.heroId) ?? null }}
                rank={null}
                ctx={ctx}
                outsiderText={outsiderText(c.outsider, owner)}
                isInPlan={planned?.heroId === c.outsider.pick.heroId}
              />
            </li>
          </ol>
        )}
      </div>
    </section>
  );
}
