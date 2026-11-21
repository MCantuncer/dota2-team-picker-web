import Image from "next/image";
import { change, signed, type HeroRate, type Measure } from "@/lib/meta";
import type { MetaHero } from "./meta-board";

/** The scale both panels share: whole points either side of zero, an even number at least 4. */
export function moverScale(rows: HeroRate[], measure: Measure): number {
  const most = Math.max(0, ...rows.map((h) => Math.abs(change(h, measure) ?? 0)));
  return Math.max(4, Math.ceil(most / 2) * 2);
}

/**
 * Who moved most since the patch before: each change as a bar left or right of zero on one scale with ticks,
 * the rate before and now under the name, and the change in points at the end.
 */
export function MoverRows({
  rows,
  measure,
  rising,
  heroes,
  max,
  onSelect,
}: {
  rows: HeroRate[];
  measure: Measure;
  rising: boolean;
  heroes: Map<number, MetaHero>;
  /** Points at each end of the scale (see moverScale). */
  max: number;
  onSelect: (id: number) => void;
}) {
  if (rows.length === 0) return <p className="text-muted">No hero moved this way yet.</p>;
  const at = (v: number) => 50 + (Math.max(-max, Math.min(max, v)) / max) * 50;
  const ticks = [-max, -max / 2, 0, max / 2, max];
  const grid = "grid grid-cols-[4rem_minmax(0,1fr)_3.5rem] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[4.5rem_minmax(7rem,1fr)_minmax(0,1.3fr)_3.5rem]";

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2.5">
        {rows.map((h) => {
          const hero = heroes.get(h.id);
          const now = measure === "win" ? h.win : h.pick;
          const before = (measure === "win" ? h.baseWin : h.basePick) ?? now;
          const delta = change(h, measure) ?? 0;
          if (!hero) return null;
          return (
            <li key={h.id}>
              <button type="button" onClick={() => onSelect(h.id)} aria-label={`${hero.name}: ${before.toFixed(1)}% to ${now.toFixed(1)}%, ${signed(delta)} points. Open ${hero.name}`} className={`${grid} w-full rounded-lg p-1 text-left hover:bg-hover`}>
                <Image src={hero.image} alt="" width={80} height={45} className="aspect-video w-full rounded-md object-cover" />
                <span className="grid leading-tight">
                  <span className="text-[0.9375rem] text-fg">{hero.name}</span>
                  <span className="text-[0.8125rem] tabular-nums text-subtle">
                    {before.toFixed(1)}% to {now.toFixed(1)}%
                  </span>
                </span>
                <span aria-hidden className="relative h-3.5 max-sm:col-span-3 max-sm:row-start-2">
                  <span className="absolute inset-x-0 top-1.5 h-0.5 bg-line-strong" />
                  {ticks.map((t) => (
                    <span key={t} className="absolute -inset-y-0.5 w-px bg-line-hover" style={{ left: `${at(t)}%` }} />
                  ))}
                  <span
                    className={`absolute top-px h-3 rounded-[3px] ${rising ? "bg-radiant" : "bg-dire"}`}
                    style={{ left: `${Math.min(at(0), at(delta))}%`, width: `${Math.abs(at(delta) - at(0))}%` }}
                  />
                </span>
                <span className={`num text-right text-base max-sm:col-start-3 max-sm:row-start-1 ${rising ? "text-radiant" : "text-dire"}`}>{signed(delta)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={`${grid} px-1`} aria-hidden>
        <span className="max-sm:hidden" />
        <span className="max-sm:hidden" />
        <span className="relative h-4 max-sm:col-span-3">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 text-xs tabular-nums text-subtle" style={{ left: `${at(t)}%` }}>
              {t === 0 ? "0" : signed(t).replace(".0", "")}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
