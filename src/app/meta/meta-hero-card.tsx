import Image from "next/image";
import { PositionLabel } from "@/components/position-label";
import { RankMedal } from "@/components/rank-medal";
import { change, dayLabel, RANK_GROUPS, signed, type HeroRate, type MetaDay, type MetaExtras, type RankSlice } from "@/lib/meta";
import type { MetaHero } from "./meta-board";
import { BuildPanel, MatchupsPanel, type ItemArt } from "./meta-hero-extras";
import { MetaLaneTactics } from "./meta-lane-tactics";

function Stat({ label, value, delta, note, since }: { label: string; value: string; delta?: number | null; note?: string; since?: string }) {
  return (
    <div className="grid min-w-0 content-start gap-0.5 rounded-lg bg-surface px-3 py-3 ring-1 ring-inset ring-line-strong sm:px-3.5">
      <span className="text-sm text-subtle">{label}</span>
      <span className="text-xl font-semibold leading-tight tabular-nums text-fg sm:text-[1.75rem]">{value}</span>
      {delta !== undefined && delta !== null ? (
        <span className={`text-xs sm:text-sm ${delta >= 0 ? "text-radiant" : "text-dire"}`}>{signed(delta)} vs {since}</span>
      ) : (
        <span className="text-xs text-subtle sm:text-sm">{note ?? "New this patch"}</span>
      )}
    </div>
  );
}

