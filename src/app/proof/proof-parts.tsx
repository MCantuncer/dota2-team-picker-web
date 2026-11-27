import Image from "next/image";
import type { ReactNode } from "react";
import { OpenDotaButton } from "@/components/external-button";
import { laneCutStyle } from "@/components/hero-frame";
import { Icon, type IconName } from "@/components/icon";
import { PositionLabel } from "@/components/position-label";
import { RankMedal } from "@/components/rank-medal";
import type { Hero } from "@/lib/heroes";
import {
  percent,
  RANK_GROUP_MEDALS,
  ROUND_NAMES,
  shortDay,
  signedPoints,
  type LadderRow,
  type Lift,
  type Proof,
  type ProofExample,
} from "@/lib/proof";

/** Where `value` sits between `lo` and `hi`, as a CSS percentage, clamped to the track. */
function at(value: number, lo: number, hi: number): string {
  return `${(((Math.min(Math.max(value, lo), hi) - lo) / (hi - lo)) * 100).toFixed(2)}%`;
}

/** A scale from `lo` to `hi` that covers every value, widened to whole steps of `step`. */
export function scaleFor(values: number[], lo: number, hi: number, step: number): [number, number] {
  const min = Math.min(lo, ...values);
  const max = Math.max(hi, ...values);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/**
 * One value on a fixed scale with its 95% range: a round dot on a shaded band, and a zero mark when the scale crosses
 * zero. The same track is used for every range on the page, so it reads the same everywhere.
 */
export function Track({
  value,
  low,
  high,
  lo,
  hi,
  isMain = false,
}: {
  value: number;
  low: number;
  high: number;
  lo: number;
  hi: number;
  isMain?: boolean;
}) {
  const color = isMain ? "var(--accent)" : "var(--subtle)";
  const from = at(low, lo, hi);
  return (
    <div aria-hidden className="relative h-7 min-w-28">
      <span className="absolute inset-x-0 top-3 h-1 rounded-full bg-line-strong" />
      {lo < 0 && hi > 0 && (
        <span
          className="absolute top-0.5 bottom-0.5 w-0.5 -translate-x-1/2 bg-line-hover"
          style={{ left: at(0, lo, hi) }}
        />
      )}
      <span
        className="absolute top-2 h-3 rounded-full opacity-35"
        style={{
          left: from,
          width: `calc(${at(high, lo, hi)} - ${from})`,
          background: color,
        }}
      />
      <span
        className="absolute top-1.5 size-3.5 -translate-x-1/2 rounded-full shadow-[0_0_0_3px_var(--surface)]"
        style={{ left: at(value, lo, hi), background: color }}
      />
    </div>
  );
}

/** The tick labels under a track. */
export function Scale({
  lo,
  hi,
  ticks,
  format,
}: {
  lo: number;
  hi: number;
  ticks: number[];
  format: (t: number) => string;
}) {
  return (
    <div aria-hidden className="relative h-5 min-w-28">
      {ticks.map((t) => (
        <span key={t} className="absolute -translate-x-1/2 text-xs text-subtle" style={{ left: at(t, lo, hi) }}>
          {format(t)}
        </span>
      ))}
    </div>
  );
}

const ticksOf = (lo: number, hi: number, step: number) =>
  Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);

/**
 * The verdict in the logo's shape: the mid lane splits the square into our top 3 (copper, top left) and every other
 * pick (bottom right), and the copper dot on the lane holds the difference.
 */
export function LaneFrame({ lift }: { lift: Lift }) {
  return (
    <figure className="relative mx-auto aspect-square w-full max-w-80 overflow-hidden rounded-[1.375rem] border-2 border-line-hover">
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <polygon points="0,0 100,0 0,100" fill="var(--accent-tint)" />
        <polygon points="100,0 100,100 0,100" fill="var(--raised)" />
        <line
          x1="0"
          y1="100"
          x2="100"
          y2="0"
          stroke="var(--line-hover)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute top-5 left-5 grid gap-1">
        <span className="text-xl font-semibold tabular-nums text-accent">{percent(lift.top3.won)}</span>
        <span className="text-sm text-muted">
          Took One of
          <br />
          Our Top 3
        </span>
      </div>
      <div className="absolute right-5 bottom-5 grid gap-1 text-right">
        <span className="text-xl font-semibold tabular-nums text-fg">{percent(lift.other.won)}</span>
        <span className="text-sm text-muted">
          Took Any
          <br />
          Other Hero
        </span>
      </div>
      <figcaption className="absolute top-1/2 left-1/2 grid size-24 -translate-1/2 place-content-center rounded-full bg-accent text-center text-on-accent shadow-[0_0_0_6px_var(--bg)]">
        <span className="text-xl leading-none font-semibold tabular-nums">
          {lift.lift === null ? "n/a" : signedPoints(lift.lift)}
        </span>
        <span className="text-xs font-semibold">Points</span>
      </figcaption>
    </figure>
  );
}

