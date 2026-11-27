"use client";

import Image from "next/image";
import { useState } from "react";
import { banChange, change, signed, type BanRate, type HeroRate } from "@/lib/meta";
import type { MetaHero } from "./meta-board";

const W = 1000;
const H = 520;
const M = { l: 56, r: 24, t: 20, b: 44 };
const PICK_TICKS = [1, 2, 5, 10, 20, 30, 50];
/** Face size on the map, in px: an icon, since every hero is a data mark here. */
const FACE = 30;

/** The win rate axis: 2 point steps around the heroes, always holding 46 to 54. */
function winAxis(rates: HeroRate[]): { lo: number; hi: number; ticks: number[] } {
  const lo = Math.floor(Math.min(46, ...rates.map((r) => r.win)) / 2) * 2;
  const hi = Math.ceil(Math.max(54, ...rates.map((r) => r.win)) / 2) * 2;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 2) ticks.push(t);
  return { lo, hi, ticks };
}

/**
 * Every hero on one chart: pick rate across on a square root scale (most heroes sit under 10%), win rate up, with
 * the 50% line dashed and the halves washed green and red. Faces are buttons with their numbers as the label.
 */
export function PickWinMap({
  rates,
  bans,
  heroes,
  selected,
  onSelect,
}: {
  rates: HeroRate[];
  /** Ban rates by hero id; a hero without one shows no ban line. */
  bans: Map<number, BanRate>;
  heroes: Map<number, MetaHero>;
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { lo, hi, ticks } = winAxis(rates);
  const pickMax = Math.max(1, ...rates.map((r) => r.pick)) * 1.08;
  const x = (v: number) => M.l + Math.sqrt(v / pickMax) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  const shown = rates.find((r) => r.id === hover);
  const shownHero = shown ? heroes.get(shown.id) : undefined;
  const shownBan = shown ? bans.get(shown.id) : undefined;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Pick rate and win rate of every hero">
        <rect x={M.l} y={y(hi)} width={W - M.l - M.r} height={y(50) - y(hi)} className="fill-radiant" opacity={0.045} />
        <rect x={M.l} y={y(50)} width={W - M.l - M.r} height={y(lo) - y(50)} className="fill-dire" opacity={0.045} />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.l}
              x2={W - M.r}
              y1={y(t)}
              y2={y(t)}
              className={t === 50 ? "stroke-line-control" : "stroke-line"}
              strokeWidth={t === 50 ? 1.5 : 1}
              strokeDasharray={t === 50 ? "5 4" : undefined}
            />
            <text x={M.l - 10} y={y(t) + 4} textAnchor="end" fontSize={12} className="fill-muted">
              {t}%
            </text>
          </g>
        ))}
        {PICK_TICKS.filter((t) => t <= pickMax).map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} className="stroke-line" />
            <text x={x(t)} y={H - M.b + 22} textAnchor="middle" fontSize={12} className="fill-muted">
              {t}%
            </text>
          </g>
        ))}
        <text x={W - M.r} y={H - 4} textAnchor="end" fontSize={12} className="fill-muted">
          Pick Rate
        </text>
        <text x={14} y={M.t + 4} textAnchor="end" fontSize={12} className="fill-muted" transform={`rotate(-90 14 ${M.t + 4})`}>
          Win Rate
        </text>
      </svg>
      {rates.map((r) => {
        const hero = heroes.get(r.id);
        if (!hero) return null;
        return (
          <button
            key={r.id}
            type="button"
            aria-label={`${hero.name}: picked in ${r.pick.toFixed(1)}% of games, wins ${r.win.toFixed(1)}%`}
            aria-pressed={selected === r.id}
            onClick={() => onSelect(r.id)}
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(r.id)}
            onBlur={() => setHover(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md ring-2 ring-bg transition-transform duration-[var(--dur-fast)] hover:z-10 hover:scale-125 hover:ring-accent aria-pressed:z-10 aria-pressed:ring-accent focus-visible:z-10 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none"
            style={{ left: `${(x(r.pick) / W) * 100}%`, top: `${(y(r.win) / H) * 100}%`, width: FACE, height: FACE }}
          >
            <Image src={hero.icon} alt="" width={FACE} height={FACE} className="size-full rounded-md" />
          </button>
        );
      })}
      {shown && shownHero && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-20 grid min-w-44 gap-0.5 rounded-lg bg-raised p-3 text-sm shadow-lg ring-1 ring-line-hover"
          style={{
            left: `${(x(shown.pick) / W) * 100}%`,
            top: `${(y(shown.win) / H) * 100}%`,
            transform: x(shown.pick) > W * 0.7 ? "translate(calc(-100% - 24px), -50%)" : "translate(24px, -50%)",
          }}
        >
          <span className="font-semibold text-fg">{shownHero.name}</span>
          <span className="text-muted">
            Win Rate <span className="num text-fg">{shown.win.toFixed(1)}%</span> <Change value={change(shown, "win")} />
          </span>
          <span className="text-muted">
            Pick Rate <span className="num text-fg">{shown.pick.toFixed(1)}%</span> <Change value={change(shown, "pick")} />
          </span>
          {shownBan && (
            <span className="text-muted">
              Ban Rate <span className="num text-fg">{shownBan.ban.toFixed(1)}%</span> <Change value={banChange(shownBan)} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return null;
  return <span className={`num ${value >= 0 ? "text-radiant" : "text-dire"}`}>{signed(value)}</span>;
}

/** The map's four corners as boards, for phones: split at 50% win rate and the middle hero's pick rate. */
export function MapBoards({
  rates,
  heroes,
  selected,
  onSelect,
  perBoard = 12,
}: {
  rates: HeroRate[];
  heroes: Map<number, MetaHero>;
  selected: number | null;
  onSelect: (id: number) => void;
  perBoard?: number;
}) {
  const picks = rates.map((r) => r.pick).sort((a, b) => a - b);
  const mid = picks[Math.floor(picks.length / 2)] ?? 0;
  const boards: { title: string; up: boolean; list: HeroRate[] }[] = [
    { title: "Strong and Popular", up: true, list: rates.filter((r) => r.win >= 50 && r.pick >= mid).sort((a, b) => b.win - a.win) },
    { title: "Strong but Rare", up: true, list: rates.filter((r) => r.win >= 50 && r.pick < mid).sort((a, b) => b.win - a.win) },
    { title: "Popular but Losing", up: false, list: rates.filter((r) => r.win < 50 && r.pick >= mid).sort((a, b) => b.pick - a.pick) },
    { title: "Weak Right Now", up: false, list: rates.filter((r) => r.win < 50 && r.pick < mid).sort((a, b) => a.win - b.win) },
  ];
  return (
    <div className="grid gap-3">
      {boards.map((b) => (
        <section key={b.title} className="grid gap-3 rounded-lg bg-raised p-4 ring-1 ring-inset ring-line-strong">
          <h3 className="flex items-center gap-2 font-semibold text-fg">
            <span aria-hidden className={b.up ? "text-radiant" : "text-dire"}>
              {b.up ? "▲" : "▼"}
            </span>
            {b.title}
          </h3>
          <ul className="grid grid-cols-6 gap-2">
            {b.list.slice(0, perBoard).map((r) => {
              const hero = heroes.get(r.id);
              return hero ? (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-label={`${hero.name}, wins ${r.win.toFixed(1)}%`}
                    aria-pressed={selected === r.id}
                    onClick={() => onSelect(r.id)}
                    className="block w-full rounded-md ring-2 ring-transparent aria-pressed:ring-accent"
                  >
                    <Image src={hero.icon} alt="" width={44} height={44} className="aspect-square w-full rounded-md" />
                  </button>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
