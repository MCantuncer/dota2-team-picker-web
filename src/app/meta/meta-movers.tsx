import Image from "next/image";
import { change, signed, type HeroRate, type Measure } from "@/lib/meta";
import type { MetaHero } from "./meta-board";

/** A shared scale for both dots of every row: 2 point win rate ticks, or 5 point pick rate ticks from 0. */
function scaleOf(rows: HeroRate[], measure: Measure): { lo: number; hi: number; ticks: number[] } {
  const values = rows.flatMap((h) => (measure === "win" ? [h.win, h.baseWin ?? h.win] : [h.pick, h.basePick ?? h.pick]));
  const step = measure === "win" ? 2 : 5;
  const lo = measure === "win" ? Math.floor(Math.min(...values) / step) * step : 0;
  const hi = Math.max(lo + step, Math.ceil(Math.max(...values) / step) * step);
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  return { lo, hi, ticks };
}

/**
 * Who moved most since the patch before: a hollow dot for the old patch and a filled one for this patch on one
 * scale with ticks, the line between them in the move's colour, and the change in points at the end.
 */
export function MoverRows({
  rows,
  measure,
  rising,
  heroes,
  oldPatch,
  newPatch,
}: {
  rows: HeroRate[];
  measure: Measure;
  rising: boolean;
  heroes: Map<number, MetaHero>;
  oldPatch: string;
  newPatch: string;
}) {
  if (rows.length === 0) return <p className="text-muted">No hero moved this way yet.</p>;
  const { lo, hi, ticks } = scaleOf(rows, measure);
  const at = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const labels = ticks.filter((_, i) => ticks.length <= 6 || i % 2 === 0);
  const color = rising ? "bg-radiant" : "bg-dire";
  const grid = "grid grid-cols-[4rem_minmax(0,1fr)_3.5rem] items-center gap-x-3.5 gap-y-1 sm:grid-cols-[5rem_minmax(8rem,10rem)_minmax(0,1fr)_4rem]";

  return (
    <div className="grid gap-3">
      <ul className="grid gap-3">
        {rows.map((h) => {
          const hero = heroes.get(h.id);
          const now = measure === "win" ? h.win : h.pick;
          const before = (measure === "win" ? h.baseWin : h.basePick) ?? now;
          const delta = change(h, measure) ?? 0;
          if (!hero) return null;
          return (
            <li key={h.id} className={grid}>
              <Image src={hero.image} alt="" width={80} height={45} className="aspect-video w-full rounded-md object-cover" />
              <span className="font-semibold leading-tight text-fg">{hero.name}</span>
              <span
                role="img"
                aria-label={`${hero.name}: ${before.toFixed(1)}% in ${oldPatch}, ${now.toFixed(1)}% in ${newPatch}`}
                className="relative h-6 max-sm:col-span-3 max-sm:row-start-2"
              >
                <span className="absolute inset-x-0 top-[11px] h-0.5 bg-line-strong" />
                {ticks.map((t) => (
                  <span key={t} className="absolute inset-y-1 w-px bg-line-hover" style={{ left: `${at(t)}%` }} />
                ))}
                <span
                  className={`absolute top-2.5 h-1 rounded-full opacity-50 ${color}`}
                  style={{ left: `${Math.min(at(before), at(now))}%`, width: `${Math.abs(at(now) - at(before))}%` }}
                />
                <span
                  className="absolute top-[5px] size-3.5 -translate-x-1/2 rounded-full bg-bg ring-2 ring-inset ring-line-control"
                  style={{ left: `${at(before)}%` }}
                />
                <span className={`absolute top-[5px] size-3.5 -translate-x-1/2 rounded-full ${color}`} style={{ left: `${at(now)}%` }} />
              </span>
              <span className={`num text-right text-base max-sm:col-start-3 max-sm:row-start-1 ${rising ? "text-radiant" : "text-dire"}`}>
                {signed(delta)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className={grid} aria-hidden>
        <span className="max-sm:hidden" />
        <span className="max-sm:hidden" />
        <span className="relative h-4 text-xs text-subtle max-sm:col-span-3">
          {labels.map((t) => (
            <span key={t} className="num absolute -translate-x-1/2 text-xs font-normal" style={{ left: `${at(t)}%` }}>
              {t}%
            </span>
          ))}
        </span>
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-subtle" aria-hidden>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-bg ring-2 ring-inset ring-line-control" />
          {oldPatch}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${color}`} />
          {newPatch}
        </span>
      </p>
    </div>
  );
}
