"use client";

import Image from "next/image";
import { useState } from "react";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/draft";
import { change, signed, type HeroRate } from "@/lib/meta";
import type { MetaHero } from "./meta-board";

type Sort = "name" | "pick" | "win" | "change";
/** Rows shown before Show All. */
const TOP = 10;

/** Win rate per day as a small line, with the patch before's win rate dashed behind it. */
export function DayLine({ rate, name }: { rate: HeroRate; name: string }) {
  const points = rate.days.map((d, i) => [i, d] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const W = 108;
  const H = 36;
  const values = [...points.map((p) => p[1]), rate.baseWin ?? 50, 50];
  const lo = Math.min(...values) - 1;
  const hi = Math.max(...values) + 1;
  const y = (v: number) => 4 + (1 - (v - lo) / (hi - lo)) * (H - 8);
  const x = (i: number) => 8 + (rate.days.length > 1 ? (i * (W - 16)) / (rate.days.length - 1) : (W - 16) / 2);
  const last = points.at(-1);
  const label = `${name} win rate by day: ${points.map((p) => `${p[1].toFixed(1)}%`).join(", ")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} className="block shrink-0">
      {rate.baseWin !== null && (
        <line x1={4} x2={W - 4} y1={y(rate.baseWin)} y2={y(rate.baseWin)} className="stroke-line-control" strokeDasharray="3 3" strokeWidth={1.5} />
      )}
      {points.length > 1 && (
        <polyline points={points.map((p) => `${x(p[0])},${y(p[1])}`).join(" ")} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" />
      )}
      {last && (
        <circle cx={x(last[0])} cy={y(last[1])} r={3.5} className={last[1] >= (rate.baseWin ?? 50) ? "fill-radiant" : "fill-dire"} />
      )}
    </svg>
  );
}

function Bar({ value, max, centered }: { value: number; max: number; centered?: boolean }) {
  // Win rate bars grow from the 50% mark, 6 times the points, so 46% to 54% spans most of the track.
  const from = centered ? Math.min(50, 50 + (value - 50) * 6) : 0;
  const width = centered ? Math.min(50, Math.abs(value - 50) * 6) : (value / max) * 100;
  const color = centered ? (value >= 50 ? "bg-radiant" : "bg-dire") : "bg-line-control";
  return (
    <span className="relative h-2 min-w-10 flex-1 rounded-full bg-line-strong">
      {centered && <span className="absolute -inset-y-1 left-1/2 w-px bg-line-control" />}
      <span className={`absolute inset-y-0 rounded-full ${color}`} style={{ left: `${from}%`, width: `${width}%` }} />
    </span>
  );
}

const SORTS: { key: Sort; label: string }[] = [
  { key: "name", label: "Hero" },
  { key: "pick", label: "Pick Rate" },
  { key: "win", label: "Win Rate" },
  { key: "change", label: "Change" },
];

/** Every hero in the filters as a sortable row: art, roles, pick bar, win bar from 50%, change, and the day line. */
export function HeroList({
  rates,
  heroes,
  selected,
  onSelect,
}: {
  rates: HeroRate[];
  heroes: Map<number, MetaHero>;
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  const [sort, setSort] = useState<Sort>("win");
  const [all, setAll] = useState(false);
  const name = (id: number) => heroes.get(id)?.name ?? "";
  const sorted = [...rates].sort((a, b) =>
    sort === "name" ? name(a.id).localeCompare(name(b.id)) : sort === "change" ? (change(b, "win") ?? -99) - (change(a, "win") ?? -99) : b[sort] - a[sort],
  );
  const maxPick = Math.max(1, ...rates.map((r) => r.pick));
  const cols =
    "grid-cols-[4.5rem_minmax(0,1fr)_6.75rem] sm:grid-cols-[5rem_minmax(7.5rem,1.2fr)_minmax(6.5rem,1fr)_minmax(6.5rem,1fr)_3.5rem_6.75rem] lg:grid-cols-[6rem_minmax(10rem,1.2fr)_5.5rem_minmax(7rem,1fr)_minmax(7rem,1fr)_4.5rem_6.75rem]";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 sm:hidden">
        <span className="text-sm text-subtle">Sort</span>
        <div className="seg h-auto" role="group" aria-label="Sort">
          {SORTS.map((s) => (
            <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => setSort(s.key)} className="seg-item min-h-9">
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`grid gap-x-3 px-3 text-sm text-subtle max-sm:hidden lg:gap-x-4 ${cols}`}>
        <span />
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={sort === s.key}
            onClick={() => setSort(s.key)}
            className={`w-fit rounded-md text-left hover:text-fg aria-pressed:text-accent ${s.key === "change" ? "justify-self-end" : ""} ${s.key === "pick" ? "lg:col-start-4" : ""}`}
          >
            {s.label}
          </button>
        ))}
        <span>By Day</span>
      </div>
      <ul className="grid gap-0.5">
        {sorted.slice(0, all ? sorted.length : TOP).map((r) => {
          const hero = heroes.get(r.id);
          if (!hero) return null;
          const delta = change(r, "win");
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                aria-pressed={selected === r.id}
                className={`grid w-full items-center gap-x-3 gap-y-2 lg:gap-x-4 rounded-lg p-3 text-left hover:bg-hover aria-pressed:bg-accent-tint ${cols}`}
              >
                <Image src={hero.image} alt="" width={96} height={54} className="aspect-video w-full rounded-md object-cover max-sm:row-span-3 max-sm:self-start" />
                <span className="text-base font-semibold leading-tight text-fg">{hero.name}</span>
                <span className="hidden gap-1.5 text-muted lg:flex">
                  {r.roles.map((p) => (
                    <span key={p} title={POSITION_NAMES[p - 1]}>
                      <PositionIcon position={p} size={20} />
                    </span>
                  ))}
                </span>
                <span className="flex items-center gap-2.5 max-sm:col-span-2">
                  <Bar value={r.pick} max={maxPick} />
                  <span className="num w-20 text-right sm:w-12">
                    <span className="mr-1.5 text-xs font-normal text-subtle sm:hidden">Pick</span>
                    {r.pick.toFixed(1)}%
                  </span>
                </span>
                <span className="flex items-center gap-2.5 max-sm:col-span-2">
                  <Bar value={r.win} max={100} centered />
                  <span className="num w-20 text-right sm:w-12">
                    <span className="mr-1.5 text-xs font-normal text-subtle sm:hidden">Win</span>
                    {r.win.toFixed(1)}%
                  </span>
                </span>
                <span className={`num text-right max-sm:hidden ${delta === null ? "text-subtle" : delta >= 0 ? "text-radiant" : "text-dire"}`}>
                  {delta === null ? "New" : signed(delta)}
                </span>
                <span className="max-sm:col-start-3 max-sm:row-start-1">
                  <DayLine rate={r} name={hero.name} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {sorted.length > TOP && (
        <div>
          <button type="button" className="btn btn-secondary" onClick={() => setAll(!all)}>
            {all ? `Show Top ${TOP}` : `Show All ${sorted.length} Heroes`}
          </button>
        </div>
      )}
    </div>
  );
}