/** Win rate per day on a chart with ticks, the patch before's win rate dashed. */
function DayChart({ rate, days, W, H }: { rate: HeroRate; days: MetaDay[]; W: number; H: number }) {
  const M = { l: 44, r: 16, t: 16, b: 30 };
  const pad = W > 400 ? 40 : 20;
  const points = rate.days.map((d, i) => [i, d] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const values = [...points.map((p) => p[1]), rate.baseWin ?? 50, 50];
  const lo = Math.floor(Math.min(...values) - 1);
  const hi = Math.ceil(Math.max(...values) + 1);
  const step = hi - lo > 8 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  const x = (i: number) => M.l + pad + (days.length > 1 ? (i * (W - M.l - M.r - 2 * pad)) / (days.length - 1) : (W - M.l - M.r - 2 * pad) / 2);
  const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  // Label at most 7 days, evenly spread, so they never collide.
  const every = Math.ceil(days.length / (W > 400 ? 7 : 4));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Win rate by day: ${points.map((p) => `${dayLabel(days[p[0]]!)} ${p[1].toFixed(1)}%`).join(", ")}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-line" />
          <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize={12} className="fill-subtle">
            {t}%
          </text>
        </g>
      ))}
      {rate.baseWin !== null && (
        <g>
          <line x1={M.l} x2={W - M.r} y1={y(rate.baseWin)} y2={y(rate.baseWin)} className="stroke-line-control" strokeDasharray="5 4" strokeWidth={1.5} />
          <text x={W - M.r} y={y(rate.baseWin) - 6} textAnchor="end" fontSize={12} className="fill-muted">
            Before: {rate.baseWin.toFixed(1)}%
          </text>
        </g>
      )}
      {points.length > 1 && <polyline points={points.map((p) => `${x(p[0])},${y(p[1])}`).join(" ")} fill="none" className="stroke-accent" strokeWidth={2.5} />}
      {points.map((p) => (
        <circle key={p[0]} cx={x(p[0])} cy={y(p[1])} r={5} className="fill-accent stroke-surface" strokeWidth={2} />
      ))}
      {days.map((d, i) =>
        i % every === 0 || i === days.length - 1 ? (
          <text key={d.index} x={x(i)} y={H - 8} textAnchor="middle" fontSize={12} className="fill-subtle">
            {dayLabel(d)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** One hero's win rate per rank group on a shared 40% to 60% scale. */
function RankRows({ byRank }: { byRank: (HeroRate | undefined)[] }) {
  const at = (v: number) => ((Math.min(60, Math.max(40, v)) - 40) / 20) * 100;
  const ticks = [40, 45, 50, 55, 60];
  const cols = "grid-cols-[2.75rem_minmax(0,1fr)_3.5rem] sm:grid-cols-[2.75rem_9.5rem_minmax(0,1fr)_3.5rem]";
  return (
    <div className="grid gap-3">
      <ul className="grid gap-3">
        {RANK_GROUPS.map((g, i) => {
          const r = byRank[i];
          return (
            <li key={g.slice} className={`grid items-center gap-3 ${cols}`}>
              <RankMedal rankTier={g.medal * 10} size={44} />
              <span className="text-sm text-muted max-sm:hidden">{g.name}</span>
              <span role="img" aria-label={`${g.name}: ${r ? `${r.win.toFixed(1)}%` : "too few games"}`} className="relative h-6">
                <span className="absolute inset-x-0 top-[11px] h-0.5 bg-line-strong" />
                {ticks.map((t) => (
                  <span key={t} className="absolute inset-y-1 w-px bg-line-hover" style={{ left: `${at(t)}%` }} />
                ))}
                {r && (
                  <span
                    className={`absolute top-[5px] size-3.5 -translate-x-1/2 rounded-full ${r.win >= 50 ? "bg-radiant" : "bg-dire"}`}
                    style={{ left: `${at(r.win)}%` }}
                  />
                )}
              </span>
              <span className="num text-right">{r ? `${r.win.toFixed(1)}%` : "Few"}</span>
            </li>
          );
        })}
      </ul>
      <div className={`grid gap-3 ${cols}`} aria-hidden>
        <span />
        <span className="max-sm:hidden" />
        <span className="relative h-4">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 text-xs text-subtle" style={{ left: `${at(t)}%` }}>
              {t}%
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/** The selected hero: art, roles and headline numbers, then its win rate by day and by rank. */
export function HeroCard({
  hero,
  rate,
  byRank,
  days,
  slice,
  oldPatch,
  patch,
  extras,
  role,
  art,
  heroes,
  onSelect,
}: {
  hero: MetaHero;
  rate: HeroRate;
  byRank: (HeroRate | undefined)[];
  days: MetaDay[];
  slice: RankSlice;
  oldPatch: string;
  patch: string;
  extras?: MetaExtras;
  role: number;
  art: ItemArt;
  heroes: Map<number, MetaHero>;
  onSelect: (id: number) => void;
}) {
  const group = RANK_GROUPS.find((g) => g.slice === slice);
  return (
    <section aria-label={hero.name} className="grid gap-4 rounded-xl border border-line bg-surface p-3 sm:p-6 lg:grid-cols-2">
      <div className="grid items-center gap-5 rounded-xl bg-raised p-4 ring-1 ring-inset ring-line-strong sm:grid-cols-[13rem_minmax(0,1fr)] sm:p-5 lg:col-span-2 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-x-6">
        <Image
          src={hero.image}
          alt=""
          width={480}
          height={270}
          className="aspect-video w-full rounded-lg object-cover lg:row-span-2"
        />
        <div className="grid gap-3 lg:self-end">
          <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-fg">{hero.name}</h2>
          {rate.roles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rate.roles.map((p) => (
                <span key={p} className="rounded-md bg-surface px-2.5 py-1.5 text-sm text-muted ring-1 ring-inset ring-line-strong">
                  <PositionLabel position={p} size={18} />
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:col-span-2 sm:gap-3 lg:col-span-1 lg:self-start">
          <Stat label="Win Rate" value={`${rate.win.toFixed(1)}%`} delta={change(rate, "win")} since={oldPatch} />
          <Stat label="Pick Rate" value={`${rate.pick.toFixed(1)}%`} delta={change(rate, "pick")} since={oldPatch} />
          <Stat label="Games" value={rate.games.toLocaleString("en-US")} note={group ? group.name : "This patch"} />
        </div>
      </div>
      <div className="grid min-w-0 content-start gap-4 rounded-xl bg-raised p-4 sm:p-5 ring-1 ring-inset ring-line-strong">
        <h3 className="font-semibold text-fg">Win Rate by Day</h3>
        <div className="max-sm:hidden">
          <DayChart rate={rate} days={days} W={520} H={220} />
        </div>
        <div className="sm:hidden">
          <DayChart rate={rate} days={days} W={280} H={190} />
        </div>
      </div>
      <div className="grid min-w-0 content-start gap-4 rounded-xl bg-raised p-4 sm:p-5 ring-1 ring-inset ring-line-strong">
        <h3 className="font-semibold text-fg">Win Rate by Rank</h3>
        <RankRows byRank={byRank} />
      </div>
      {extras && (
        <>
          <BuildPanel key={`${hero.id}-${role}`} hero={hero} extras={extras} role={role} art={art} patch={patch} />
          <MatchupsPanel hero={hero} extras={extras} heroes={heroes} onSelect={onSelect} />
        </>
      )}
      <MetaLaneTactics hero={hero} role={role} roles={rate.roles} heroes={heroes} />
    </section>
  );
}
