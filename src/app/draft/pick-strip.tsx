"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { HeroArt, HeroStage, type HeroArtPlacement } from "@/components/hero-frame";
import { Icon } from "@/components/icon";
import { ordinal } from "@/lib/engine/reasons";
import type { Position } from "@/lib/engine/types";
import { reasonLines, scoreParts, type NamedHero } from "@/lib/pick-lines";
import { BestCard, ScoreLadder, type PickCtx, type PickEntry } from "./my-picks";
import { Face, FacedText, HeadMark, minus, Stop, type PlanHeroOf } from "./team-plan";

/*
 * The Pick Strip: every suggested hero side by side, straight under the entry boxes, so the answer to "what do I
 * pick" needs no scrolling. Each tile is the face, the name, the score with its strength, the main reason and Picked.
 * A tile opens that hero's full card under the strip; the Best pick is open at the start. The player's heroes below 0
 * share one Not This Game box in the columns the tiles leave.
 */

/** Every tile puts the render's face on the same spot at the same scale. */
const TILE_ART: HeroArtPlacement = { width: 232, at: [0.5, 0.44] };
/** The strip is eight tiles wide, so a ninth (the hero from outside the pool) only narrows them a little. */
const STRIP_COLUMNS = 8;

const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}`;

/**
 * Where a hero stands among every hero for the position in this draft, in fifths: 5 for the top fifth, 1 for the
 * bottom. Null when the place is unknown.
 */
export function strengthOf(place: { rank: number; of: number }): number | null {
  if (place.rank < 1 || place.of < 1) return null;
  return 5 - Math.min(4, Math.floor(((place.rank - 1) / place.of) * 5));
}

/** The strength as five rising bars, like a signal meter: lit bars in the text colour, red when the score is below 0. */
export function Strength({
  place,
  isWeak = false,
  isLegend = false,
}: {
  place: { rank: number; of: number };
  isWeak?: boolean;
  /** The sample beside the legend's words: drawn, not read out. */
  isLegend?: boolean;
}) {
  const steps = strengthOf(place);
  if (steps === null) return null;
  return (
    <span
      role={isLegend ? undefined : "img"}
      aria-hidden={isLegend || undefined}
      aria-label={isLegend ? undefined : `Strength ${steps} of 5`}
      title={isLegend ? undefined : `Strength ${steps} of 5: ${ordinal(place.rank)} of ${place.of} heroes for this position in this draft`}
      className="flex h-4 shrink-0 items-end gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-xs ${i <= steps ? (isWeak ? "bg-dire" : "bg-fg") : "bg-line-control"}`}
          style={{ height: `${4 + i * 2.4}px` }}
        />
      ))}
    </span>
  );
}

interface PickStripProps {
  /** The head of the lane, beside its mark: the view tabs, or the picks title. */
  head: ReactNode;
  /** Shown under the head, before the picks: Did You Pick, the empty pool notice. */
  notices?: ReactNode[];
  /** The list, best first. */
  picks: PickEntry[];
  /** The hero from outside the pool that beats the list, with the engine's line on it. */
  outsider?: { entry: PickEntry; text: string } | null;
  /** The engine's "Reacting to ..." line, the open card's footer. */
  reacting: string;
  position: Position;
  hero: PlanHeroOf;
  heroes: readonly NamedHero[];
  enemies: readonly number[];
  onPicked?: (heroId: number) => void;
  onBanned?: (heroId: number) => void;
}

