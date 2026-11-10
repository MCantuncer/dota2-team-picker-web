import Image from "next/image";
import { joinedText } from "@/lib/admin-players";
import { listsText, type PoolCheck, type PoolSlip } from "@/lib/admin-pool-check";

/** Slips first, the number that should stay 0; then the lists it was counted from. */
export function CheckStrip({ check }: { check: PoolCheck }) {
  const cells = [
    { label: "Slips", value: check.slips, detail: "Should always be 0", tone: check.slips > 0 ? "text-danger" : "text-accent" },
    { label: "Pool Lists", value: check.poolLists, detail: "From My Heroes only", tone: "text-fg" },
    { label: "Played Lists", value: check.playedLists, detail: "My Heroes and heroes played 10+ times", tone: "text-fg" },
    { label: "Any Hero Lists", value: check.anyLists, detail: "No own heroes left to show", tone: "text-fg" },
    { label: "Older Lists", value: check.unknownLists, detail: "Saved without the rule", tone: "text-fg" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <dl className="card grid grid-cols-1 md:grid-cols-5">
        {cells.map((c) => (
          <div
            key={c.label}
            className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 border-line px-5 py-4 not-first:border-t md:flex-col md:items-start md:justify-start md:gap-1 md:px-6 md:py-5 md:not-first:border-l md:not-first:border-t-0"
          >
            <dt className="text-sm font-medium text-muted">{c.label}</dt>
            <dd className={`num text-3xl leading-tight tracking-tight md:text-4xl ${c.tone}`}>{c.value}</dd>
            <dd className="w-full text-xs text-subtle">{c.detail}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-subtle">
        {listsText(check.lists)} from {check.players === 1 ? "1 player" : `${check.players} players`}.
      </p>
    </div>
  );
}

const ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 md:grid-cols-[12rem_4rem_minmax(0,1fr)_8.5rem] md:gap-x-4";

/** Each slip: whose list, the position, the outside heroes it showed, and when. */
export function Slips({ slips, heroes, nowMs }: { slips: PoolSlip[]; heroes: { id: number; name: string; icon: string }[]; nowMs: number }) {
  if (slips.length === 0) {
    return <p className="card px-5 py-6 text-sm text-muted">No slips. Every Pool and Played list showed only the player&apos;s own heroes.</p>;
  }
  const byId = new Map(heroes.map((h) => [h.id, h]));
  return (
    <div className="card">
      <ul aria-label="Latest slips">
        {slips.map((s) => (
          <li key={`${s.draftId}-${s.userId}`} className={`${ROW} border-t border-line first:border-t-0`}>
            <span className="min-w-0 font-medium break-words text-fg">{s.name}</span>
            <span className="num col-start-2 row-start-1 justify-self-end text-sm text-muted md:justify-self-start">
              Pos {s.position}
            </span>
            <span className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm md:col-span-1">
              <span className="text-muted">
                {s.outside.length} of {s.heroes.length} outside:
              </span>
              {s.outside.map((id) => {
                const hero = byId.get(id);
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 font-medium text-fg">
                    {hero && <Image src={hero.icon} alt="" width={24} height={24} unoptimized className="h-6 w-6 shrink-0 rounded-sm bg-raised" />}
                    {hero?.name ?? `Hero ${id}`}
                  </span>
                );
              })}
            </span>
            <span className="num col-span-2 text-xs text-subtle md:col-span-1 md:justify-self-end md:text-sm">{joinedText(s.at, nowMs)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
