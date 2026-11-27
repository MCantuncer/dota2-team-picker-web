"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { finishedBuys, type SimilarGame } from "@/lib/engine/similar-games";
import type { ItemInfo } from "@/lib/engine/types";
import { OpenDotaButton } from "./external-button";
import { HeroFace } from "./hero-frame";
import { Icon } from "./icon";
import { Faces, minutes } from "./similar-game-tiles";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
/** Room a mark takes on the minute line, in pixels: the widest is a death's face (28 high, 16:9), plus a gap. */
const MARK_PX = 56;

export interface GamePopupProps {
  game: SimilarGame;
  hero: number;
  enemies: number[];
  allies: number[];
  heroName: (id: number) => string;
  icons: Record<number, string>;
  items?: Record<string, ItemInfo>;
  onClose: () => void;
}

/**
 * One similar game, opened from its tile: both teams, four numbers, and the game on one minute line with his
 * finished items above and his deaths below, each with the enemy who killed him. A modal dialog: Esc, the close
 * button or a click outside closes it, and focus goes back to the tile's button.
 */
export function GamePopup({ game: g, hero, enemies, allies, heroName, icons, items, onClose }: GamePopupProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    close.current?.focus();
  }, []);
  const deaths15 = g.deathsAt.filter(([at]) => at <= 15 * 60).length;
  const facts: [string, string][] = [
    [`${g.kills} / ${g.deaths} / ${g.assists}`, "Kills, Deaths, Assists"],
    [g.networth.toLocaleString("en-US"), "Net Worth"],
    ...(g.lastHits10 !== null ? [[String(g.lastHits10), "Last Hits at 10 Min"] as [string, string]] : []),
    [String(deaths15), "Deaths by 15 Min"],
  ];
  return (
    <dialog
      ref={ref}
      aria-label={`${heroName(hero)}, ${g.won ? "won" : "lost"}, ${minutes(g.duration)} min`}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-xl border border-line-strong bg-surface p-0 text-fg backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-6 p-5">
        <header className="flex items-center gap-3">
          {icons[hero] && <HeroFace portrait={icons[hero]!} name={heroName(hero)} size={36} isDecorative />}
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-lg font-semibold">{heroName(hero)}</span>
            <span className="flex items-center gap-3">
              <span
                className={`chip h-6 px-2 text-sm font-medium shadow-none ${g.won ? "bg-radiant-tint text-radiant" : "bg-dire-tint text-dire"}`}
              >
                {g.won ? "Won" : "Lost"}
              </span>
              <span className="num text-base">{minutes(g.duration)} Min</span>
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <span className="sm:hidden">
              <OpenDotaButton matchId={g.match} iconOnly />
            </span>
            <span className="hidden sm:inline-flex">
              <OpenDotaButton matchId={g.match} />
            </span>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              ref={close}
              className="btn btn-sm btn-icon"
              onClick={() => ref.current?.close()}
            >
              <Icon name="x" />
            </button>
          </span>
        </header>
        <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-2">
          <span className="text-sm text-muted">Enemy</span>
          <Faces seats={g.enemies} lit={enemies} isEnemy heroName={heroName} icons={icons} size={36} />
          <span className="text-sm text-muted">With</span>
          <Faces seats={g.allies.filter((s) => s.hero !== hero)} lit={allies} heroName={heroName} icons={icons} size={36} />
        </div>
        <dl className={`grid grid-cols-2 gap-3 ${facts.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {facts.map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse gap-1 rounded-lg bg-raised px-3 py-2.5">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <MinuteLine game={g} heroName={heroName} icons={icons} items={items} />
      </div>
    </dialog>
  );
}

interface Mark {
  at: number;
  key: string;
  row: number;
}

/** Puts each mark (sorted by time) on the first row where it is at least `room` percent of the line from the last. */
export function stackMarks<T extends { at: number; key: string }>(marks: T[], duration: number, room: number): (T & Mark)[] {
  const ends: number[] = [];
  return [...marks]
    .sort((a, b) => a.at - b.at)
    .map((m) => {
      const x = position(m.at, duration);
      let row = ends.findIndex((end) => x - end >= room);
      if (row < 0) row = ends.length;
      ends[row] = x;
      return { ...m, row };
    });
}

const position = (at: number, duration: number) => (Math.min(Math.max(at, 0), duration) / Math.max(duration, 1)) * 100;

function MinuteLine({
  game: g,
  heroName,
  icons,
  items,
}: {
  game: SimilarGame;
  heroName: (id: number) => string;
  icons: Record<number, string>;
  items?: Record<string, ItemInfo>;
}) {
  const line = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = line.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(([e]) => e && e.contentRect.width > 0 && setWidth(e.contentRect.width));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const room = (MARK_PX / width) * 100;
  const buys = stackMarks(
    (items ? finishedBuys(g, items) : []).flatMap(([id, at]) => (items?.[String(id)] ? [{ at, key: `i${id}`, id }] : [])),
    g.duration,
    room,
  );
  const deaths = stackMarks(
    g.deathsAt.map(([at, by], i) => ({ at, key: `d${i}`, by })),
    g.duration,
    room,
  );
  const ticks = Array.from({ length: Math.floor(g.duration / 300) + 1 }, (_, i) => i * 5);
  const rows = (marks: Mark[]) => Math.max(1, ...marks.map((m) => m.row + 1));
  const ROW = 3.5; // rem a row of items takes
  return (
    <section aria-label="The game, minute by minute" className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">The Game, Minute by Minute</h3>
      <div ref={line} className="px-6">
        <div className="relative" style={{ height: `${rows(buys) * ROW}rem` }}>
          {buys.map((b) => (
            <span
              key={b.key}
              className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5"
              style={{ left: `${position(b.at, g.duration)}%`, bottom: `${b.row * ROW}rem` }}
            >
              <Image
                src={ITEM_CDN + items![String(b.id)]!.img}
                alt={items![String(b.id)]!.name}
                title={items![String(b.id)]!.name}
                width={39}
                height={28}
                className="h-7 w-9.75 rounded-md object-cover"
              />
              <span className="num text-xs text-muted">{minutes(b.at)}</span>
            </span>
          ))}
        </div>
        <div className="relative my-2 h-5 border-t border-line-strong" aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-1 -translate-x-1/2 text-xs text-subtle"
              style={{ left: `${position(t * 60, g.duration)}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height: `${rows(deaths) * 2.5}rem` }}>
          {deaths.map((d) => (
            <span
              key={d.key}
              className="absolute flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${position(d.at, g.duration)}%`, top: `${d.row * 2.5}rem` }}
              title={`Died at ${minutes(d.at)} min${d.by ? ` to ${heroName(d.by)}` : ""}`}
            >
              {d.by && icons[d.by] ? (
                <HeroFace portrait={icons[d.by]!} name={`Died at ${minutes(d.at)} min to ${heroName(d.by)}`} size={28} isEnemy />
              ) : (
                <span role="img" aria-label={`Died at ${minutes(d.at)} min`} className="mt-2 size-2.5 rounded-full bg-dire" />
              )}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-subtle">Items above the line, deaths below with who killed him.</p>
    </section>
  );
}
