"use client";

import { useState, type ReactNode } from "react";
import { HeroArt, HeroFace, HeroStage, type HeroArtPlacement } from "@/components/hero-frame";
import { Icon, type IconName } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import type { AnotherTeam, PickFirst, PlanReason, PlannedSlot, TeamNeed, TeamPlan } from "@/lib/engine/plan";
import type { Need } from "@/lib/engine/traits";
import type { Position } from "@/lib/engine/types";
import { POSITION_NAMES } from "@/lib/party";

/*
 * The Team Plan as the Lane Board's mid lane: five position cards threaded on one bright line, a node per card
 * (filled when picked, a ring when open, the copper dot only for Pick First), and Another Super Team as a branch
 * off the lane at the bottom.
 */

/** A hero's name and 16:9 Steam portrait; the portrait is missing when the hero list couldn't be loaded. */
export interface PlanHero {
  name: string;
  portrait?: string;
}
export type PlanHeroOf = (id: number) => PlanHero;

/** Every Team Plan card puts the render's face on the same spot at the same scale. */
const CARD_ART: HeroArtPlacement = { width: 280, at: [0.56, 0.4] };
/** The small tiles of Another Super Team. */
const TILE_ART: HeroArtPlacement = { width: 190, at: [0.52, 0.42] };

export const NEED_ICONS: Record<Need, IconName> = {
  disable: "lock",
  initiation: "swords",
  save: "heart",
  durable: "helmet",
  push: "castle",
  magicDamage: "flame",
  physicalDamage: "skull",
};

const REASON_ICONS: Record<PlanReason["kind"], IconName> = {
  combo: "zap",
  pair: "users",
  counter: "swords",
  need: "check",
  record: "star",
  top: "star",
  meta: "trend",
  fit: "layers",
  pool: "heart",
};

