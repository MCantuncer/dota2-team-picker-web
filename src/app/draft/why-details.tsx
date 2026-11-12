"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/draft";
import { RANK_NAMES } from "@/lib/engine/reasons";
import { NEED_SHORT } from "@/lib/engine/traits";
import type { RankBracket, ScoreBreakdown } from "@/lib/engine/types";
import type { PairWhy, PickWhy } from "@/lib/engine/why";
import { games, GROUP_NAMES, PART_NAMES, signed, spreadLabels, trackScale, type WhyItem, type WhyPart } from "@/lib/why-details";
import { Face, type PlanHeroOf } from "./team-plan";

/*
 * The why of one Why This Hero line or one Score Parts row, opened right under it: the numbers from this draft that
 * make its points, drawn rather than written (a track with its values on it, chips for the games behind them, a sum),
 * for a narrow column. A line shows its own hero or cause; a Score Parts row lists what its part adds up from.
 */

export interface WhyTarget {
  part: WhyPart;
  /** The hero the line names; null for a line about no hero or for a Score Parts row. */
  focus: number | null;
  item: WhyItem;
  /** A Score Parts row: show everything the part adds up from. */
  isWholePart: boolean;
}

const PART_ICONS: Record<WhyPart, IconName> = {
  counter: "swords",
  synergy: "users",
  meta: "trend",
  positionFit: "layers",
  teamNeeds: "plus",
  comfort: "heart",
  flex: "shuffle",
  pickSafety: "shield",
};

interface WhyOpenProps {
  target: WhyTarget;
  why: PickWhy;
  breakdown: ScoreBreakdown;
  score: number;
  heroName: string;
  hero: PlanHeroOf;
  owner?: string;
}

