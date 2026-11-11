"use client";

import type { ReactNode } from "react";
import { HeroArt, HeroStage, LaneMark, type HeroArtPlacement } from "@/components/hero-frame";
import { Icon, type IconName } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/draft";
import { ordinal } from "@/lib/engine/reasons";
import type { Position, Suggestion } from "@/lib/engine/types";
import { VERDICT_Z, type Verdict } from "@/lib/engine/verdict";
import {
  namedHeroes,
  reasonLines,
  scoreParts,
  scoreSplit,
  verdictLine,
  type NamedHero,
  type PickLineKind,
} from "@/lib/pick-lines";
import { Face, FacedText, HeadMark, ReasonLine, Stop, type PlanHeroOf } from "./team-plan";

/*
 * My Picks as the Lane Board's mid lane, full width: the lane starts at the mark beside the view tabs, the Best pick
 * is the copper stop across the lane, the other picks follow as equal cards two to a row (one on a phone), with the
 * hero from outside the pool and the Score Ladder in the next free cells.
 */

/** A suggested hero with what the board knows about it. */
export interface PickEntry {
  suggestion: Suggestion;
  /** "New" or "Up 2" since the last pick or ban. */
  move?: string;
  /** One of the player's heroes, but weak in this draft. */
  isWeak?: boolean;
  /** Where the hero stands against the list's first, and why; none for the hero from outside the pool. */
  verdict?: Verdict;
  /** Games the player has on a listed hero from outside their pool; null or left out for a pool hero. */
  playedGames?: number | null;
  /** Change in the team's win chance in points, when a checked model gives one. */
  gain: number | null;
}

/** Every pick card puts the render's face on the same spot at the same scale. */
const PICK_ART: HeroArtPlacement = { width: 350, at: [0.5, 0.4] };
/** The Best pick's larger frame. */
const BEST_ART: HeroArtPlacement = { width: 360, at: [0.5, 0.36] };

/** Where a card's lane node sits: level with the centre of its art (the padding plus half the frame). */
export const PICK_NODE = "[--node:6.25rem] sm:[--node:5.25rem]";
const BEST_NODE = "[--node:6.75rem] md:[--node:8rem]";
/** The outside hero's node sits level with its fork head. */
export const OUTSIDER_NODE = "[--node:2.125rem] sm:[--node:2.375rem]";

const ROLES: Record<Position, string> = { 1: "Carries", 2: "Mids", 3: "Offlaners", 4: "Soft Supports", 5: "Hard Supports" };

const LINE_ICONS: Record<PickLineKind, IconName> = {
  counter: "swords",
  synergy: "users",
  need: "plus",
  safety: "shield",
  flex: "shuffle",
  phase: "clock",
  winRate: "trend",
  comfort: "heart",
  risk: "alert",
  safe: "check",
  other: "check",
};

