import Image from "next/image";
import { useId } from "react";
import { type ItemFork, MIN_GROUP } from "@/lib/item-forks";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

/**
 * If a key item is late (the approved Your Game mockup, Can 2026-11-12), inside that item's detail on the Build
 * Path: one line when nearly every win had it on time, or two lanes splitting at its late minute, each sized by
 * its share of the wins. A late lane with a common road lists what those wins bought next.
 */
export function ForkBlock({ fork }: { fork: ItemFork }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h4 id={id} className="text-sm font-semibold text-fg">
          If It Is Late
        </h4>
        <span className="text-xs text-subtle">High-rank wins this patch. Wins only: what winners did, not proof it wins.</span>
      </div>
      {fork.split ? (
        <Split fork={fork} />
      ) : (
        <p className="text-sm text-muted">
          <span className="num">
            {fork.onTime} of {fork.running}
          </span>{" "}
          wins had {fork.name} by <span className="num">{fork.late}</span> min, so late is rare.
        </p>
      )}
    </div>
  );
}

function Split({ fork }: { fork: ItemFork }) {
  const road = fork.road === "own";
  return (
    <ul aria-label={`${fork.name} on time or late`} className="flex flex-col gap-2.5">
      <Lane label={`By ${fork.late} Min`} games={fork.onTime} of={fork.running} tone="on">
        <p className="text-sm text-muted">On time in these wins.</p>
      </Lane>
      <Lane label={`After ${fork.late} Min`} games={fork.lateGames} of={fork.running} tone={road ? "road" : "none"}>
        {road && (
          <ul aria-label="What these wins bought next" className="flex flex-wrap gap-x-5 gap-y-2.5">
            {fork.steps.map((s) => (
              <li key={s.itemId} className="flex min-w-0 items-center gap-2.5">
                {s.img ? <ItemArt img={s.img} /> : <span aria-hidden className="h-8 w-11 shrink-0 rounded-md border border-dashed border-line-strong" />}
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-fg">{s.name}</span>
                  <span className="num text-xs text-subtle">
                    Usually {s.minute} min, {s.games} wins
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">{lateLine(fork)}</p>
      </Lane>
    </ul>
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

// Neutral tones: neither lane is the right one, so neither is green or red.
const TONES = {
  on: { edge: "border-accent", fill: "bg-accent" },
  road: { edge: "border-muted", fill: "bg-muted" },
  none: { edge: "border-subtle", fill: "bg-subtle" },
} as const;

function Lane({ label, games, of, tone, children }: { label: string; games: number; of: number; tone: keyof typeof TONES; children: React.ReactNode }) {
  const t = TONES[tone];
  const width = of > 0 ? Math.round((games / of) * 100) : 0;
  return (
    <li
      className={`flex flex-col gap-2.5 rounded-lg border-l-2 bg-raised p-3 ${t.edge}`}
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
