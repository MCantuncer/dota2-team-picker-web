"use client";

import Image from "next/image";
import { useState } from "react";
import type { PairTactics } from "@/lib/engine/game-plan";
import type { LaneTactic, RangeBar, TacticVisual, TimingRow } from "@/lib/engine/lane-tactics";
import { HeroFace } from "./hero-frame";
import { ABILITY_CDN } from "./skill-track";

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits by hero id, for the faces on rulers and the enemy switch. */
  icons: Record<number, string>;
}

/** The top tactics drawn as cards with a picture; the rest are quieter tips. */
const CARDS = 3;

/** Card grid columns by how many cards there are, so two cards never leave a third column empty. */
const CARD_COLUMNS: Record<number, string> = { 1: "", 2: "lg:grid-cols-2", 3: "xl:grid-cols-3" };
const TIP_COLUMNS: Record<number, string> = { 1: "", 2: "md:grid-cols-2", 3: "lg:grid-cols-3" };
/** Enemy switch rows that always come out even: two by two on a phone, then all in one row when they fit. */
const SWITCH_COLUMNS: Record<number, string> = {
  2: "grid-cols-2 sm:flex",
  3: "w-full grid-cols-2 sm:grid-cols-3",
  4: "w-full grid-cols-2 lg:grid-cols-4",
  5: "w-full grid-cols-2 sm:grid-cols-5",
  6: "w-full grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

interface LaneTacticsProps extends Art {
  pairs: PairTactics[];
  /** A short number after each enemy's name on the switch, like a lane win rate. */
  note?: (enemy: number) => string | undefined;
  /** The heading's level, so it fits the page's outline: 4 under First 10 Minutes, 3 in a Meta panel. */
  level?: 3 | 4;
  /** The heading's words. */
  title?: string;
  /** Whether the last hit target is drawn under the rules; First 10 Minutes draws it under By 10 Minutes instead. */
  withTarget?: boolean;
}

/**
 * Lane Tactics (Can's go on the Lane Tactics mockup, 2026-11-22): how the player plays this lane against the enemy
 * laner, worked out from the game numbers. The three most important as cards, each with one picture (kill line,
 * range ruler, trade budget, lane sketch or timing bar), the rest as quieter tips. With two enemy laners, a switch
 * picks which one the tactics are against, the likelier one first.
 */
export function LaneTactics({ pairs, heroName, icons, note, level = 4, title = "Lane Tactics", withTarget = true }: LaneTacticsProps) {
  const Heading = level === 3 ? "h3" : "h4";
  const [enemy, setEnemy] = useState(pairs[0]?.enemy);
  const pair = pairs.find((p) => p.enemy === enemy) ?? pairs[0];
  if (!pair) return null;
  // The last hit target is the lane's scoreboard, drawn as its own row under the rules.
  const rules = pair.tactics.filter((t) => t.rule !== "lastHits");
  const target = pair.tactics.find((t) => t.rule === "lastHits");
  const cards = rules.slice(0, CARDS);
  const tips = rules.slice(CARDS);
  return (
    <section aria-labelledby="lane-tactics-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <Heading id="lane-tactics-title" className="text-lg font-semibold tracking-[-0.01em] text-fg">
            {title}
          </Heading>
          <span className="text-sm text-muted">Against {heroName(pair.enemy)}, most important first</span>
        </div>
        {pairs.length > 1 && (
          <div role="group" aria-label="Enemy laner" className={`grid gap-2 ${SWITCH_COLUMNS[pairs.length] ?? SWITCH_COLUMNS[6]}`}>
            {pairs.map((p, i) => {
              const on = p.enemy === pair.enemy;
              const alone = i === pairs.length - 1 && pairs.length % 2 === 1;
              return (
                <button
                  key={p.enemy}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setEnemy(p.enemy)}
                  className={`flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg border py-1 pl-1 pr-3 text-sm transition-colors ${alone ? "max-sm:col-span-2" : ""} ${
                    on ? "border-accent-deep bg-accent-tint text-accent-bright" : "border-line-strong bg-raised text-muted hover:bg-hover hover:text-fg"
                  }`}
                >
                  {icons[p.enemy] && <HeroFace portrait={icons[p.enemy]!} name={heroName(p.enemy)} size={30} isEnemy isDecorative />}
                  <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                    {heroName(p.enemy)}
                    {note?.(p.enemy) && <span className="num text-xs text-muted">{note(p.enemy)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className={`grid gap-4 ${CARD_COLUMNS[cards.length] ?? ""}`}>
        {cards.map((t, i) => (
          <TacticCard key={`${pair.enemy}-${t.rule}`} tactic={t} enemy={pair.enemy} first={i === 0} wide={cards.length === 1} heroName={heroName} icons={icons} />
        ))}
      </div>
      {tips.length > 0 && (
        <div className={`grid gap-4 ${TIP_COLUMNS[tips.length] ?? ""}`}>
          {tips.map((t) => (
            <article key={`${pair.enemy}-${t.rule}`} className="flex items-start gap-3.5 rounded-xl border border-line bg-surface p-4">
              <TacticIcons spells={t.spells.slice(0, 1)} size={32} face={{ portrait: icons[pair.enemy], name: heroName(pair.enemy) }} />
              <div className="flex min-w-0 flex-col gap-1">
                <h5 className="text-base font-semibold text-fg">{t.title}</h5>
                <TacticText tactic={t} />
              </div>
            </article>
          ))}
        </div>
      )}
      {withTarget && target && <LastHitTarget tactic={target} />}
    </section>
  );
}

/** The last hit target: this pair's average lane last hits on a scale with the hero's usual and the enemy's. */
export function LastHitTarget({ tactic }: { tactic: LaneTactic }) {
  const visual = tactic.visual?.kind === "lastHits" ? tactic.visual : undefined;
  if (!visual) return null;
  const marks = [
    { key: "target", value: visual.target, label: "Against This Enemy", color: "var(--radiant)" },
    { key: "usual", value: visual.usual, label: "Your Usual", color: "var(--fg)" },
    ...(visual.enemy !== undefined ? [{ key: "enemy", value: visual.enemy, label: "Enemy Gets", color: "var(--dire)" }] : []),
  ];
  const lo = Math.floor((Math.min(...marks.map((m) => m.value)) - 10) / 10) * 10;
  const hi = Math.ceil((Math.max(...marks.map((m) => m.value)) + 10) / 10) * 10;
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <article className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-x-7">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="num flex size-10 shrink-0 items-center justify-center rounded-lg bg-radiant-tint text-base font-semibold text-radiant">{visual.target}</span>
        <div className="flex min-w-0 flex-col gap-1">
          <h5 className="text-base font-semibold text-fg">{tactic.title}</h5>
          <TacticText tactic={tactic} />
        </div>
      </div>
      <figure className="flex flex-col gap-2.5">
        <div role="img" aria-label={marks.map((m) => `${m.label} ${m.value}`).join(", ")} className="relative h-2.5 rounded-full bg-line-strong">
          {marks.map((m) => (
            <i key={m.key} className="absolute -top-[5px] block h-5 w-[3px] -translate-x-1/2 rounded-sm" style={{ left: at(m.value), background: m.color }} />
          ))}
        </div>
        <figcaption className="flex flex-col gap-1 text-sm text-muted sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-4">
          {marks.map((m) => (
            <span key={m.key} className="flex items-center gap-2">
              <i className="block size-2.5 rounded-full" style={{ background: m.color }} />
              {m.label} <span className="num text-fg">{m.value}</span>
            </span>
          ))}
        </figcaption>
      </figure>
    </article>
  );
}

function TacticCard({ tactic, enemy, first, wide, heroName, icons }: Art & { tactic: LaneTactic; enemy: number; first: boolean; wide: boolean }) {
  return (
    <article
      className={`grid min-w-0 content-start gap-4 rounded-xl border border-line-strong bg-raised p-5 ${
        wide ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-x-7" : "sm:max-xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:max-xl:items-center sm:max-xl:gap-x-7"
      }`}
    >
      <div className={`flex items-center gap-3.5 ${wide ? "md:col-span-2" : "sm:max-xl:col-span-2"}`}>
        <TacticIcons spells={tactic.spells} size={40} face={{ portrait: icons[enemy], name: heroName(enemy) }} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={`text-xs ${first ? "font-medium text-accent-bright" : "text-muted"}`}>{first ? "Care Most" : tactic.tag}</span>
          <h5 className="text-base font-semibold leading-snug text-fg">{tactic.title}</h5>
        </div>
      </div>
      {tactic.visual && <TacticPicture visual={tactic.visual} heroName={heroName} icons={icons} />}
      <TacticText tactic={tactic} />
    </article>
  );
}

/** A tactic's spell icons; one about the enemy hero alone (their reach) shows the enemy's face instead. */
function TacticIcons({ spells, size, face }: { spells: string[]; size: number; face: { portrait?: string; name: string } }) {
  if (!spells.length) return face.portrait ? <HeroFace portrait={face.portrait} name={face.name} size={size} isEnemy isDecorative /> : null;
  return (
    <span className="flex shrink-0 gap-1.5">
      {spells.slice(0, 2).map((key) => (
        <Image key={key} src={`${ABILITY_CDN}${key}.png`} alt="" width={size} height={size} className="rounded-md border border-line-strong" style={{ width: size, height: size }} />
      ))}
    </span>
  );
}

function TacticText({ tactic }: { tactic: LaneTactic }) {
  return (
    <p className="text-sm leading-relaxed text-muted">
      {tactic.parts.map((part, i) =>
        part.strong ? (
          <b key={i} className="font-semibold text-fg">
            {part.text}
          </b>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}

function TacticPicture({ visual, heroName, icons }: Art & { visual: TacticVisual }) {
  switch (visual.kind) {
    case "killLine":
      return <KillLine {...visual} />;
    case "ruler":
      return <Ruler bars={visual.bars} heroName={heroName} icons={icons} />;
    case "trade":
      return <TradeBudget {...visual} />;
    case "split":
      return <SplitSketch {...visual} />;
    case "lineUp":
      return <LineSketch {...visual} />;
    case "lastHits":
      return null;
    case "timing":
      return <TimingBars rows={visual.rows} heroName={heroName} icons={icons} />;
  }
}

const HATCH = "repeating-linear-gradient(135deg, color-mix(in srgb, var(--dire) 85%, transparent) 0 6px, color-mix(in srgb, var(--dire) 62%, transparent) 6px 12px)";
/** A combo part this big a share of the health bar has room for its number. */
const LABEL_SHARE = 0.14;

/** The enemy's combo on the player's health bar: how much of it one combo takes, part by part. */
function KillLine({ health, total, parts }: Extract<TacticVisual, { kind: "killLine" }>) {
  const scale = Math.max(health, total);
  const at = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  const lethal = total >= health;
  return (
    <figure className="flex flex-col gap-2.5">
      <figcaption className="text-sm text-muted">
        <span className="num mr-1.5 text-xl font-semibold leading-none tracking-[-0.01em] text-dire">{total}</span>
        {lethal ? `kills your ${health} HP` : `of your ${health} HP`}
      </figcaption>
      <div role="img" aria-label={`The combo deals ${total} of your ${health} HP`} className="relative h-[1.375rem] overflow-hidden rounded-md" style={{ background: "color-mix(in srgb, var(--radiant) 70%, var(--raised))" }}>
        <i className="absolute inset-y-0 left-0 block" style={{ width: at(total), background: HATCH }} />
        {!lethal && <i className="absolute inset-y-0 block w-0.5 bg-fg" style={{ left: at(total) }} />}
      </div>
      <div aria-hidden className="flex h-[1.625rem] gap-0.5">
        {parts.map((p) => (
          <span
            key={p.label}
            title={`${p.label} ${p.amount}`}
            className="num flex min-w-0 items-center justify-center gap-1 overflow-hidden rounded border text-xs text-fg"
            style={{ flex: p.amount, background: "var(--dire-tint)", borderColor: "color-mix(in srgb, var(--dire) 35%, var(--line))" }}
          >
            {p.spell ? (
              <Image src={`${ABILITY_CDN}${p.spell}.png`} alt="" width={18} height={18} className="size-[1.125rem] shrink-0 rounded-[3px]" />
            ) : (
              <span className="truncate px-1">{p.label}</span>
            )}
            {p.spell && p.amount / scale >= LABEL_SHARE && p.amount}
          </span>
        ))}
        {scale > total && <span style={{ flex: scale - total }} />}
      </div>
    </figure>
  );
}

/** Ranges as bars on one scale: an attack, a spell or an aura, ours green and the enemy's red. */
function Ruler({ bars, heroName, icons }: Art & { bars: RangeBar[] }) {
  const scale = Math.max(...bars.map((b) => b.range)) * 1.18;
  const label = bars.map((b) => `${b.hero !== undefined ? `${heroName(b.hero)}'s attack` : "Spell"} ${b.range}`).join(", ");
  return (
    <figure role="img" aria-label={`Ranges: ${label}`} className="flex flex-col gap-2">
      {bars.map((b, i) => (
        <div key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2.5">
          <RowIcon spell={b.spell} hero={b.hero} enemy={b.side === "enemy"} heroName={heroName} icons={icons} />
          <div className="relative h-[1.375rem]">
            <i
              className="absolute inset-y-1 left-0 block rounded"
              style={{ width: `${(b.range / scale) * 100}%`, background: `color-mix(in srgb, var(--${b.side === "ours" ? "radiant" : "dire"}) 65%, var(--raised))` }}
            />
            <span className="num absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-fg" style={{ left: `calc(${(b.range / scale) * 100}% + 0.5rem)` }}>
              {b.range}
            </span>
          </div>
        </div>
      ))}
    </figure>
  );
}

/** What a last hit costs and what one heal gives back: the enemy's hits, the heal, and how many heals the mana holds. */
function TradeBudget({ hit, hits, heal, casts }: Extract<TacticVisual, { kind: "trade" }>) {
  const scale = Math.max(hit * hits, heal);
  const w = (n: number) => `${(n / scale) * 70}%`;
  return (
    <figure role="img" aria-label={`${hits} enemy hits cost ${hit * hits}, one cast heals ${heal}, mana for ${casts} casts`} className="flex flex-col gap-2.5 text-sm text-muted">
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2.5">
        <span>Enemy Hits</span>
        <span className="flex items-center gap-1">
          {Array.from({ length: hits }, (_, i) => (
            <i key={i} className="block h-3.5 rounded-[3px] bg-dire" style={{ width: w(hit) }} />
          ))}
          <span className="num ml-1.5 text-fg">-{hit * hits}</span>
        </span>
      </div>
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2.5">
        <span>One Cast</span>
        <span className="flex items-center gap-1">
          <i className="block h-3.5 rounded-[3px] bg-radiant" style={{ width: w(heal) }} />
          <span className="num ml-1.5 text-fg">+{heal}</span>
        </span>
      </div>
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2.5">
        <span>Your Mana</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: Math.min(casts, 6) }, (_, i) => (
            <i key={i} className="block h-2.5 w-7 rounded-[3px]" style={{ background: "var(--attr-int)" }} />
          ))}
          <span className="num ml-1 text-muted">{casts === 1 ? "1 Cast" : `${casts} Casts`}</span>
        </span>
      </div>
    </figure>
  );
}

/** A lane from above: the enemy's line spell, the summon in it, and the player a line's width to the side. */
function SplitSketch({ width, spell, summon }: Extract<TacticVisual, { kind: "split" }>) {
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 320 120" role="img" aria-label={`Stand ${width} to the side of your summon, out of the ${width} wide line`} className="block h-auto w-full rounded-lg border border-line bg-bg">
        <rect x="24" y="22" width="272" height="36" rx="6" fill="var(--dire)" opacity="0.22" />
        <path d="M24 40 H296" stroke="var(--dire)" strokeWidth="2" strokeDasharray="6 6" />
        <path d="M296 40 l-10 -6 v12 z" fill="var(--dire)" />
        <image href={`${ABILITY_CDN}${spell}.png`} x="6" y="28" width="24" height="24" />
        <image href={`${ABILITY_CDN}${summon}.png`} x="150" y="28" width="24" height="24" />
        <circle cx="162" cy="92" r="11" fill="var(--radiant)" />
        <path d="M188 58 V82" stroke="var(--fg)" strokeWidth="1.5" />
        <path d="M184 58 H192 M184 82 H192" stroke="var(--fg)" strokeWidth="1.5" />
        <text x="198" y="74" fill="var(--fg)" fontSize="12" className="num">
          {width}
        </text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-2">
          <i className="block size-2.5 rounded-full bg-radiant" />
          You
        </span>
        <span className="flex items-center gap-2">
          <i className="block size-2.5 rounded-sm bg-dire/60" />
          The line, {width} wide
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * A line spell through the wave, from above. A hook or an arrow stops at the first creep, so the player stands
 * behind the creeps; any other line runs through all of them, so the player stands to the side.
 */
function LineSketch({ width, spell, blocked }: Extract<TacticVisual, { kind: "lineUp" }>) {
  const end = blocked ? 146 : 296;
  const creeps = [158, 180, 202];
  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox="0 0 320 120"
        role="img"
        aria-label={blocked ? "The spell stops at the first creep: stand behind your creeps" : `The spell runs ${width} wide through the wave: stand to the side, not behind your creeps`}
        className="block h-auto w-full rounded-lg border border-line bg-bg"
      >
        <rect x="24" y="30" width={end - 24} height="36" rx="6" fill="var(--dire)" opacity="0.22" />
        <path d={`M24 48 H${end}`} stroke="var(--dire)" strokeWidth="2" strokeDasharray="6 6" />
        {blocked ? <path d={`M${end - 6} 40 l12 16 M${end + 6} 40 l-12 16`} stroke="var(--dire)" strokeWidth="2.5" /> : <path d={`M${end} 48 l-10 -6 v12 z`} fill="var(--dire)" />}
        <image href={`${ABILITY_CDN}${spell}.png`} x="6" y="36" width="24" height="24" />
        {creeps.map((x) => (
          <rect key={x} x={x - 7} y="41" width="14" height="14" rx="3" fill="var(--radiant)" opacity="0.55" />
        ))}
        <circle cx={blocked ? 246 : 232} cy={blocked ? 48 : 96} r="11" fill="var(--radiant)" />
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-2">
          <i className="block size-2.5 rounded-full bg-radiant" />
          {blocked ? "You, behind your creeps" : "You, out of the line"}
        </span>
        <span className="flex items-center gap-2">
          <i className="block size-2.5 rounded-sm bg-radiant/55" />
          Your creeps
        </span>
      </figcaption>
    </figure>
  );
}

/** Seconds as bars on one scale: a spell's delay or cooldown, and the player's time to act. */
function TimingBars({ rows, heroName, icons }: Art & { rows: TimingRow[] }) {
  const scale = Math.max(...rows.map((r) => r.seconds)) * 1.05;
  return (
    <figure role="img" aria-label={rows.map((r) => r.label).join(", ")} className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2.5">
          <RowIcon spell={r.spell} hero={r.hero} enemy={false} heroName={heroName} icons={icons} />
          <div className="relative h-[1.625rem] rounded border border-line bg-bg">
            <i
              className="absolute inset-y-[3px] left-[3px] block rounded-[3px]"
              style={{ width: `calc(${(r.seconds / scale) * 100}% - 6px)`, background: `color-mix(in srgb, var(--${r.kind === "open" ? "radiant" : "dire"}) 55%, var(--raised))` }}
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-medium text-fg">{r.label}</span>
          </div>
        </div>
      ))}
    </figure>
  );
}

function RowIcon({ spell, hero, enemy, heroName, icons }: Art & { spell?: string; hero?: number; enemy: boolean }) {
  if (spell) return <Image src={`${ABILITY_CDN}${spell}.png`} alt="" width={28} height={28} className="size-7 rounded-md" />;
  if (hero !== undefined && icons[hero]) return <HeroFace portrait={icons[hero]!} name={heroName(hero)} size={28} isEnemy={enemy} isDecorative />;
  return <span />;
}