/** A signed score with one decimal and a real minus sign. */
const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}`;

/** Chips get 4px of air above and below their text. */
const CHIP = "chip micro h-auto min-h-6 shrink-0 gap-1.5 px-2 py-1";
/** The copper chip: only on the hero to lock now (the Best pick, or the Team Plan's Pick First). */
const BEST_CHIP = "chip chip-accent micro h-auto min-h-6 shrink-0 gap-1.5 px-2 py-1";

/** What every card on a lane shares. */
export interface PickCtx {
  hero: PlanHeroOf;
  heroes: readonly NamedHero[];
  enemies: ReadonlySet<number>;
  position: Position;
  /** Whose list it is, when it is not the reader's: their name goes in the reasons, titles and button labels. */
  owner?: string;
  onPicked?: (heroId: number) => void;
  onBanned?: (heroId: number) => void;
}

interface MyPicksLaneProps {
  /** The head of the lane, beside its mark: the view tabs, or the picks title. */
  head: ReactNode;
  /** Shown under the head, before the picks: Did You Pick, the empty pool notice. */
  notices?: ReactNode[];
  /** The list, best first. */
  picks: PickEntry[];
  /** The hero from outside the pool that beats the list, with the engine's line on it. */
  outsider?: { entry: PickEntry; text: string } | null;
  /** The engine's "Reacting to ..." line, the Best card's footer. */
  reacting: string;
  position: Position;
  hero: PlanHeroOf;
  /** Every hero, to find the heroes a reason names. */
  heroes: readonly NamedHero[];
  /** Enemy picks, whose faces get the Dire edge. */
  enemies: readonly number[];
  /** Left out when the player can't change the draft. */
  onPicked?: (heroId: number) => void;
  onBanned?: (heroId: number) => void;
}

/** My Picks: the lane's head, any notices, then the picks as cards on the lane. */
export function MyPicksLane({
  head,
  notices = [],
  picks,
  outsider = null,
  reacting,
  position,
  hero,
  heroes,
  enemies,
  onPicked,
  onBanned,
}: MyPicksLaneProps) {
  const ctx: PickCtx = { hero, heroes, enemies: new Set(enemies), position, onPicked, onBanned };
  const leader = picks[0]?.suggestion.name;
  // Cells after the Best card, as the grid fills them: the picks, then the outsider. The last one ends the lane.
  const last = picks.length - (outsider ? 0 : 1);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Stop isFirst node={<HeadMark />} nodeClass="top-[1.1875rem]">
        <div className="flex min-h-[2.375rem] min-w-0 items-center">{head}</div>
      </Stop>
      {notices.length > 0 && (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 md:grid-cols-[1.75rem_minmax(0,1fr)] md:gap-x-3">
          <span className="relative" aria-hidden>
            <span className="lane-spine -top-4 -bottom-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-4">{notices}</div>
        </div>
      )}
      <div className="grid gap-4 pl-7 md:pl-10 lg:grid-cols-2">
        <ol aria-label="Suggested heroes" className="contents">
          {picks.map((entry, i) => (
            <li
              key={entry.suggestion.heroId}
              className={`relative min-w-0 ${i === 0 ? `lg:col-span-2 ${BEST_NODE}` : PICK_NODE}`}
            >
              <LaneGutter cell={i} last={last} node={<span className={`lane-node ${i === 0 ? "lane-node-now" : "lane-node-open"}`} />} />
              {i === 0 ? (
                <BestCard entry={entry} reacting={reacting} ctx={ctx} />
              ) : (
                <PickCard entry={entry} rank={i + 1} leader={leader} ctx={ctx} />
              )}
            </li>
          ))}
        </ol>
        {outsider && (
          <ol aria-label="Hero from outside your pool" className="contents">
            <li className={`relative min-w-0 ${OUTSIDER_NODE}`}>
              <LaneGutter cell={picks.length} last={last} node={<ForkNode />} />
              <PickCard entry={outsider.entry} rank={null} ctx={ctx} outsiderText={outsider.text} />
            </li>
          </ol>
        )}
        {picks.length > 1 && <ScoreLadder list={picks.map((p) => p.suggestion)} hero={hero} />}
      </div>
    </div>
  );
}

/**
 * The lane beside one card: its stretch of the line and its node, in the gutter left of the grid. On a phone every
 * card is a stop; from 1024px the cards go two to a row and only the first of each row is.
 */
export function LaneGutter({
  cell,
  last,
  node,
  isWideFirst = true,
}: {
  cell: number;
  /** The cell that ends the lane; past the last cell when the lane runs on. */
  last: number;
  node: ReactNode;
  /** The first cell spans the row (the Best card), so the pairs start at cell 1. */
  isWideFirst?: boolean;
}) {
  const rowStart = (c: number) => (isWideFirst ? (c === 0 || (c - 1) % 2 === 0 ? c : c - 1) : c - (c % 2));
  const startsRow = rowStart(cell) === cell;
  const lastRowStart = rowStart(last);
  const isLast = cell === last;
  const isLastWide = startsRow && cell === lastRowStart && !isLast;
  return (
    <span aria-hidden className={`absolute inset-y-0 -left-7 w-5 md:-left-10 md:w-7 ${startsRow ? "" : "lg:hidden"}`}>
      <span
        className={`lane-spine -top-4 ${isLast ? "h-[calc(var(--node)+1rem)]" : "-bottom-4"} ${isLastWide ? "lg:bottom-auto lg:h-[calc(var(--node)+1rem)]" : ""}`}
      />
      <span className="absolute top-(--node) left-1/2 flex -translate-x-1/2 -translate-y-1/2">{node}</span>
    </span>
  );
}

/** The outside hero's node: an open ring, dashed, since the hero is not in the pool. */
export function ForkNode() {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
      <circle cx="7" cy="7" r="6" fill="var(--bg)" stroke="var(--lane-line)" strokeWidth="2" strokeDasharray="2.5 2" />
    </svg>
  );
}

/** In Team Plan, Up 1, New, Weak Here, Outside Pool: neutral chips with an icon; amber only for a risk. Never copper. */
export function PickChips({
  move,
  isWeak,
  outside,
  isInPlan,
  owner,
}: {
  move?: string;
  isWeak?: boolean;
  outside?: { title: string } | null;
  /** The hero the Team Plan chose for this seat. */
  isInPlan?: boolean;
  owner?: string;
}) {
  return (
    <>
      {isInPlan && (
        <span className={`${CHIP} text-fg`} title="The hero the Team Plan chose for this seat">
          <LaneMark className="text-fg" />
          In Team Plan
        </span>
      )}
      {move && (
        <span className={`${CHIP} text-fg`} title="Since the last pick or ban">
          {move.startsWith("Up") && (
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path
                d="M6 10V2.5M2.75 5.5 6 2.25 9.25 5.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {move}
        </span>
      )}
      {isWeak && (
        <span
          className={`${CHIP} text-warn`}
          title={`One of ${owner ? `${owner}'s` : "your"} heroes, but weak into this draft: a score below 0, a hard counter on the enemy team, or a matchup of −1.5 or worse`}
        >
          <Icon name="alert" />
          Weak Here
        </span>
      )}
      {outside && (
        <span className={CHIP} title={outside.title}>
          Outside Pool
        </span>
      )}
    </>
  );
}

/**
 * Picked and an icon Banned. Picked is copper only on the hero to lock now: the Best pick (full size) or the Team
 * Plan's Pick First. In another player's list the label says whose pick it is.
 */
function PickActions({ s, isBest, isNow = false, ctx }: { s: Suggestion; isBest: boolean; isNow?: boolean; ctx: PickCtx }) {
  const { onPicked, onBanned, owner } = ctx;
  if (!onPicked || !onBanned) return null;
  const isCopper = isBest || isNow;
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPicked(s.heroId)}
        aria-label={`Picked ${s.name}${owner ? ` for ${owner}` : ""}`}
        className={`btn ${isBest ? "btn-primary" : `${isNow ? "btn-primary" : "btn-secondary"} btn-sm w-[6.25rem]`}`}
      >
        <span className={`flex ${isCopper ? "" : "text-radiant"}`}>
          <Icon name="check" />
        </span>
        Picked
      </button>
      <button
        type="button"
        onClick={() => onBanned(s.heroId)}
        aria-label={`Banned ${s.name}`}
        title="Banned"
        className={`btn btn-secondary btn-icon ${isBest ? "" : "btn-sm"}`}
      >
        <Icon name="ban" />
      </button>
    </span>
  );
}

/** The score, its place among every hero for the position, and the change in win chance when a checked model gives one. */
function Score({ s, gain, position, isLarge }: { s: Suggestion; gain: number | null; position: Position; isLarge?: boolean }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        className={`font-semibold tracking-tight text-fg tabular-nums ${isLarge ? "text-[2rem] leading-9" : "text-[1.625rem] leading-8"}`}
        title="Score in win-rate points"
      >
        {signed(s.score)}
      </span>
      {s.place.rank > 0 && (
        <span className="micro text-subtle">
          {ordinal(s.place.rank)} of {s.place.of} {ROLES[position]}
        </span>
      )}
      {gain !== null && (
        <span className="micro text-subtle" title="Change in your team's win chance">
          <span className={`num ${gain < 0 ? "text-dire" : "text-radiant"}`}>{signed(gain)}%</span> win chance
        </span>
      )}
    </span>
  );
}

/** The verdict against the list's first, number first, then the player's record note when there is one. */
function VerdictBlock({ verdict, leader, ctx, isQuiet }: { verdict: Verdict; leader?: string; ctx: PickCtx; isQuiet?: boolean }) {
  const line = verdictLine(verdict, leader, ctx.heroes);
  return (
    <div className="flex flex-col gap-1">
      <p className={isQuiet ? "text-sm leading-6 text-muted" : "text-[0.9375rem] leading-6 text-fg"}>
        {line.lead && <span className="font-semibold text-fg tabular-nums">{line.lead}</span>}{" "}
        <FacedText text={line.text} heroes={line.heroes} hero={ctx.hero} enemies={ctx.enemies} />
      </p>
      {verdict.note && <p className="text-sm leading-6 text-radiant">{verdict.note}</p>}
    </div>
  );
}

/** Why This Hero: every reason, tag and hard counter, one line each, risks last. */
function WhyLines({ s, ctx }: { s: Suggestion; ctx: PickCtx }) {
  const lines = reasonLines(s, ctx.heroes, ctx.owner);
  if (!lines.length) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <h4 className="micro text-subtle">Why This Hero</h4>
      <ul className="flex flex-col gap-2.5">
        {lines.map((l, i) => (
          <ReasonLine
            key={i}
            icon={LINE_ICONS[l.kind]}
            lead={l.lead}
            text={l.text}
            heroes={l.heroes}
            isWarn={l.isWarn}
            hero={ctx.hero}
            enemies={ctx.enemies}
          />
        ))}
      </ul>
    </div>
  );
}

/** The score's parts as centred bars: a positive part grows right in green, a negative one left in Dire red. */
export function ScoreParts({ s, className = "grid gap-y-2" }: { s: Suggestion; className?: string }) {
  const parts = scoreParts(s.breakdown);
  const max = Math.max(...parts.map((p) => Math.abs(p.value)), 0.1);
  return (
    <ul className={className}>
      {parts.map((p) => (
        <li key={p.key} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-2.5">
          <span className="micro text-muted">{p.name}</span>
          <span className="relative h-1.5 rounded-xs bg-raised" aria-hidden>
            <span className="absolute -top-0.5 -bottom-0.5 left-1/2 w-px bg-line-control" />
            <span
              className={`absolute inset-y-0 rounded-xs ${p.value >= 0 ? "left-1/2 bg-radiant" : "right-1/2 bg-dire"}`}
              style={{ width: `${(Math.abs(p.value) / max) * 50}%` }}
            />
          </span>
          <span className={`micro text-right font-semibold tabular-nums ${p.value >= 0 ? "text-fg" : "text-dire"}`}>
            {signed(p.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The art frame of a pick card: across the card on a phone, 13rem wide beside the name from 640px. */
function PickFrame({ id, ctx }: { id: number; ctx: PickCtx }) {
  const { portrait } = ctx.hero(id);
  return (
    <HeroStage key={id} size={120} className="h-40 w-full shrink-0 sm:h-30 sm:w-52">
      {portrait && <HeroArt heroId={id} portrait={portrait} placement={PICK_ART} />}
    </HeroStage>
  );
}

/** The Outside Pool chip on a hero the player has played but not saved for this position. */
function playedChip(games: number | null | undefined, owner?: string): { title: string } | null {
  if (games == null) return null;
  return {
    title: owner
      ? `${owner} played it ${games} times in six months (all positions), but it is not in their heroes for this position`
      : `You played it ${games} times in six months (all positions), but it is not in My Heroes for this position`,
  };
}

/**
 * A pick as an equal card: the art, the rank and name, chips, score and place; the verdict against the list's first;
 * Why This Hero; Score Parts; the actions. Content runs top down and spare space stays at the bottom. The hero from
 * outside the pool is a quieter dashed card with the engine's line at its head. The Team Plan's Pick First (`now`)
 * is the only copper card: the ring, the chip and the filled Picked.
 */
export function PickCard({
  entry,
  rank,
  leader,
  ctx,
  outsiderText,
  now = null,
  isInPlan = false,
}: {
  entry: PickEntry;
  /** The place in the list; null for the hero from outside the pool. */
  rank: number | null;
  leader?: string;
  ctx: PickCtx;
  outsiderText?: string;
  /** The hero to lock now, with why for the chip's title; null for any other. */
  now?: { title: string } | null;
  /** The hero the Team Plan chose for this seat. */
  isInPlan?: boolean;
}) {
  const s = entry.suggestion;
  const nameId = rank === null ? `outsider-${s.heroId}` : `pick-${s.heroId}`;
  const split = scoreSplit(s.breakdown);
  const isOutsider = outsiderText !== undefined;
  const whose = ctx.owner ? `${ctx.owner}'s` : "Your";
  return (
    <article
      aria-labelledby={nameId}
      className={`flex h-full min-w-0 flex-col gap-5 rounded-xl p-5 sm:p-6 ${
        isOutsider
          ? "border border-dashed border-line-control bg-surface/50"
          : `bg-surface ring-1 ring-inset ${now ? "ring-accent/45" : "ring-line"}`
      }`}
    >
      {isOutsider && (
        <div className="flex flex-col gap-1 border-b border-line pb-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <LaneMark />
            Worth a Look from Outside {whose} Pool
          </h3>
          <p className="text-sm leading-6 text-muted">
            <FacedText text={outsiderText} heroes={namedHeroes(outsiderText, ctx.heroes)} hero={ctx.hero} enemies={ctx.enemies} />
          </p>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        <PickFrame id={s.heroId} ctx={ctx} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {rank !== null && (
              <span
                aria-hidden
                className={`micro flex size-6 shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ${
                  rank === 1 ? "bg-fg text-bg" : "bg-bg text-muted ring-2 ring-(--lane-line) ring-inset"
                }`}
              >
                {rank}
              </span>
            )}
            <h3 id={nameId} data-hero-name className="text-xl leading-7 font-semibold tracking-tight break-words text-fg">
              {s.name}
            </h3>
          </div>
          <span className="flex flex-wrap items-center gap-2 empty:hidden">
            {now && (
              <span className={BEST_CHIP} title={now.title}>
                Pick First
              </span>
            )}
            <PickChips
              move={entry.move}
              isWeak={entry.isWeak}
              isInPlan={isInPlan}
              owner={ctx.owner}
              outside={
                isOutsider
                  ? { title: `Not one of ${ctx.owner ? `${ctx.owner}'s` : "your"} heroes for this position` }
                  : playedChip(entry.playedGames, ctx.owner)
              }
            />
          </span>
          <Score s={s} gain={entry.gain} position={ctx.position} />
        </div>
      </div>

      {entry.verdict && <VerdictBlock verdict={entry.verdict} leader={leader} ctx={ctx} />}

      <div className="border-t border-line pt-5 empty:hidden">
        <WhyLines s={s} ctx={ctx} />
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <h4 className="micro flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-subtle">
          Score Parts
          <span className="tabular-nums">
            <span className="font-semibold text-fg">{signed(split.draft)}</span> From This Draft,{" "}
            <span className="font-semibold text-fg">{signed(split.base)}</span> From Meta, Role and Comfort
          </span>
        </h4>
        {/* Two columns while a card has the room: across the lane below 1024px, half of it from 1280px. */}
        <ScoreParts s={s} className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" />
      </div>

      {ctx.onPicked && ctx.onBanned && (
        <span className="flex border-t border-line pt-3">
          <PickActions s={s} isBest={false} isNow={Boolean(now)} ctx={ctx} />
        </span>
      )}
    </article>
  );
}

/**
 * The Best pick across the lane: the render in a large frame; the label the data allows ("Clear Best Pick" only when
 * the gap beats the error, "Best of Your Heroes" when it is weak here), name, seat, score and place, the verdict and
 * the copper Picked; every reason; the score and its parts. The engine's "Reacting to" line at the foot.
 */
function BestCard({ entry, reacting, ctx }: { entry: PickEntry; reacting: string; ctx: PickCtx }) {
  const s = entry.suggestion;
  const { verdict } = entry;
  const label = entry.isWeak ? "Best of Your Heroes" : verdict?.kind === "clear" ? "Clear Best Pick" : "Best Pick Right Now";
  const split = scoreSplit(s.breakdown);
  const { portrait } = ctx.hero(s.heroId);
  const played = playedChip(entry.playedGames);
  return (
    <article aria-labelledby="best-pick" className="flex h-full flex-col rounded-xl bg-surface ring-1 ring-accent/45 ring-inset">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 md:grid-cols-[16rem_minmax(0,1fr)] md:p-6 xl:grid-cols-[16rem_13.5rem_minmax(0,1fr)_16rem]">
        <HeroStage key={s.heroId} size={200} className="h-44 w-full md:h-52">
          {portrait && <HeroArt heroId={s.heroId} portrait={portrait} placement={BEST_ART} />}
        </HeroStage>

        <div className="flex min-w-0 flex-col gap-3">
          <span className="flex flex-wrap items-center gap-2">
            <span className={BEST_CHIP} title={verdict?.text}>
              {label}
            </span>
            <PickChips move={entry.move} isWeak={entry.isWeak} outside={played} />
          </span>
          <h3 id="best-pick" data-hero-name className="text-[1.75rem] leading-8 font-semibold tracking-tight break-words text-fg">
            {s.name}
          </h3>
          <span className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-subtle">
              <PositionIcon position={ctx.position} size={14} />
              <span className="micro text-muted">
                Pos {ctx.position} {POSITION_NAMES[ctx.position - 1]}
              </span>
            </span>
            <span className="micro rounded-full bg-radiant px-2 leading-5 font-semibold text-bg">You</span>
          </span>
          <span className="pt-1">
            <Score s={s} gain={entry.gain} position={ctx.position} isLarge />
          </span>
          {verdict && <VerdictBlock verdict={verdict} ctx={ctx} isQuiet />}
          {ctx.onPicked && ctx.onBanned && (
            <span className="mt-auto flex pt-2">
              <PickActions s={s} isBest ctx={ctx} />
            </span>
          )}
        </div>

        <div className="min-w-0 border-t border-line pt-5 empty:hidden md:col-span-2 xl:col-span-1 xl:border-t-0 xl:border-l xl:pt-0.5 xl:pl-6">
          <WhyLines s={s} ctx={ctx} />
        </div>

        <div className="flex min-w-0 flex-col gap-3 border-t border-line pt-5 md:col-span-2 xl:col-span-1 xl:border-t-0 xl:border-l xl:pt-0.5 xl:pl-6">
          <h4 className="micro text-subtle">Score Parts</h4>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                [split.draft, "From This Draft"],
                [split.base, "From Meta, Role and Comfort"],
              ] as const
            ).map(([v, l]) => (
              <span key={l} className="flex flex-col gap-0.5 rounded-lg bg-raised px-3 py-2">
                <span className="text-lg leading-6 font-semibold tracking-tight text-fg tabular-nums">{signed(v)}</span>
                <span className="micro text-muted">{l}</span>
              </span>
            ))}
          </div>
          {/* Across the card below 1280px, so two columns; in its own column from there. */}
          <ScoreParts s={s} className="grid gap-x-8 gap-y-2 md:grid-cols-2 xl:grid-cols-1" />
        </div>
      </div>
      <p className="micro border-t border-line px-5 py-4 text-subtle md:px-6">{reacting}</p>
    </article>
  );
}