/** The engine writes a plain hyphen before a negative number; the page shows a real minus sign. */
export const minus = (s: string) => s.replace(/(^|[\s(])-(?=\d)/g, "$1−");
/** A signed score with one decimal and a real minus sign. */
const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}`;
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A hero's face as a small Lane Cut square, or nothing when its art is missing (the name is always written). */
export function Face({
  id,
  hero,
  size = 20,
  isEnemy = false,
  isDecorative = true,
}: {
  id: number;
  hero: PlanHeroOf;
  size?: number;
  isEnemy?: boolean;
  isDecorative?: boolean;
}) {
  const { name, portrait } = hero(id);
  if (!portrait) return null;
  return <HeroFace portrait={portrait} name={name} size={size} isEnemy={isEnemy} isDecorative={isDecorative} />;
}

/**
 * One reason as one line: an icon for its kind, the number (or word) first in bold, then the engine's own words, with
 * a 20px face before each hero it names.
 */
export function Reason({
  reason: r,
  hero,
  enemies,
  icon,
}: {
  reason: PlanReason;
  hero: PlanHeroOf;
  enemies: ReadonlySet<number>;
  /** In place of the kind's own icon. */
  icon?: IconName;
}) {
  const parts: ReactNode[] = [];
  let rest = r.text;
  for (const id of r.heroes ?? []) {
    const name = hero(id).name;
    const at = name ? rest.indexOf(name) : -1;
    if (at < 0) continue;
    parts.push(minus(rest.slice(0, at)));
    // Punctuation right after a name stays with it, so the face's room never opens a gap before a colon.
    const tail = /^[:,.)]/.exec(rest.slice(at + name.length))?.[0] ?? "";
    parts.push(
      <span key={id} className="mx-1 inline-flex items-center gap-2 align-[-5px] whitespace-nowrap">
        <Face id={id} hero={hero} isEnemy={enemies.has(id)} />
        <span>
          <span className="font-medium text-fg">{name}</span>
          {tail}
        </span>
      </span>,
    );
    rest = rest.slice(at + name.length + tail.length);
  }
  parts.push(minus(rest));
  const mark = icon ?? (r.kind === "need" && r.need ? NEED_ICONS[r.need] : REASON_ICONS[r.kind]);
  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-2.5 text-sm leading-6">
      <span className="flex h-6 items-center text-subtle">
        <Icon name={mark} />
      </span>
      <span className="min-w-0 text-muted">
        <span className="font-semibold text-fg tabular-nums">{minus(r.lead)}</span> {parts}
      </span>
    </li>
  );
}

interface TeamPlanLaneProps {
  plan: TeamPlan;
  /** The head of the lane, beside its mark: the view tabs, or the title for players watching. */
  head: ReactNode;
  hero: PlanHeroOf;
  /** Display names by player id. */
  names: Record<string, string>;
  /** The reader's player id, whose seat shows the green You pill. */
  myId: string | null;
  /** Positions whose player has heroes saved for it. A hero outside them is labeled there; any other seat plays any hero. */
  pooled: ReadonlySet<Position>;
  /** Enemy picks, whose faces get the Dire edge. */
  enemies: readonly number[];
  /** Left out for players watching the planner's screen: they see the plan without the buttons. */
  onPicked?: (heroId: number, position: Position) => void;
  onBanned?: (heroId: number) => void;
  /** Takes a picked hero back out of the draft. */
  onUndo?: (heroId: number) => void;
}

/** The Team Plan: the lane's head, the five position cards on the lane, and Another Super Team as a branch off it. */
export function TeamPlanLane({
  plan,
  head,
  hero,
  names,
  myId,
  pooled,
  enemies,
  onPicked,
  onBanned,
  onUndo,
}: TeamPlanLaneProps) {
  const enemySet = new Set(enemies);
  const open = plan.slots.some((s) => !s.locked);
  const another = open ? plan.another : null;
  const lastPosition = plan.slots.at(-1)?.position;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Stop isFirst node={<HeadMark />} nodeClass="top-[1.1875rem]">
        {head}
      </Stop>
      <ol aria-label="Team Plan" className="grid gap-4 lg:auto-rows-fr">
        {plan.slots.map((slot) => {
          const isNow = plan.pickFirst?.position === slot.position;
          const state = isNow ? "now" : slot.locked ? "done" : "open";
          return (
            <li key={slot.position} className="min-w-0">
              <Stop
                isLast={!another && slot.position === lastPosition}
                node={
                  <span
                    className={`lane-node lane-node-${state}`}
                    title={isNow ? "Pick First" : slot.locked ? "Picked" : "Planned"}
                  />
                }
                nodeClass="top-[3.375rem] lg:top-[4.5rem]"
              >
                <PositionCard
                  slot={slot}
                  player={slot.playerId ? (names[slot.playerId] ?? "Left the Party") : null}
                  isMine={myId !== null && slot.playerId === myId}
                  isPooled={pooled.has(slot.position)}
                  pickFirst={isNow ? plan.pickFirst : null}
                  hero={hero}
                  enemies={enemySet}
                  onPicked={onPicked && (() => onPicked(slot.heroId, slot.position))}
                  onBanned={onBanned && (() => onBanned(slot.heroId))}
                  onUndo={onUndo && (() => onUndo(slot.heroId))}
                />
              </Stop>
            </li>
          );
        })}
      </ol>
      {another && <AnotherSuperTeam plan={plan} team={another} hero={hero} enemies={enemySet} />}
    </div>
  );
}

/** One stop on the lane: the gutter with its stretch of the line and its node, then the card. */
function Stop({
  isFirst,
  isLast,
  node,
  nodeClass,
  children,
}: {
  isFirst?: boolean;
  isLast?: boolean;
  node: ReactNode;
  nodeClass: string;
  children: ReactNode;
}) {
  return (
    <div className="grid h-full grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 md:grid-cols-[1.75rem_minmax(0,1fr)] md:gap-x-3">
      <span className="relative" aria-hidden>
        <span
          className={`lane-spine ${isFirst ? nodeClass : "-top-3"} ${isLast ? "h-[4.125rem] lg:h-[5.25rem]" : "-bottom-3"}`}
        />
        <span className={`absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 ${nodeClass}`}>{node}</span>
      </span>
      {children}
    </div>
  );
}

/** The head of the lane: the logo frame and its lane, without the dot (the dot is for Pick First). */
function HeadMark() {
  return (
    <span className="flex size-6 items-center justify-center bg-bg">
      <svg viewBox="0 0 24 24" className="size-6">
        <path
          d="M3.5 1.5h13L22.5 7.5v14a1 1 0 0 1-1 1h-14L1.5 16.5V3.5a2 2 0 0 1 2-2z"
          fill="var(--raised)"
          stroke="var(--line-control)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path d="M7 17 17 7" stroke="var(--fg)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

interface PositionCardProps {
  slot: PlannedSlot;
  /** The player's name; null for a seat without a player. */
  player: string | null;
  isMine: boolean;
  isPooled: boolean;
  /** Why to pick this hero first, when it is the one; else null. */
  pickFirst: PickFirst | null;
  hero: PlanHeroOf;
  enemies: ReadonlySet<number>;
  onPicked?: () => void;
  onBanned?: () => void;
  onUndo?: () => void;
}

/**
 * A position card: the hero's render on the stage, its name, the seat and its state, the actions, and Why This Hero
 * with every reason the engine gives for the slot. One row from 1024px; below that the reasons go under the hero.
 */
export function PositionCard({
  slot,
  player,
  isMine,
  isPooled,
  pickFirst,
  hero,
  enemies,
  onPicked,
  onBanned,
  onUndo,
}: PositionCardProps) {
  const isNow = pickFirst !== null;
  // The counter the enemy could answer with gets its face in the line.
  const firstWhy = pickFirst && {
    ...pickFirst.reason,
    heroes: pickFirst.counter ? [pickFirst.counter.heroId] : undefined,
  };
  const { portrait } = hero(slot.heroId);
  const nameId = `plan-hero-${slot.position}`;
  const whyId = `plan-why-${slot.position}`;
  const state = slot.locked ? null : !isPooled ? (
    <span className="micro text-subtle" title="No heroes saved for this position, so this is the best of every hero">
      Any Hero
    </span>
  ) : (
    !slot.inPool && (
      <span className="chip micro" title="Every one of this player's heroes for this position is taken">
        Outside Pool
      </span>
    )
  );
  const actions = slot.locked ? (
    <span className="flex items-center gap-2">
      <span className="flex h-8 items-center gap-1.5 pr-1 text-sm font-medium text-radiant">
        <Icon name="check" />
        Picked
      </span>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          aria-label={`Undo ${slot.name}`}
          title="Undo"
          className="btn btn-secondary btn-icon btn-sm"
        >
          <Icon name="undo" />
        </button>
      )}
    </span>
  ) : (
    onPicked &&
    onBanned && (
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPicked}
          className={`btn btn-sm w-[6.25rem] ${isNow ? "btn-primary" : "btn-secondary"}`}
        >
          <span className={`flex ${isNow ? "" : "text-radiant"}`}>
            <Icon name="check" />
          </span>
          Picked
        </button>
        <button
          type="button"
          onClick={onBanned}
          aria-label={`Banned ${slot.name}`}
          title="Banned"
          className="btn btn-secondary btn-icon btn-sm"
        >
          <Icon name="ban" />
        </button>
      </span>
    )
  );
  return (
    <article
      aria-labelledby={nameId}
      aria-describedby={slot.reasons.length || firstWhy ? whyId : undefined}
      className={`grid h-full grid-cols-[6.5rem_minmax(0,1fr)] content-start gap-x-4 gap-y-5 rounded-xl bg-surface p-5 ring-1 ring-inset lg:grid-cols-[10.5rem_11.5rem_minmax(0,1fr)] lg:gap-x-6 lg:p-6 ${
        isNow ? "ring-accent/45" : "ring-line"
      }`}
    >
      <HeroStage key={slot.heroId} size={96} className="h-[4.25rem] w-[6.5rem] lg:h-24 lg:w-[10.5rem]">
        {portrait && <HeroArt heroId={slot.heroId} portrait={portrait} placement={CARD_ART} />}
      </HeroStage>

      {/* Name and state, the seat, then the actions straight after. */}
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
          <h3 id={nameId} data-hero-name className="text-lg leading-6 font-semibold tracking-tight text-fg">
            {slot.name}
          </h3>
          {isNow && (
            <span className="chip chip-accent micro shrink-0">Pick First</span>
          )}
        </div>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-subtle" title={POSITION_NAMES[slot.position]}>
            <PositionIcon position={slot.position} size={14} />
            <span className="micro text-muted">Pos {slot.position}</span>
          </span>
          {isMine ? (
            <span className="micro rounded-full bg-radiant px-2 leading-5 font-semibold text-bg">You</span>
          ) : (
            <span className={`micro font-semibold break-words ${player ? "text-fg" : "text-subtle"}`}>
              {player ?? "Open Seat"}
            </span>
          )}
          {state}
        </span>
        {actions && <span className="flex pt-2.5">{actions}</span>}
      </div>

      {/* Why This Hero: the engine's reasons, all of them. */}
      <div className="col-span-2 flex min-w-0 flex-col gap-2.5 border-t border-line pt-5 lg:col-span-1 lg:border-t-0 lg:border-l lg:pt-0.5 lg:pl-6">
        <h4 className="micro text-subtle">Why This Hero</h4>
        {slot.reasons.length || firstWhy ? (
          <ul id={whyId} className="flex flex-col gap-2.5">
            {firstWhy && <Reason reason={firstWhy} hero={hero} enemies={enemies} icon="zap" />}
            {slot.reasons.map((r) => (
              <Reason key={`${r.kind}:${r.text}`} reason={r} hero={hero} enemies={enemies} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{slot.locked ? "Picked already." : "The best fit left for this seat."}</p>
        )}
      </div>
    </article>
  );
}

/**
 * Another Super Team as a branch off the lane: the line forks on a dashed 45 degree joint into a quieter card with
 * how far behind the plan it is and why, the heroes that differ, and Show Why for its own reasons and team needs.
 */
export function AnotherSuperTeam({
  plan,
  team,
  hero,
  enemies,
}: {
  plan: TeamPlan;
  team: AnotherTeam;
  hero: PlanHeroOf;
  enemies: ReadonlySet<number>;
}) {
  const [isOpen, setOpen] = useState(false);
  const differ = team.slots.filter((s) => !s.same);
  // "2.9 points behind: its pairs win less together (-3.1)." The number is shown big, so the line keeps the why.
  const [, why] = /^[^:]*:\s*(.+?)\.?$/.exec(team.verdict) ?? [];
  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 md:grid-cols-[1.75rem_minmax(0,1fr)] md:gap-x-3">
      {/* The fork: the lane runs on, then turns off at 45 degrees, dashed, into the card. */}
      <span className="relative" aria-hidden>
        <span className="lane-spine -top-3 h-7" />
        <svg viewBox="0 0 28 28" className="absolute top-4 left-1/2 size-7 overflow-visible">
          <path
            d="M0 0 L22 22"
            stroke="var(--lane-line)"
            strokeWidth="2"
            strokeDasharray="2.5 3.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="0" cy="0" r="4.5" fill="var(--bg)" stroke="var(--lane-line)" strokeWidth="2" />
        </svg>
      </span>
      <section
        aria-labelledby="another-super-team"
        className="flex min-w-0 flex-col rounded-xl bg-surface/60 ring-1 ring-line ring-inset"
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-5 p-5 md:p-6">
          <div className="flex min-w-[13rem] flex-1 flex-col gap-1">
            <h3 id="another-super-team" className="text-sm font-semibold text-fg">
              Another Super Team
            </h3>
            <span className="flex items-baseline gap-1.5">
              <span className="text-xl leading-7 font-semibold tracking-tight text-fg tabular-nums">
                {signed(-team.behind)}
              </span>
              <span className="micro text-subtle">Points Behind</span>
            </span>
            <span className="micro text-muted">{why ? minus(capitalize(why)) : minus(team.verdict)}</span>
          </div>
          {differ.length > 0 && (
            <ul aria-label="Heroes That Differ" className="flex min-w-0 flex-wrap items-start gap-2 max-md:w-full">
              {differ.map((s) => {
                const { portrait } = hero(s.heroId);
                return (
                  <li
                    key={s.position}
                    className="flex w-[5.5rem] min-w-0 flex-col gap-1.5"
                    title={`Pos ${s.position}: ${s.name}`}
                  >
                    <HeroStage size={60} className="h-[3.25rem] w-full">
                      {portrait && <HeroArt heroId={s.heroId} portrait={portrait} placement={TILE_ART} />}
                    </HeroStage>
                    <span className="flex min-w-0 items-start gap-1">
                      <span className="micro text-subtle tabular-nums">
                        <span className="sr-only">Pos </span>
                        {s.position}
                      </span>
                      <span className="micro font-medium break-words text-fg">{s.name}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="another-why"
            className="btn btn-secondary btn-sm"
          >
            {isOpen ? "Hide Why" : "Show Why"}
            <span className={`flex transition-transform duration-[var(--dur-fast)] ${isOpen ? "rotate-180" : ""}`}>
              <Icon name="chevronDown" />
            </span>
          </button>
        </div>
        {isOpen && (
          <div id="another-why" className="flex flex-col gap-5 border-t border-line p-5 md:p-6">
            <ul aria-label="Why These Five" className="flex flex-col gap-2.5">
              {team.why.map((r) => (
                <Reason key={`${r.kind}:${r.text}`} reason={r} hero={hero} enemies={enemies} />
              ))}
            </ul>
            <NeedsDiff team={team.needs} base={plan.needs} hero={hero} />
          </div>
        )}
      </section>
    </div>
  );
}

/** Another Super Team's needs that differ from the plan's: covered there and not here, or the other way round. */
function NeedsDiff({ team, base, hero }: { team: TeamNeed[]; base: TeamNeed[]; hero: PlanHeroOf }) {
  const covered = (n: TeamNeed) => n.heroes.length >= n.wanted;
  const diff = team.filter((n) => {
    const b = base.find((x) => x.need === n.need);
    return !b || covered(b) !== covered(n);
  });
  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="text-sm font-semibold text-fg">Team Needs</h4>
      {diff.length ? (
        <NeedRows needs={diff} hero={hero} />
      ) : (
        <p className="text-sm text-muted">Covers the same team needs as the plan.</p>
      )}
    </div>
  );
}

/** One row per team need: its icon, its label and the faces of the heroes covering it. A missing need is amber. */
export function NeedRows({ needs, hero }: { needs: TeamNeed[]; hero: PlanHeroOf }) {
  return (
    <ul className="flex flex-col">
      {needs.map((n) => {
        const isMissing = n.heroes.length < n.wanted;
        return (
          <li
            key={n.need}
            className={`grid min-h-10 grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2.5 py-1 ${isMissing ? "bg-warn-tint text-warn" : "text-fg"}`}
          >
            <span className={`flex ${isMissing ? "" : "text-muted"}`}>
              <Icon name={isMissing ? "alert" : NEED_ICONS[n.need]} />
            </span>
            <span className="text-sm">{n.label}</span>
            <span className="flex items-center gap-1.5">
              {n.heroes.map((id) => (
                <Face key={id} id={id} hero={hero} size={22} isDecorative={false} />
              ))}
              {isMissing && <span className="micro">{n.heroes.length ? `Wants ${n.wanted}` : "Missing"}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