const RIVAL_ROWS = [
  { key: "engine", name: "Our Picks", help: "Our top 3 for that draft" },
  {
    key: "meta",
    name: "Highest Win Rate",
    help: "Top 3 win rate heroes for the role",
  },
  {
    key: "popular",
    name: "Most Played",
    help: "Top 3 most played heroes for the role",
  },
] as const;

/** Our lift next to the two simple rules, each with its range on one shared scale. */
export function RivalRows({ rivals }: { rivals: Proof["rivals"] }) {
  const ranges = RIVAL_ROWS.flatMap(({ key }) => {
    const { lift, margin } = rivals[key];
    return lift === null || margin === null ? [] : [(lift - margin) * 100, (lift + margin) * 100];
  });
  const [lo, hi] = scaleFor(ranges, -2, 10, 5);
  return (
    <div className="grid gap-4">
      {RIVAL_ROWS.map(({ key, name, help }) => {
        const { lift, margin } = rivals[key];
        return (
          <div
            key={key}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[12rem_1fr_4.5rem]"
          >
            <span className="grid">
              <span className="font-semibold">{name}</span>
              <span className="text-sm text-subtle">{help}</span>
            </span>
            {lift !== null && margin !== null ? (
              <>
                <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                  <Track
                    value={lift * 100}
                    low={(lift - margin) * 100}
                    high={(lift + margin) * 100}
                    lo={lo}
                    hi={hi}
                    isMain={key === "engine"}
                  />
                </div>
                <span
                  className={`text-right text-lg font-semibold tabular-nums ${key === "engine" ? "text-accent" : "text-fg"}`}
                >
                  {signedPoints(lift)}
                </span>
              </>
            ) : (
              <span className="text-right text-subtle">Too few picks</span>
            )}
          </div>
        );
      })}
      <div className="hidden grid-cols-[12rem_1fr_4.5rem] gap-x-4 sm:grid">
        <span />
        <Scale lo={lo} hi={hi} ticks={ticksOf(lo, hi, 5)} format={(t) => (t > 0 ? `+${t}` : t < 0 ? `−${-t}` : "0")} />
      </div>
      <p className="text-sm text-subtle">
        The dot is the gain in win rate points over every other pick, the shaded part its range.
      </p>
    </div>
  );
}

/**
 * Our lift over all games so far, day by day, with its range as a band that narrows as games add up. The plot is a
 * stretched SVG with hairline strokes; the labels and the last dot are HTML, so text keeps its size at any width.
 */
export function RunningLine({ running }: { running: Proof["running"] }) {
  if (running.length < 2)
    return <p className="text-sm text-subtle">The line starts once a few more days of games are in.</p>;
  const [lo, hi] = scaleFor(
    running.flatMap((p) => [(p.lift - p.margin) * 100, (p.lift + p.margin) * 100]),
    0,
    10,
    5,
  );
  const x = (i: number) => (i / (running.length - 1)) * 100;
  const y = (v: number) => ((hi - v) / (hi - lo)) * 100;
  const band = [
    ...running.map((p, i) => `${x(i)},${y((p.lift + p.margin) * 100)}`),
    ...running
      .map((_, i) => running.length - 1 - i)
      .map((i) => `${x(i)},${y((running[i]!.lift - running[i]!.margin) * 100)}`),
  ].join(" ");
  const last = running.at(-1)!;
  const label = (t: number) => (t > 0 ? `+${t}` : t < 0 ? `\u2212${-t}` : "0");
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[2rem_1fr] gap-x-2">
        <div aria-hidden className="relative h-44">
          {ticksOf(lo, hi, 5).map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 text-xs text-subtle" style={{ top: `${y(t)}%` }}>
              {label(t)}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`Our gain over all games so far, day by day: ${signedPoints(last.lift)} points today`}
          className="relative h-44"
        >
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {ticksOf(lo, hi, 5).map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--line-hover)" : "var(--line-strong)"}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <polygon points={band} fill="var(--accent)" opacity="0.18" />
            <polyline
              points={running.map((p, i) => `${x(i)},${y(p.lift * 100)}`).join(" ")}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {running.map((p, i) => (
            <span
              key={p.day}
              title={`${shortDay(p.day)}: ${signedPoints(p.lift)} points over ${p.games.toLocaleString("en-US")} games`}
              className="absolute size-6 -translate-1/2 rounded-full"
              style={{ left: `${x(i)}%`, top: `${y(p.lift * 100)}%` }}
            >
              {i === running.length - 1 && (
                <span className="absolute inset-1.5 rounded-full bg-accent shadow-[0_0_0_3px_var(--surface)]" />
              )}
            </span>
          ))}
        </div>
        <div aria-hidden className="col-start-2 mt-2 flex justify-between text-xs text-subtle">
          <span>{shortDay(running[0]!.day)}</span>
          <span>{shortDay(last.day)}</span>
        </div>
      </div>
      <p className="text-sm text-subtle">
        All games so far on each day. Today {signedPoints(last.lift)}, from {signedPoints(last.lift - last.margin)} to{" "}
        {signedPoints(last.lift + last.margin)}.
      </p>
    </div>
  );
}