/**
 * Every listed hero on one axis: a bar from zero to its score, and the band the data could be off by (VERDICT_Z
 * times the score's error, the margin the verdicts use).
 */
function ScoreLadder({ list, hero }: { list: Suggestion[]; hero: PlanHeroOf }) {
  const band = (s: Suggestion) => VERDICT_Z * s.error;
  const lo = Math.floor(Math.min(0, ...list.map((s) => s.score - band(s))) / 5) * 5;
  const hi = Math.ceil(Math.max(0, ...list.map((s) => s.score + band(s))) / 5) * 5;
  const x = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 5) ticks.push(t);
  return (
    <section aria-labelledby="score-ladder" className="flex h-full min-w-0 flex-col gap-5 rounded-xl bg-surface p-5 ring-1 ring-line ring-inset sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 id="score-ladder" className="flex items-center gap-2 text-base font-semibold text-fg">
          <LaneMark className="text-fg" />
          Score Ladder
        </h3>
        <p className="micro text-subtle">The light band is how far each score could be off.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {list.map((s, i) => (
          <li key={s.heroId} className="grid grid-cols-[1.75rem_minmax(0,1fr)_2.75rem] items-center gap-2.5">
            <Face id={s.heroId} hero={hero} size={28} isEnemy={false} />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="micro font-medium break-words text-fg">{s.name}</span>
              <span className="relative h-2.5" aria-hidden>
                <span className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
                <span className="absolute -top-1 -bottom-1 w-px bg-line-control" style={{ left: `${x(0)}%` }} />
                <span
                  className="absolute inset-y-0 rounded-xs bg-fg/12"
                  style={{ left: `${x(s.score - band(s))}%`, width: `${x(s.score + band(s)) - x(s.score - band(s))}%` }}
                />
                <span
                  className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-xs ${s.score < 0 ? "bg-dire" : i === 0 ? "bg-fg" : "bg-line-control"}`}
                  style={{ left: `${Math.min(x(0), x(s.score))}%`, width: `${Math.abs(x(s.score) - x(0))}%` }}
                />
              </span>
            </span>
            <span className={`num text-right ${s.score < 0 ? "text-dire" : "text-fg"}`}>{signed(s.score)}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_2.75rem] gap-2.5" aria-hidden>
        <span className="micro relative col-start-2 h-4 text-subtle tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${x(t)}%` }}>
              {t > 0 ? `+${t}` : t < 0 ? `−${-t}` : "0"}
            </span>
          ))}
        </span>
      </div>
    </section>
  );
}