/** My Picks as a strip of tiles on the lane, with the open hero's full card under it. */
export function PickStrip({
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
}: PickStripProps) {
  const ctx: PickCtx = { hero, heroes, enemies: new Set(enemies), position, onPicked, onBanned };
  // The first always gets a tile, even below 0; any other hero below 0 goes to Not This Game.
  const tiles = picks.filter((p, i) => i === 0 || !p.isWeak);
  const out = picks.filter((p, i) => i > 0 && p.isWeak);
  const all = [...picks, ...(outsider ? [outsider.entry] : [])];
  const [chosen, setChosen] = useState<number | null>(null);
  const open = all.find((p) => p.suggestion.heroId === chosen) ?? picks[0];
  const openId = open?.suggestion.heroId ?? null;
  const cells = tiles.length + (outsider ? 1 : 0);
  // Not This Game takes the columns the tiles leave, at least one.
  const columns = Math.max(STRIP_COLUMNS, cells + (out.length ? 1 : 0));
  const leader = picks[0]?.suggestion.name;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Stop isFirst node={<HeadMark />} nodeClass="top-[1.1875rem]">
        <div className="flex min-h-[2.375rem] min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {head}
          {picks.length > 0 && (
            <span className="micro flex items-center gap-2 text-subtle">
              <Strength place={{ rank: 1, of: 5 }} isLegend />
              Strength Among All {picks[0]!.suggestion.place.of} Heroes for This Role
            </span>
          )}
        </div>
      </Stop>
      {notices.length > 0 && (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 md:grid-cols-[1.75rem_minmax(0,1fr)] md:gap-x-3">
          <span className="relative" aria-hidden>
            <span className="lane-spine -top-4 -bottom-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-4">{notices}</div>
        </div>
      )}
      <Stop node={<span className="lane-node lane-node-now" />} nodeClass="top-[3.25rem]">
        <div
          className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-4 xl:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
          style={{ "--cols": columns } as CSSProperties}
        >
          <ol aria-label="Suggested heroes" className="contents">
            {tiles.map((entry, i) => (
              <Tile
                key={entry.suggestion.heroId}
                entry={entry}
                label={i === 0 ? (entry.isWeak || entry.suggestion.place.rank > 1 ? "Your Best" : "Best") : null}
                isOpen={openId === entry.suggestion.heroId}
                onOpen={() => setChosen(entry.suggestion.heroId)}
                ctx={ctx}
              />
            ))}
          </ol>
          {outsider && (
            <ol aria-label="Hero from outside your pool" className="contents">
              <Tile
                entry={outsider.entry}
                label={null}
                isOutsider
                isOpen={openId === outsider.entry.suggestion.heroId}
                onOpen={() => setChosen(outsider.entry.suggestion.heroId)}
                ctx={ctx}
              />
            </ol>
          )}
          {out.length > 0 && <NotThisGame entries={out} span={columns - cells} openId={openId} onOpen={setChosen} ctx={ctx} />}
        </div>
      </Stop>
      {open && (
        <Stop isLast={picks.length < 2} node={<span className="lane-node lane-node-open" />} nodeClass="top-[4.25rem]">
          <BestCard
            id="pick-detail"
            entry={open}
            reacting={reacting}
            ctx={ctx}
            rank={outsider && open === outsider.entry ? null : picks.indexOf(open) + 1}
            leader={leader}
            outsiderText={outsider && open === outsider.entry ? outsider.text : undefined}
          />
        </Stop>
      )}
      {picks.length > 1 && (
        <Stop isLast node={<span className="lane-node lane-node-open" />} nodeClass="top-[2.125rem]">
          <ScoreLadder list={picks.map((p) => p.suggestion)} hero={hero} />
        </Stop>
      )}
    </div>
  );
}

/** The main reason for a hero, number first, and its named risk on a line of its own. */
function TileReason({ entry, ctx }: { entry: PickEntry; ctx: PickCtx }) {
  const lines = reasonLines(entry.suggestion, ctx.heroes, ctx.owner);
  const main = lines.find((l) => !l.isWarn);
  const risk = entry.isWeak ? null : entry.risk;
  return (
    <span className="micro flex min-w-0 flex-col gap-1.5 text-left leading-5 text-muted">
      {main && (
        <span>
          {main.lead && <span className="font-semibold text-fg tabular-nums">{minus(main.lead)} </span>}
          {/* The note in brackets ("likely your lane") is on the full card. */}
          <FacedText text={main.text.replace(/\s*\([^)]*\)$/, "")} heroes={main.heroes} hero={ctx.hero} enemies={ctx.enemies} />
        </span>
      )}
      {risk && (
        <span className="flex items-center gap-1.5 text-warn sm:hidden">
          <Icon name="alert" />
          <span className="sr-only">Risk:</span>
          <Face id={risk.heroId} hero={ctx.hero} isEnemy />
          <span className="min-w-0 font-medium break-words">{ctx.hero(risk.heroId).name}</span>
        </span>
      )}
    </span>
  );
}

