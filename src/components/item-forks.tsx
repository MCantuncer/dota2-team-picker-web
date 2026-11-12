import Image from "next/image";
import { useId } from "react";
import { type ItemFork, MIN_GROUP } from "@/lib/item-forks";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

/**
 * If a Key Item Is Late (the approved mockup, Can 2026-11-12): each key item as one line when nearly every win
 * had it on time, or as two lanes splitting at its late minute, each sized by its share of the wins. A late
 * lane with a common road lists it in green; without one it stays grey.
 */
export function ItemForks({ forks }: { forks: ItemFork[] }) {
  const id = useId();
  if (forks.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">
          If a Key Item Is Late
        </h3>
        <p className="max-w-[62ch] text-sm text-muted">
          High-rank wins this patch, split at the minute each item usually lands. Wins only: what winners did, not proof it wins.
        </p>
      </div>
      <div className="flex flex-col gap-6">
        {forks.map((f) => (f.split ? <Split key={f.itemId} fork={f} /> : <Single key={f.itemId} fork={f} />))}
      </div>
    </section>
  );
}

function Single({ fork }: { fork: ItemFork }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line p-3">
      <ItemArt img={fork.img} />
      <div className="min-w-0">
        <p className="font-semibold text-fg">
          {fork.name} <span className="num text-sm font-normal text-muted">by {fork.late} min</span>
        </p>
        <p className="text-sm text-muted">
          <span className="num">
            {fork.onTime} of {fork.running}
          </span>{" "}
          wins had it on time.
        </p>
      </div>
    </div>
  );
}

function Split({ fork }: { fork: ItemFork }) {
  const road = fork.road === "own";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <ItemArt img={fork.img} />
        <p className="font-semibold text-fg">
          {fork.name} <span className="num text-sm font-normal text-muted">splits at {fork.late} min</span>
        </p>
      </div>
      {/* The lanes hang off one line from the item, like a lane that splits in two. */}
      <ul
        aria-label={`${fork.name} on time or late`}
        className="relative ml-[1.375rem] flex flex-col gap-3 pl-6 before:absolute before:-top-3 before:bottom-7 before:left-0 before:w-px before:bg-line-strong"
      >
        <Lane label="On Time" games={fork.onTime} of={fork.running} tone="on">
          <p className="text-sm text-muted">
            {fork.name} by <span className="num">{fork.late}</span> min in these wins.
          </p>
        </Lane>
        <Lane label="Late" games={fork.lateGames} of={fork.running} tone={road ? "road" : "none"}>
          {road && (
            <ul aria-label="What these wins bought next" className="flex flex-wrap gap-x-4 gap-y-2.5">
              {fork.steps.map((s) => (
                <li key={s.itemId} className="flex min-w-0 items-center gap-2.5">
                  {s.img ? <ItemArt img={s.img} /> : <span aria-hidden className="h-8 w-11 shrink-0 rounded-md border border-dashed border-line-strong" />}
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-fg">{s.name}</span>
                    <span className="num text-xs text-subtle">
                      {s.minute} min, next in {s.games} wins
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted">{lateLine(fork)}</p>
        </Lane>
      </ul>
    </div>
  );
}

/** What the late lane says under its road, or in place of one. */
export function lateLine(fork: Pick<ItemFork, "name" | "late" | "lateGames" | "keyLater" | "road">): string {
  const later =
    fork.keyLater === undefined
      ? undefined
      : fork.keyLater === 0
        ? `None of the ${fork.lateGames} bought ${fork.name} after ${fork.late} min.`
        : `${fork.keyLater} of ${fork.lateGames} bought ${fork.name} after ${fork.late} min.`;
  const rest = {
    own: undefined,
    earlier: "They bought the build's earlier items, then no next item was common.",
    // The backend only looks for a path in MIN_GROUP late wins or more.
    none: fork.lateGames < MIN_GROUP ? "Too few late wins to show what they bought." : "No next item was common in these wins.",
  }[fork.road];
  return [later, rest].filter(Boolean).join(" ") || `No ${fork.name} by ${fork.late} min.`;
}

const TONES = {
  on: { edge: "border-accent", fill: "bg-accent" },
  road: { edge: "border-radiant", fill: "bg-radiant" },
  none: { edge: "border-subtle", fill: "bg-subtle" },
} as const;

function Lane({ label, games, of, tone, children }: { label: string; games: number; of: number; tone: keyof typeof TONES; children: React.ReactNode }) {
  const t = TONES[tone];
  const width = of > 0 ? Math.round((games / of) * 100) : 0;
  return (
    <li
      className={`relative flex flex-col gap-2.5 rounded-xl border-l-2 bg-raised p-3 ${t.edge} before:absolute before:top-[1.4rem] before:-left-6 before:h-px before:w-[1.375rem] before:bg-line-strong`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span className="font-semibold text-fg">{label}</span>
        <span className="flex min-w-44 max-w-72 flex-1 items-center gap-2.5">
          <span
            role="img"
            aria-label={`${games} of ${of} wins`}
            className="block h-1.5 flex-1 overflow-hidden rounded-md bg-line-strong"
          >
            <span className={`block h-full rounded-md ${t.fill}`} style={{ width: `${width}%` }} />
          </span>
          <span aria-hidden className="num whitespace-nowrap text-xs text-subtle">
            {games} of {of} wins
          </span>
        </span>
      </div>
      {children}
    </li>
  );
}

/** Item art beside its name, so it is decorative. */
function ItemArt({ img }: { img: string }) {
  return <Image src={ITEM_CDN + img} alt="" width={44} height={32} className="block h-8 w-11 shrink-0 rounded-md object-cover" />;
}
