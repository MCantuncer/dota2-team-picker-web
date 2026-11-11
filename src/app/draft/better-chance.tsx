import { Icon, type IconName } from "@/components/icon";
import { LaneMark } from "@/components/hero-frame";
import type { Side } from "@/lib/draft-reader/geometry";
import { type EdgeParts, edgeRange, favoredSide } from "@/lib/win";

/** One side of the draft as the band reads it: its edge in points, the edge's parts, and a checked win chance. */
export interface DraftOdds {
  edge: number;
  parts: EdgeParts;
  /** My team's chance to win (0 to 1), or null until the win model passes its check. */
  chance: number | null;
}

interface BetterChanceProps {
  /** The draft as picked now. */
  now: DraftOdds;
  /** The draft with the Team Plan's five; null without a plan. */
  plan: DraftOdds | null;
  /** Heroes picked on both sides. */
  picked: number;
  /** My team's side, which colours its half of the bar. */
  side: Side;
}

/** A signed score with one decimal and a real minus sign. */
const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}`;
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

const PARTS: [keyof EdgeParts, string, IconName][] = [
  ["rates", "Win Rates", "trend"],
  ["matchups", "Matchups", "swords"],
  ["synergy", "Synergy", "users"],
];

/**
 * Who Has the Better Chance: a tug of war between my team (left) and the enemy (right). The solid marker is the draft
 * now, the dashed one where the Team Plan's five would put it. Until the win model passes its check it shows the
 * draft edge in points and says so; with a checked model it shows the win chance. Beside it, the edge's three parts.
 * Hidden until a hero is picked on either side.
 */
export function BetterChance({ now, plan, picked, side }: BetterChanceProps) {
  if (picked === 0) return null;
  const hasChance = now.chance !== null;
  const show = (o: DraftOdds) => (o.chance !== null ? `${(o.chance * 100).toFixed(1)}%` : signed(o.edge));
  const range = edgeRange([now.edge, plan?.edge ?? 0]);
  // How far the bar leans to my team, from −1 (all the enemy's) to 1 (all mine).
  const lean = (o: DraftOdds) => clamp(o.chance !== null ? (o.chance - 0.5) * 2 : o.edge / range);
  const favored = favoredSide(now.edge, now.chance);
  const ours = side === "radiant" ? "radiant" : "dire";
  const theirs = side === "radiant" ? "dire" : "radiant";
  const text = { radiant: "text-radiant", dire: "text-dire" };
  const tint = { radiant: "bg-radiant-tint", dire: "bg-dire-tint" };
  const fill = { radiant: "bg-radiant-strong", dire: "bg-dire-strong" };
  const dot = { radiant: "bg-radiant", dire: "bg-dire" };
  const leader = favored === "ours" ? ours : favored === "theirs" ? theirs : null;
  const verdict = favored === "ours" ? "Your Team Favored" : favored === "theirs" ? "Enemy Favored" : "Even Draft";
  const leanNow = lean(now);
  const partRange = edgeRange([...Object.values(now.parts), ...Object.values(plan?.parts ?? {})], 5);
  const end = hasChance ? "100%" : `+${range}`;

  return (
    <section
      aria-labelledby="better-chance"
      className="grid rounded-xl bg-surface ring-1 ring-line ring-inset lg:grid-cols-[minmax(0,1fr)_22.5rem]"
    >
      <div className="flex min-w-0 flex-col gap-6 p-5 md:p-6 lg:pr-11">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <LaneMark className="text-fg" />
          <h2 id="better-chance" className="text-base font-semibold text-fg">
            Who Has the Better Chance
          </h2>
          <span className={`chip micro ml-auto font-semibold ${leader ? `${tint[leader]} ${text[leader]}` : ""}`}>
            {verdict}
          </span>
        </div>

        <div className="flex items-end justify-between gap-6">
          <span className="flex flex-col gap-0.5">
            <span className="micro text-subtle">
              {hasChance ? "Your Win Chance" : "Draft Edge Now"}, {picked} {picked === 1 ? "Pick" : "Picks"} In
            </span>
            <span className="flex items-baseline gap-2">
              <span
                data-testid="edge-now"
                className={`text-4xl font-semibold tracking-tight tabular-nums ${leader ? text[leader] : "text-fg"}`}
              >
                {show(now)}
              </span>
              {!hasChance && <span className="text-sm text-muted">Points</span>}
            </span>
          </span>
          {plan && (
            <span className="flex flex-col items-end gap-0.5 text-right">
              <span className="micro text-subtle">With the Plan</span>
              <span
                data-testid="edge-plan"
                className="text-2xl leading-10 font-semibold tracking-tight text-muted tabular-nums"
              >
                {show(plan)}
              </span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="micro flex items-center justify-between font-semibold">
            <span className={`flex items-center gap-1.5 ${text[ours]}`}>
              <span className={`size-2 rounded-xs ${dot[ours]}`} />
              Your Team
            </span>
            <span className={`flex items-center gap-1.5 ${text[theirs]}`}>
              Enemy
              <span className={`size-2 rounded-xs ${dot[theirs]}`} />
            </span>
          </div>
          <div
            role="img"
            aria-label={`${verdict}: ${show(now)} now${plan ? `, ${show(plan)} with the plan` : ""}`}
            className="relative flex h-3 rounded-xs"
          >
            <span className={`h-full flex-1 rounded-l-xs ${tint[ours]}`} />
            <span className={`h-full flex-1 rounded-r-xs ${tint[theirs]}`} />
            <span
              className={`absolute inset-y-0 ${leanNow >= 0 ? `right-1/2 ${fill[ours]}` : `left-1/2 ${fill[theirs]}`}`}
              style={{
                width: `${Math.abs(leanNow) * 50}%`,
                clipPath:
                  leanNow >= 0
                    ? "polygon(10px 0, 100% 0, 100% 100%, 0 100%)"
                    : "polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
              }}
            />
            <span className="absolute -top-1 -bottom-1 left-1/2 w-px bg-line-control" />
            {plan && (
              <span
                title="With the Plan"
                className="absolute top-1/2 size-3.5 -translate-1/2 rounded-full border-2 border-dashed border-fg/70 bg-surface"
                style={{ left: `${50 - lean(plan) * 50}%` }}
              />
            )}
            <span
              title="Now"
              className="absolute top-1/2 size-4 -translate-1/2 rounded-full bg-fg ring-3 ring-surface"
              style={{ left: `${50 - leanNow * 50}%` }}
            />
          </div>
          <div className="micro flex items-center justify-between text-subtle tabular-nums">
            <span>{end}</span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-fg" />
                Now
              </span>
              {plan && (
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full border-2 border-dashed border-fg/70" />
                  With the Plan
                </span>
              )}
            </span>
            <span>{end}</span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5 border-t border-line p-5 md:p-6 lg:border-t-0 lg:border-l">
        <h3 className="text-sm font-semibold text-fg">{hasChance ? "What Moves It" : "What Makes the Edge"}</h3>
        <ul className="grid grid-cols-3 gap-x-5 gap-y-4">
          {PARTS.map(([key, label, icon]) => {
            const part = now.parts[key];
            const partLean = clamp(part / partRange);
            const color = Math.abs(part) < 0.05 ? null : part >= 0 ? ours : theirs;
            return (
              <li key={key} className="flex min-w-0 flex-col gap-2">
                <span className="flex items-center gap-1.5 text-subtle">
                  <Icon name={icon} />
                  <span className="micro">{label}</span>
                </span>
                <span
                  className={`text-xl font-semibold tracking-tight tabular-nums ${color ? text[color] : "text-fg"}`}
                >
                  {signed(part)}
                </span>
                <span className="relative h-1.5 rounded-xs bg-raised" aria-hidden>
                  <span className="absolute -top-0.5 -bottom-0.5 left-1/2 w-px bg-line-control" />
                  <span
                    className={`absolute inset-y-0 rounded-xs ${partLean >= 0 ? "right-1/2" : "left-1/2"} ${dot[color ?? ours]}`}
                    style={{ width: `${Math.abs(partLean) * 50}%` }}
                  />
                </span>
                {plan && <span className="micro text-subtle tabular-nums">Plan {signed(plan.parts[key])}</span>}
              </li>
            );
          })}
        </ul>
        {!hasChance && (
          <p className="micro mt-auto text-subtle">
            A win percentage appears once the win model passes its check on recent games.
          </p>
        )}
      </div>
    </section>
  );
}