/**
 * One tile: a label on top, our gain and its give or take under it. `isRowWhenNarrow` lays it out as a row (label
 * left, numbers right) below 52rem, so a list of five never leaves one tile alone on a narrow screen.
 */
function LiftTile({
  label,
  lift,
  isAccent,
  isRowWhenNarrow = false,
}: {
  label: ReactNode;
  lift: Lift;
  isAccent?: boolean;
  isRowWhenNarrow?: boolean;
}) {
  const row = isRowWhenNarrow;
  return (
    <div
      className={`grid content-start gap-2 rounded-lg border border-line-strong bg-raised p-3 ${
        row
          ? "grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 min-[52rem]:grid-cols-1 min-[52rem]:justify-items-start"
          : "justify-items-start"
      }`}
    >
      <span className={row ? "row-span-2 min-[52rem]:row-span-1" : undefined}>{label}</span>
      {lift.lift === null || lift.margin === null ? (
        <span className="text-sm text-subtle">Too few picks</span>
      ) : (
        <>
          <span
            className={`text-xl leading-none font-semibold tabular-nums ${isAccent ? "text-accent" : "text-fg"} ${row ? "justify-self-end min-[52rem]:justify-self-start" : ""}`}
          >
            {signedPoints(lift.lift)}
          </span>
          <span className={`text-sm text-subtle ${row ? "justify-self-end min-[52rem]:justify-self-start" : ""}`}>
            Give or take {(lift.margin * 100).toFixed(1)}
          </span>
        </>
      )}
    </div>
  );
}

/** Our gain at each rank group (medals only, their names are the medals' labels) and in each role. */
export function RankRoleTiles({ byRank, byRole }: { byRank: Proof["byRank"]; byRole: Proof["byRole"] }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(RANK_GROUP_MEDALS).map(([group, medals]) =>
          byRank[group] ? (
            <LiftTile
              key={group}
              isAccent
              lift={byRank[group]}
              label={
                <span className="flex items-center gap-1">
                  {medals.map((m) => (
                    <RankMedal key={m} rankTier={m * 10} size={60} />
                  ))}
                </span>
              }
            />
          ) : null,
        )}
      </div>
      {/* All five roles share one row from a mid-size screen up, with the icon over the name so the tiles stay narrow;
          below that each role is a row, so no tile is ever left alone. */}
      <div className="grid gap-3 min-[52rem]:grid-cols-5">
        {[1, 2, 3, 4, 5].map((p) =>
          byRole[p] ? (
            <LiftTile
              key={p}
              isRowWhenNarrow
              lift={byRole[p]}
              label={
                <PositionLabel
                  position={p}
                  size={20}
                  className="font-semibold min-[52rem]:flex-col min-[52rem]:items-start min-[52rem]:gap-2"
                  iconClassName="shrink-0 text-accent"
                />
              }
            />
          ) : null,
        )}
      </div>
    </div>
  );
}

/** The side a ladder row is seen from, as a small square in that side's colour. */
function SideMark({ side }: { side: LadderRow["side"] }) {
  return <span className={`size-3 shrink-0 rounded-xs ${side === "Radiant" ? "bg-radiant" : "bg-dire"}`} />;
}

/**
 * One row per win range band on a shared percent scale: the shaded box is the range we show for the favoured side,
 * the dot how often that side really won in newer games. The side is a coloured square; the numbers are on the scale,
 * and each row's sentence is for screen readers and the hover tooltip.
 */