/** The open part under a line: its numbers, then where its points go in the score. */
export function WhyOpen({ target, why, breakdown, score, heroName, hero, owner }: WhyOpenProps) {
  const total = breakdown[target.part];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {target.isWholePart ? (
        <WholePart part={target.part} why={why} hero={hero} owner={owner} />
      ) : (
        <LineBody target={target} why={why} heroName={heroName} hero={hero} owner={owner} />
      )}
      {/* Where the points go: the part, then the score. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-3">
        {!target.isWholePart && (
          <>
            <Chip icon={PART_ICONS[target.part]}>
              {PART_NAMES[target.part]} <Num value={total} />
            </Chip>
            <span className="text-subtle" aria-hidden>
              <Icon name="chevronRight" />
            </span>
          </>
        )}
        <Chip>
          Score <Num value={score} />
        </Chip>
        <span className="micro ml-auto text-subtle">1 Point ≈ 1% Win Chance</span>
      </div>
    </div>
  );
}

function LineBody({ target, why, heroName, hero, owner }: { target: WhyTarget; why: PickWhy; heroName: string; hero: PlanHeroOf; owner?: string }) {
  const { part, focus, item } = target;
  if (part === "counter" || part === "synergy") {
    const pairs = part === "counter" ? why.counters : why.synergy;
    const p = pairs.find((x) => x.heroId === focus) ?? pairs[0];
    if (!p) return null;
    return <PairExplain p={p} kind={part} heroName={heroName} hero={hero} learned={why.weights[part]} />;
  }
  if (part === "meta") return <MetaExplain why={why} />;
  if (part === "positionFit") return <RoleFitExplain why={why} />;
  if (part === "teamNeeds") return <NeedsExplain why={why} />;
  if (part === "flex") return <FlexExplain why={why} />;
  if (part === "comfort") return <ComfortExplain why={why} item={item} owner={owner} />;
  return <SafetyExplain why={why} item={item} focus={focus} hero={hero} />;
}

const Num = ({ value }: { value: number }) => (
  <span className={`font-semibold tabular-nums ${value < 0 ? "text-dire" : "text-fg"}`}>{signed(value)}</span>
);

function Chip({ icon, children, isOn = false }: { icon?: IconName; children: ReactNode; isOn?: boolean }) {
  return (
    <span
      className={`micro flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 ${
        isOn ? "bg-surface text-fg ring-1 ring-line-control ring-inset" : "text-muted ring-1 ring-line ring-inset"
      }`}
    >
      {icon && (
        <span className="text-subtle">
          <Icon name={icon} />
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * The track: a strip of win rate with each value marked and labelled where it sits, Seen above and the rest below,
 * and the gap from the expected to the counted rate in green (more) or red (less).
 */
function Track({ expected, counted, seen, expectedLabel = "Expected" }: { expected: number; counted: number; seen: number | null; expectedLabel?: string }) {
  const { lo, hi } = trackScale([expected, counted, seen ?? Number.NaN]);
  const at = (v: number) => ((v * 100 - lo) / (hi - lo)) * 100;
  const isUp = counted >= expected;
  const [e, c] = spreadLabels([at(expected), at(counted)], 24);
  const label = (left: number, value: number, word: string, isStrong: boolean) => (
    <span
      className={`absolute flex flex-col tabular-nums ${left < 10 ? "items-start" : left > 90 ? "-translate-x-full items-end" : "-translate-x-1/2 items-center"}`}
      style={{ left: `${left}%` }}
    >
      <span className={`text-sm leading-5 ${isStrong ? "font-semibold text-fg" : "text-muted"}`}>{(value * 100).toFixed(1)}%</span>
      <span className="micro whitespace-nowrap text-subtle">{word}</span>
    </span>
  );
  return (
    <div className="flex flex-col gap-1.5 px-1.5" role="img" aria-label={`${expectedLabel} ${(expected * 100).toFixed(1)}%, counted ${(counted * 100).toFixed(1)}%${seen !== null ? `, seen ${(seen * 100).toFixed(1)}%` : ""}`}>
      {seen !== null && <span className="relative h-9">{label(Math.min(100, Math.max(0, at(seen))), seen, "Seen", false)}</span>}
      <span className="relative h-5">
        <span className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
        <span
          className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-xs ${isUp ? "bg-radiant" : "bg-dire"}`}
          style={{ left: `${Math.min(at(expected), at(counted))}%`, width: `${Math.abs(at(counted) - at(expected))}%` }}
        />
        {seen !== null && (
          <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-raised ring-1 ring-muted ring-inset" style={{ left: `${at(seen)}%` }} />
        )}
        <span className="absolute top-0 h-5 w-0.5 -translate-x-1/2 rounded-xs bg-muted" style={{ left: `${at(expected)}%` }} />
        <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" style={{ left: `${at(counted)}%` }} />
      </span>
      <span className="relative h-10">
        {label(e!, expected, expectedLabel, false)}
        {label(c!, counted, "Counted", true)}
      </span>
    </div>
  );
}

/** "+3.5 Edge × 1.5 Your Lane = +5.3": each number over what it is, the result last and strongest. */
function Equation({ terms, result, resultLabel = "Points" }: { terms: { value: string; label: string }[]; result: number; resultLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2" role="group" aria-label="How the points are made">
      {terms.map((t, i) => (
        <span key={t.label} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-subtle" aria-hidden>
              ×
            </span>
          )}
          <Term value={t.value} label={t.label} />
        </span>
      ))}
      {terms.length > 0 && (
        <span className="text-subtle" aria-hidden>
          =
        </span>
      )}
      <Term value={signed(result)} label={resultLabel} isResult isNegative={result < 0} />
    </div>
  );
}

function Term({ value, label, isResult = false, isNegative = false }: { value: string; label: string; isResult?: boolean; isNegative?: boolean }) {
  return (
    <span className={`flex min-w-14 flex-col items-center rounded-md px-2.5 py-1.5 ${isResult ? "bg-surface ring-1 ring-line-control ring-inset" : "ring-1 ring-line ring-inset"}`}>
      <span className={`text-sm font-semibold tabular-nums ${isNegative ? "text-dire" : "text-fg"}`}>{value}</span>
      <span className="micro whitespace-nowrap text-subtle">{label}</span>
    </span>
  );
}

const factor = (n: number) => `${Number(n.toFixed(2))}`;

function PairExplain({ p, kind, heroName, hero, learned }: { p: PairWhy; kind: "counter" | "synergy"; heroName: string; hero: PlanHeroOf; learned: number }) {
  if (p.hardGap !== null) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Face id={p.heroId} hero={hero} size={32} isEnemy />
        <Chip icon="alert">Hard Counter of {heroName}</Chip>
        <Equation terms={[]} result={p.points} resultLabel="At Least" />
      </div>
    );
  }
  const seen = p.seen && p.seen.games > 0 ? p.seen.wins / p.seen.games : null;
  const weightLabel = p.laneChance >= 0.5 ? "Your Lane" : p.laneChance > 0.05 ? "Maybe Your Lane" : p.isPartner ? "Lane Partner" : null;
  return (
    <>
      <Track expected={p.expected} counted={p.counted} seen={seen} />
      <div className="flex flex-wrap gap-2">
        <Chip icon={kind === "counter" ? "swords" : "users"}>
          <Face id={p.heroId} hero={hero} size={18} isEnemy={kind === "counter"} />
          <span className="text-fg tabular-nums">{p.seen ? games(p.seen.games) : 0}</span> Games
          {p.group ? ` at ${GROUP_NAMES[p.group]}` : ""}
        </Chip>
        {p.allRanks && (
          <Chip icon="layers">
            <span className="text-fg tabular-nums">{games(p.allRanks.games)}</span> at All Ranks
          </Chip>
        )}
      </div>
      <Equation
        terms={[
          { value: signed(p.edge), label: "Edge" },
          ...(weightLabel && p.weight !== 1 ? [{ value: factor(p.weight), label: weightLabel }] : []),
          ...(learned !== 1 ? [{ value: factor(learned), label: "Learned" }] : []),
        ]}
        result={p.points}
      />
    </>
  );
}

function MetaExplain({ why }: { why: PickWhy }) {
  const m = why.meta;
  const seen = m.seen.games > 0 ? m.seen.wins / m.seen.games : null;
  return (
    <>
      <Track expected={0.5} counted={m.rate} seen={seen} expectedLabel="Even" />
      <div className="flex flex-wrap gap-2">
        <Chip icon="trend">
          <span className="text-fg tabular-nums">{games(m.seen.games)}</span> Games
          {m.bracket ? ` at ${RANK_NAMES[(m.bracket as RankBracket) - 1]}` : " at All Ranks"}
        </Chip>
      </div>
      <Equation
        terms={[{ value: signed((m.rate - 0.5) * 100), label: "Above 50%" }, ...(why.weights.meta !== 1 ? [{ value: factor(why.weights.meta), label: "Learned" }] : [])]}
        result={m.points}
      />
    </>
  );
}

function RoleFitExplain({ why }: { why: PickWhy }) {
  const f = why.roleFit;
  const x = (v: number) => `${v * 100}%`;
  const share = Math.round(f.share * 100);
  return (
    <>
      <div className="flex flex-col gap-1.5 px-1.5" role="img" aria-label={`Played as ${POSITION_NAMES[f.position - 1]} in ${share}% of its games`}>
        <span className="relative h-9">
          <span className={`absolute flex flex-col ${f.share > 0.85 ? "-translate-x-full items-end" : "-translate-x-1/2 items-center"}`} style={{ left: x(f.share) }}>
            <span className="text-sm leading-5 font-semibold text-fg tabular-nums">{share}%</span>
            <span className="micro flex items-center gap-1 whitespace-nowrap text-subtle">
              <PositionIcon position={f.position} size={12} />
              {POSITION_NAMES[f.position - 1]}
            </span>
          </span>
        </span>
        <span className="relative h-3 overflow-hidden rounded-xs bg-surface">
          <span
            className="absolute inset-y-0"
            style={{
              left: x(f.zeroAt),
              width: `${(f.fullAt - f.zeroAt) * 100}%`,
              background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--radiant) 45%, transparent))",
            }}
          />
          <span className="absolute inset-y-0 right-0 bg-radiant/45" style={{ left: x(f.fullAt) }} />
          <span className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-xs bg-fg" style={{ left: x(Math.min(f.share, 0.99)) }} />
        </span>
        <span className="micro relative h-8 text-subtle tabular-nums">
          {(
            [
              [f.zeroAt, "0"],
              [f.fullAt, `Full ${signed(f.maxPoints)}`],
            ] as const
          ).map(([v, word]) => (
            <span key={word} className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: x(v) }}>
              <span>{Math.round(v * 100)}%</span>
              <span className="whitespace-nowrap">{word}</span>
            </span>
          ))}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!f.isMeasured && <Chip icon="alert">Guessed from Lanes</Chip>}
        <Equation terms={[]} result={f.points} />
      </div>
    </>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function NeedsExplain({ why }: { why: PickWhy }) {
  const t = why.teamNeeds;
  const covered = t.needs.filter((n) => n.isCovered).length;
  return (
    <>
      <ul className="grid grid-cols-2 gap-2">
        {t.needs.map((n) => (
          <li
            key={n.need}
            className={`flex h-10 items-center gap-2 rounded-md px-2.5 text-sm ${
              n.isCovered ? "bg-radiant-tint text-fg ring-1 ring-radiant/40 ring-inset" : "border border-dashed border-line-control text-subtle"
            }`}
          >
            <span className={n.isCovered ? "text-radiant" : "text-subtle"}>
              <Icon name={n.isCovered ? "check" : "minus"} />
            </span>
            {capital(NEED_SHORT[n.need].replace(/^an? /, ""))}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Equation
          terms={[
            { value: String(covered), label: covered === 1 ? "Need" : "Needs" },
            { value: signed(t.each), label: "Each" },
          ]}
          result={t.points}
        />
        {/* Each need counts more as the team fills up. */}
        <Chip icon="users">
          <span className="text-fg tabular-nums">{t.allies}</span> of 5 Picked
        </Chip>
      </div>
    </>
  );
}

function FlexExplain({ why }: { why: PickWhy }) {
  const f = why.flex;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {f.positions.map((p) => (
          <span key={p.position} className="flex h-10 items-center gap-2 rounded-md px-2.5 text-sm text-fg ring-1 ring-line ring-inset">
            <PositionIcon position={p.position} size={14} />
            {POSITION_NAMES[p.position - 1]}
            <span className="text-muted tabular-nums">{Math.round(p.share * 100)}%</span>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip icon="clock">
          <span className="text-fg tabular-nums">{f.picksSoFar}</span> of 10 Picked
        </Chip>
        <Equation terms={[]} result={f.points} />
      </div>
    </>
  );
}

function ComfortExplain({ why, item, owner }: { why: PickWhy; item: WhyItem; owner?: string }) {
  const c = why.comfort;
  const whose = owner ? `${owner}'s` : "Your";
  if (item === "record" && c.record) {
    const r = c.record;
    return (
      <>
        <Track expected={0.5} counted={r.counted} seen={r.wins / r.games} expectedLabel="Even" />
        <div className="flex flex-wrap gap-2">
          <Chip icon="helmet">
            <span className="text-fg tabular-nums">{r.wins}</span> Won of <span className="text-fg tabular-nums">{r.games}</span>
          </Chip>
        </div>
        <Equation
          terms={[
            { value: signed((r.counted - 0.5) * 100), label: "Above 50%" },
            { value: factor(r.points / ((r.counted - 0.5) * 100 || 1)), label: "Half Counts" },
          ]}
          result={r.points}
        />
      </>
    );
  }
  // The comfort parts side by side, the one the line is about marked: the same points for every hero in the list.
  return (
    <div className="flex flex-wrap gap-2">
      <Chip icon="heart" isOn={item === "favorite"}>
        In {whose} Heroes <Num value={c.favorite} />
      </Chip>
      {c.top > 0 && (
        <Chip icon="star" isOn={item === "top"}>
          Top 5 <Num value={c.top} />
        </Chip>
      )}
      {c.record && (
        <Chip icon="helmet">
          Record <Num value={c.record.points} />
        </Chip>
      )}
    </div>
  );
}

function SafetyExplain({ why, item, focus, hero }: { why: PickWhy; item: WhyItem; focus: number | null; hero: PlanHeroOf }) {
  const s = why.pickSafety;
  if (item === "gamble") {
    const g = s.gambles.find((x) => x.heroId === focus) ?? s.gambles[0];
    if (!g) return null;
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Face id={g.heroId} hero={hero} size={32} isEnemy />
          <Chip icon="alert">Hard Counter, Still Open</Chip>
        </div>
        <Equation
          terms={[
            { value: `−${g.gap.toFixed(1)}`, label: "If Picked" },
            { value: `${Math.round(g.chance * 100)}%`, label: "Chance" },
          ]}
          result={g.points}
        />
      </>
    );
  }
  if (item === "phase" && s.phase !== null) {
    return <Equation terms={[]} result={s.phase} resultLabel="This Pick Round" />;
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {s.threats.map((id) => (
          <span key={id} className="flex items-center gap-2 text-sm text-fg">
            <Face id={id} hero={hero} size={28} isEnemy />
            {hero(id).name}
          </span>
        ))}
        {s.banned.map((id) => (
          <span key={id} className="flex items-center gap-2 text-sm text-subtle">
            <Face id={id} hero={hero} size={28} isEnemy />
            <Icon name="ban" />
          </span>
        ))}
      </div>
      <Equation terms={[]} result={s.risk} resultLabel="vs Other Choices" />
    </>
  );
}

/** A Score Parts row opened: every hero or cause its points add up from, biggest first, each with a bar. */
function WholePart({ part, why, hero, owner }: { part: WhyPart; why: PickWhy; hero: PlanHeroOf; owner?: string }) {
  const rows: { key: string; face?: number; isEnemy?: boolean; icon?: IconName; label: string; points: number }[] = [];
  const whose = owner ? `${owner}'s` : "Your";
  if (part === "counter") for (const p of why.counters) rows.push({ key: `${p.heroId}`, face: p.heroId, isEnemy: true, label: hero(p.heroId).name, points: p.points });
  if (part === "synergy") for (const p of why.synergy) rows.push({ key: `${p.heroId}`, face: p.heroId, label: hero(p.heroId).name, points: p.points });
  if (part === "comfort") {
    if (why.comfort.favorite) rows.push({ key: "fav", icon: "heart", label: `In ${whose} Heroes`, points: why.comfort.favorite });
    if (why.comfort.top) rows.push({ key: "top", icon: "star", label: "Top 5", points: why.comfort.top });
    if (why.comfort.record) rows.push({ key: "rec", icon: "helmet", label: `Record ${why.comfort.record.wins} and ${why.comfort.record.games - why.comfort.record.wins}`, points: why.comfort.record.points });
  }
  if (part === "pickSafety") {
    rows.push({ key: "risk", icon: "shield", label: "vs Other Choices", points: why.pickSafety.risk });
    if (why.pickSafety.phase !== null) rows.push({ key: "phase", icon: "clock", label: "Pick Round", points: why.pickSafety.phase });
    for (const g of why.pickSafety.gambles) rows.push({ key: `g${g.heroId}`, face: g.heroId, isEnemy: true, label: `${hero(g.heroId).name} Open`, points: g.points });
  }
  if (part === "teamNeeds") return <NeedsExplain why={why} />;
  if (part === "meta") return <MetaExplain why={why} />;
  if (part === "positionFit") return <RoleFitExplain why={why} />;
  if (part === "flex") return <FlexExplain why={why} />;
  const max = Math.max(...rows.map((r) => Math.abs(r.points)), 0.1);
  return (
    <ul className="flex flex-col gap-3">
      {rows
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
        .map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_3rem_2.75rem] items-center gap-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted">
              {r.face !== undefined ? (
                <Face id={r.face} hero={hero} size={24} isEnemy={r.isEnemy} />
              ) : (
                r.icon && (
                  <span className="text-subtle">
                    <Icon name={r.icon} />
                  </span>
                )
              )}
              <span className="break-words">{r.label}</span>
            </span>
            <span className="relative h-1.5 rounded-xs bg-surface" aria-hidden>
              <span className={`absolute inset-y-0 left-0 rounded-xs ${r.points < 0 ? "bg-dire" : "bg-radiant"}`} style={{ width: `${(Math.abs(r.points) / max) * 100}%` }} />
            </span>
            <span className="text-right">
              <Num value={r.points} />
            </span>
          </li>
        ))}
    </ul>
  );
}
