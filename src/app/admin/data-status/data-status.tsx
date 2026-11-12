import Image from "next/image";
import { etaText, type FillStatus, percent, type Progress } from "@/lib/admin-data-status";
import { joinedText } from "@/lib/admin-players";
import { POSITION_NAMES } from "@/lib/party";

/** A labelled progress bar: done out of total, as a filled track. */
export function Bar({ done, total, label, thin = false }: { done: number; total: number; label: string; thin?: boolean }) {
  const p = percent({ done, total });
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${total}`}
      className={`w-full overflow-hidden rounded-md bg-raised ${thin ? "h-1.5" : "h-3"}`}
    >
      <div className={`h-full rounded-md ${p === 100 ? "bg-radiant" : "bg-accent"}`} style={{ width: `${p}%` }} />
    </div>
  );
}

/** When a job last ran and when it runs next, in Turkey time. */
export interface Timing {
  last?: string;
  next: number;
  nowMs: number;
}

/** One job's card: the share done, the count behind it, its bar, the pace and the run times. */
export function JobCard({
  title,
  unit,
  progress,
  facts,
  timing,
  children,
}: {
  title: string;
  unit: string;
  progress: Progress;
  facts: { label: string; value: string }[];
  timing: Timing;
  children?: React.ReactNode;
}) {
  const nextText = joinedText(new Date(timing.next).toISOString(), timing.nowMs);
  const cells = [
    ...facts,
    { label: "Pace", value: etaText(progress) },
    { label: "Last Data", value: timing.last ? joinedText(timing.last, timing.nowMs) : "None yet" },
    { label: "Next Run", value: nextText },
  ];
  return (
    <section aria-label={title} className="card flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="section-title">{title}</h2>
          <p className="text-sm text-muted">
            <span className="num text-fg">{progress.done.toLocaleString("en-US")}</span> of{" "}
            <span className="num">{progress.total.toLocaleString("en-US")}</span> {unit}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Bar done={progress.done} total={progress.total} label={title} />
          <span className="num w-14 shrink-0 text-right text-2xl leading-none font-semibold tracking-tight text-fg">{percent(progress)}%</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs font-medium text-subtle">{c.label}</dt>
            <dd className="text-sm text-fg">{c.value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}

/** The backfill plan by position: each planned hero with its fresh enemies out of every other hero. */
export function FillLanes({ fill, heroes }: { fill: FillStatus; heroes: Map<number, { name: string; icon: string }> }) {
  return (
    <div className="grid grid-cols-1 gap-6 border-t border-line pt-6 md:grid-cols-2 xl:grid-cols-5">
      {fill.positions.map((p) => (
        <section key={p.position} aria-label={`Pos ${p.position}`} className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-semibold text-fg">
                {POSITION_NAMES[p.position]}
              </h3>
              <span className="num text-sm text-muted">{percent(p)}%</span>
            </div>
            <Bar done={p.done} total={p.total} label={`Pos ${p.position}`} thin />
          </div>
          {p.heroes.length === 0 ? (
            <p className="rounded-md border border-dashed border-line-strong px-3 py-3 text-sm text-subtle">No heroes in the hero data yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {p.heroes.map((h) => {
                const hero = heroes.get(h.hero);
                const name = hero?.name ?? `Hero ${h.hero}`;
                return (
                  <li key={h.hero} className="flex items-center gap-3">
                    {hero ? (
                      <Image src={hero.icon} alt="" width={32} height={32} unoptimized className="h-8 w-8 shrink-0 rounded-md bg-raised" />
                    ) : (
                      <span aria-hidden className="h-8 w-8 shrink-0 rounded-md border border-dashed border-line-strong" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="text-sm font-medium break-words text-fg">{name}</span>
                      <div className="flex items-center gap-2">
                        <Bar done={h.fresh} total={h.total} label={`${name} Pos ${p.position}`} thin />
                        <span className="num shrink-0 text-xs text-subtle">
                          {h.fresh} of {h.total}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