/**
 * One hero of the strip. Across on a phone (art, then the words, then Picked); a column from 640px, where the rows of
 * every tile line up (art, name, score, reason, Picked). The tile opens the hero's card; Picked is its own button.
 */
function Tile({
  entry,
  label,
  isOutsider = false,
  isOpen,
  onOpen,
  ctx,
}: {
  entry: PickEntry;
  /** The Best pick's label; null for any other tile. */
  label: string | null;
  isOutsider?: boolean;
  isOpen: boolean;
  onOpen: () => void;
  ctx: PickCtx;
}) {
  const s = entry.suggestion;
  const isBest = label !== null;
  const { portrait } = ctx.hero(s.heroId);
  const isOutside = isOutsider || entry.playedGames != null;
  const mark = isOutside ? "Outside Pool" : (entry.move ?? null);
  const risk = entry.risk && !entry.isWeak ? entry.risk : null;
  return (
    <li
      className={`relative grid min-w-0 grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg p-2.5 sm:row-span-5 sm:grid-cols-1 sm:grid-rows-subgrid sm:items-stretch ${
        isOutsider
          ? "border border-dashed border-line-control bg-surface/50"
          : `ring-1 ring-inset ${isBest ? "ring-accent/45" : isOpen ? "ring-line-hover" : "ring-line"} ${isOpen ? "bg-raised" : "bg-surface"}`
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={isOpen}
        aria-controls="pick-detail"
        aria-label={`${s.name}, ${signed(s.score)} points${risk ? `, risk ${ctx.hero(risk.heroId).name}` : ""}. Show why.`}
        className="col-span-2 grid min-w-0 grid-cols-subgrid items-center gap-y-2 rounded-md text-left sm:col-span-1 sm:row-span-4 sm:grid-cols-1 sm:grid-rows-subgrid sm:items-stretch"
      >
        <span className="relative block">
          <HeroStage key={s.heroId} size={72} className="h-16 w-full sm:h-[4.5rem]">
            {portrait && <HeroArt heroId={s.heroId} portrait={portrait} placement={TILE_ART} />}
          </HeroStage>
          {label && <span className="chip chip-accent micro absolute top-1.5 right-1.5 z-2 max-sm:hidden">{label}</span>}
          {risk && (
            <span
              className="chip micro absolute bottom-1.5 left-1.5 z-2 h-auto gap-1 py-0.5 pr-0.5 pl-1 text-warn max-sm:hidden"
              title={`Risk: ${signed(risk.points)} points against ${ctx.hero(risk.heroId).name}`}
            >
              <Icon name="alert" />
              <span className="sr-only">Risk: {ctx.hero(risk.heroId).name}</span>
              <Face id={risk.heroId} hero={ctx.hero} isEnemy />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-1 sm:contents">
          <span className="flex min-w-0 flex-wrap content-start items-center gap-x-2 gap-y-1">
            <span data-hero-name className="text-sm leading-5 font-semibold break-words text-fg">
              {s.name}
            </span>
            {/* On a phone the art is too small for the Best label, so it sits beside the name. */}
            {label && <span className="chip chip-accent micro sm:hidden">{label}</span>}
            {/* Beside the name, or under a long one: the art keeps only the Best label and the risk. */}
            {mark && <span className="chip micro">{mark}</span>}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className={`text-lg leading-6 font-semibold tracking-tight tabular-nums ${s.score < 0 ? "text-dire" : "text-fg"}`}>
              {signed(s.score)}
            </span>
            <Strength place={s.place} isWeak={s.score < 0} />
          </span>
          <TileReason entry={entry} ctx={ctx} />
        </span>
      </button>
      {isOpen && (
        <svg viewBox="0 0 16 8" aria-hidden className={`absolute -bottom-3 left-1/2 h-2 w-4 -translate-x-1/2 max-sm:hidden ${isBest ? "text-accent" : "text-line-hover"}`}>
          <path d="M1 1l7 6 7-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {ctx.onPicked && (
        <button
          type="button"
          onClick={() => ctx.onPicked?.(s.heroId)}
          aria-label={`Picked ${s.name}`}
          className={`btn btn-sm max-sm:w-9 max-sm:px-0 sm:w-full ${isBest ? "btn-primary" : "btn-secondary"}`}
        >
          <span className={`flex ${isBest ? "" : "text-radiant"}`}>
            <Icon name="check" />
          </span>
          {/* On a phone the tile is a row, so the button is the check alone; its name is in the label. */}
          <span className="max-sm:hidden">Picked</span>
        </button>
      )}
    </li>
  );
}

/** Why a hero is below 0 here: its most negative score part, and the enemy when that part is the matchups. */
function WhyOut({ entry, ctx }: { entry: PickEntry; ctx: PickCtx }) {
  const worst = scoreParts(entry.suggestion.breakdown)
    .filter((p) => p.value < 0)
    .sort((a, b) => a.value - b.value)[0];
  if (!worst) return null;
  const { risk } = entry;
  return (
    <span className="micro flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted">
      {worst.name} <span className="font-semibold text-dire tabular-nums">{signed(worst.value)}</span>
      {worst.key === "counter" && risk && (
        <>
          <Face id={risk.heroId} hero={ctx.hero} isEnemy />
          <span className="font-medium text-fg">{ctx.hero(risk.heroId).name}</span>
        </>
      )}
    </span>
  );
}

/**
 * The player's heroes that score below 0 in this draft, in the columns the tiles leave: small, dashed and quiet, so a
 * hero that does not fit never takes a full card. Each still opens its card.
 */
function NotThisGame({
  entries,
  span,
  openId,
  onOpen,
  ctx,
}: {
  entries: PickEntry[];
  /** Columns left in the strip. */
  span: number;
  openId: number | null;
  onOpen: (heroId: number) => void;
  ctx: PickCtx;
}) {
  return (
    <section
      aria-labelledby="not-this-game"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-dashed border-line-control p-3 sm:col-span-4 xl:col-(--span) xl:row-span-5"
      style={{ "--span": `span ${Math.max(1, span)}` } as CSSProperties}
    >
      <div className="flex flex-col gap-0.5">
        <h3 id="not-this-game" className="micro flex items-center gap-1.5 font-semibold text-fg">
          <span className="flex text-warn">
            <Icon name="alert" />
          </span>
          Not This Game
        </h3>
        <p className="micro text-subtle">Your heroes below 0 in this draft</p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-2">
        {entries.map((entry) => {
          const s = entry.suggestion;
          return (
            <li key={s.heroId} className="min-w-0">
              <button
                type="button"
                onClick={() => onOpen(s.heroId)}
                aria-pressed={openId === s.heroId}
                aria-controls="pick-detail"
                className={`flex w-full min-w-0 items-start gap-2.5 rounded-md p-1.5 text-left ${openId === s.heroId ? "bg-raised" : "hover:bg-raised"}`}
              >
                <Face id={s.heroId} hero={ctx.hero} size={32} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span data-hero-name className="text-sm leading-5 font-semibold break-words text-fg">
                      {s.name}
                    </span>
                    <span className="num text-dire">{signed(s.score)}</span>
                  </span>
                  <WhyOut entry={entry} ctx={ctx} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