export function Ladder({ rows }: { rows: LadderRow[] }) {
  const [lo, hi] = scaleFor(
    rows.flatMap((r) => [r.low * 100, r.high * 100, r.won * 100]),
    50,
    60,
    5,
  );
  const ticks = ticksOf(lo, hi, 5);
  const sentence = (r: LadderRow) =>
    `${r.side}: we showed ${Math.round(r.low * 100)}% to ${Math.round(r.high * 100)}%, ` +
    `and that side won ${percent(r.won)} of ${r.games.toLocaleString("en-US")} newer games`;
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm text-muted sm:flex sm:flex-wrap sm:items-center">
        <span className="flex items-center gap-2">
          <span className="h-3 w-6 rounded-full bg-accent opacity-35" />
          We Showed
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-full bg-accent" />
          They Won
        </span>
        <span className="flex items-center gap-2">
          <SideMark side="Radiant" />
          Radiant
        </span>
        <span className="flex items-center gap-2">
          <SideMark side="Dire" />
          Dire
        </span>
      </div>
      <div className="grid gap-1">
        <div className="relative">
          {/* Grid lines at every 5%, behind the rows, starting after the side squares. */}
          <div aria-hidden className="absolute inset-y-0 right-0 left-6">
            {ticks.map((t) => (
              <span
                key={t}
                className={`absolute inset-y-0 w-px ${t === 50 ? "bg-line-hover" : "bg-line"}`}
                style={{ left: at(t, lo, hi) }}
              />
            ))}
          </div>
          <ul className="relative grid gap-1.5">
            {rows.map((r) => (
              <li key={`${r.side}${r.low}`} title={sentence(r)} className="flex items-center gap-3">
                <SideMark side={r.side} />
                <span className="sr-only">{sentence(r)}</span>
                <div className="min-w-0 flex-1">
                  <Track value={r.won * 100} low={r.low * 100} high={r.high * 100} lo={lo} hi={hi} isMain />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="pl-6">
          <Scale lo={lo} hi={hi} ticks={ticks} format={(t) => `${t}%`} />
        </div>
      </div>
    </div>
  );
}

const STEPS: { icon: IconName; title: string; text: (p: Proof) => string }[] = [
  {
    icon: "swords",
    title: "Real Ranked Games",
    text: (p) => `${p.games.toLocaleString("en-US")} public All Pick games, played after our hero data was built.`,
  },
  {
    icon: "clock",
    title: "Only What They Saw",
    text: () => "At each pick the engine gets the bans, the earlier picks and the player's role.",
  },
  {
    icon: "star",
    title: "Our Top 3",
    text: () => "Was the hero they took one of our top 3?",
  },
  {
    icon: "trendUp",
    title: "Did They Win",
    text: () => "Compared with every other pick, and with two simple rules.",
  },
];

/** The method in four steps. */
export function FourSteps({ proof }: { proof: Proof }) {
  return (
    <ol className="grid grid-cols-1 gap-3 min-[26rem]:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s) => (
        <li key={s.title} className="grid content-start gap-2.5 rounded-lg border border-line-strong bg-raised p-3">
          <span className="text-accent [&_svg]:size-7">
            <Icon name={s.icon} />
          </span>
          <span className="font-semibold">{s.title}</span>
          <span className="text-sm text-subtle">{s.text(proof)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Real games where the player took our first choice, newest first, losses included. */
export function GameRows({ examples, heroes }: { examples: ProofExample[]; heroes: Map<number, Hero> }) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {examples.map((g) => {
        const hero = heroes.get(g.heroId);
        return (
          <li
            key={`${g.matchId}-${g.heroId}`}
            className="grid grid-cols-[7rem_1fr] items-center gap-x-4 gap-y-3 rounded-lg border border-line-strong bg-raised p-3 [grid-template-areas:'art_name'_'art_result'_'meta_meta'] sm:grid-cols-[10rem_1fr_auto] sm:gap-y-1.5 sm:[grid-template-areas:'art_name_result'_'art_meta_meta']"
          >
            {hero ? (
              <span className="lane-cut aspect-video w-full [grid-area:art]" style={laneCutStyle(90)}>
                <Image src={hero.image} alt="" width={256} height={144} className="size-full object-cover" />
              </span>
            ) : (
              <span className="aspect-video w-full rounded-md border border-dashed border-line-hover [grid-area:art]" />
            )}
            <span className="self-end text-lg font-semibold [grid-area:name]">{hero?.name ?? "Unknown Hero"}</span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 self-start text-sm text-muted [grid-area:meta]">
              <PositionLabel position={g.position} size={20} className="gap-2" />
              {g.rankTier ? <RankMedal rankTier={g.rankTier} size={40} /> : null}
              <span>{ROUND_NAMES[g.round]}</span>
              <span>{shortDay(new Date(g.startTime * 1000).toISOString().slice(0, 10))}</span>
            </div>
            <div className="flex items-center gap-2 self-start [grid-area:result] sm:self-end">
              <span
                className={`rounded-md px-3 py-1 text-base font-semibold ${g.won ? "bg-radiant-tint text-radiant" : "bg-dire-tint text-dire"}`}
              >
                {g.won ? "Won" : "Lost"}
              </span>
              <OpenDotaButton matchId={g.matchId} iconOnly />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
