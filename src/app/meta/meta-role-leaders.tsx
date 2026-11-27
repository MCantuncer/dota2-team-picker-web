"use client";

import Image from "next/image";
import type { KeyboardEvent } from "react";
import { ItemButton } from "@/components/item-card";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/draft";
import { buildPath, change, dayLabel, signed, type HeroRate, type MetaDay, type MetaExtras, type RoleHero } from "@/lib/meta";
import type { MetaHero } from "./meta-board";
import type { ItemArt } from "./meta-hero-extras";

const ROLE_PLURAL = ["carries", "mids", "offlaners", "soft supports", "hard supports"];

/** All Roles and the five roles as big tabs with the role symbols; arrow keys move between them. */
export function RoleTabs({ role, onChange }: { role: number; onChange: (role: number) => void }) {
  const move = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (role + (e.key === "ArrowRight" ? 1 : 5)) % 6;
    onChange(next);
    document.getElementById(`role-tab-${next}`)?.focus();
  };
  return (
    <div role="tablist" aria-label="Role" onKeyDown={move} className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {[0, 1, 2, 3, 4, 5].map((p) => (
        <button
          key={p}
          id={`role-tab-${p}`}
          type="button"
          role="tab"
          aria-selected={role === p}
          tabIndex={role === p ? 0 : -1}
          onClick={() => onChange(p)}
          className="grid justify-items-center gap-2 rounded-lg bg-surface px-2 pb-3 pt-3.5 text-base text-muted ring-1 ring-inset ring-line-strong transition-colors duration-(--dur-fast) hover:bg-hover hover:text-fg aria-selected:bg-accent-tint aria-selected:text-accent-bright aria-selected:ring-accent-deep"
        >
          {p ? (
            <PositionIcon position={p} size={30} />
          ) : (
            <span aria-hidden className="grid size-[30px] grid-cols-2 gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <i key={i} className="rounded-xs bg-current" />
              ))}
            </span>
          )}
          {p ? POSITION_NAMES[p - 1] : "All Roles"}
        </button>
      ))}
    </div>
  );
}

/** Win rate per day as a small line, the patch before's rate dashed, the newest day marked. */
function DayLine({ rate, days }: { rate: HeroRate; days: MetaDay[] }) {
  const W = 300;
  const H = 46;
  const pad = 5;
  const points = rate.days.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const values = [...points.map((p) => p[1]), ...(rate.baseWin === null ? [] : [rate.baseWin]), 50];
  const lo = Math.min(...values) - 0.5;
  const hi = Math.max(...values) + 0.5;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(days.length - 1, 1);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (H - 2 * pad);
  const last = points.at(-1);
  return (
    <div className="col-span-3 grid gap-1">
      <div className="flex justify-between text-sm text-subtle">
        <span>Win Rate by Day</span>
        {points.length > 0 && last && (
          <span>
            {dayLabel(days[points[0]![0]]!)} to {dayLabel(days[last[0]]!)}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Win rate by day: ${points.map((p) => `${dayLabel(days[p[0]]!)} ${p[1].toFixed(1)}%`).join(", ")}`}>
        <line x1={0} x2={W} y1={y(50)} y2={y(50)} className="stroke-line-strong" />
        {rate.baseWin !== null && <line x1={0} x2={W} y1={y(rate.baseWin)} y2={y(rate.baseWin)} className="stroke-line-control" strokeDasharray="3 3" />}
        {points.length > 1 && <polyline points={points.map((p) => `${x(p[0])},${y(p[1])}`).join(" ")} fill="none" className="stroke-accent" strokeWidth={2} />}
        {last && <circle cx={x(last[0])} cy={y(last[1])} r={4} className="fill-accent stroke-surface" strokeWidth={1.5} />}
      </svg>
    </div>
  );
}

function Stat({ label, value, delta, since }: { label: string; value: string; delta?: number | null; since?: string }) {
  return (
    <div className="grid min-w-0 content-start gap-px">
      <dt className="text-sm leading-tight text-subtle">{label}</dt>
      <dd className="text-lg font-semibold leading-tight tabular-nums text-fg">{value}</dd>
      {delta !== undefined && delta !== null && <span className={`text-sm tabular-nums ${delta >= 0 ? "text-radiant" : "text-dire"}`}>{`${signed(delta)} vs ${since}`}</span>}
    </div>
  );
}

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2.5 px-4 py-4 sm:px-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h4 className="text-base text-subtle">{title}</h4>
        {note && <span className="text-sm text-subtle">{note}</span>}
      </div>
      {children}
    </div>
  );
}

const MARK = { 1: ["▲", "text-radiant", "Buff"], [-1]: ["▼", "text-dire", "Nerf"], 0: ["●", "text-subtle", "Change"] } as const;

function PatchLines({ notes, count }: { notes: NonNullable<MetaExtras["patchNotes"]>[string] | undefined; count: number }) {
  if (!notes || notes.lines.length === 0) return <p className="text-sm text-subtle">No changes in this patch.</p>;
  return (
    <ul className="grid gap-[7px]">
      {notes.lines.slice(0, count).map((l) => {
        const [glyph, color, label] = MARK[l.tone];
        return (
          <li key={l.ability + l.text} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2 text-sm leading-[1.45] text-muted">
            <span aria-label={label} className={`text-xs leading-5 ${color}`}>
              {glyph}
            </span>
            <span>
              <b className="font-medium text-fg">{l.ability}</b> {l.text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ItemTile({ id, art, children }: { id: number; art: ItemArt; children: React.ReactNode }) {
  const it = art[id];
  return (
    <span className="grid min-w-0 justify-items-center gap-0.5">
      <ItemButton card={{ itemId: id, name: it?.name, img: it?.image }} label={it?.name} className="w-full">
        {it ? (
          <Image src={it.image} alt="" width={88} height={64} className="aspect-[50/36] w-full rounded-md object-cover ring-1 ring-line-strong" />
        ) : (
          <span className="block aspect-[50/36] w-full rounded-md bg-raised ring-1 ring-inset ring-line-strong" />
        )}
      </ItemButton>
      {children}
    </span>
  );
}

/** Early items, then core items in the order they are bought, each with its share and usual minute. */
function BuildRows({ hero, role, extras, art, compact }: { hero: number; role: number; extras: MetaExtras; art: ItemArt; compact?: boolean }) {
  const build = extras.builds[hero]?.[role];
  if (!build) return <p className="text-sm text-subtle">Builds are being counted for this role.</p>;
  const { early, core } = buildPath(build, extras.items);
  if (core.length === 0) return <p className="text-sm text-subtle">No core item in most games yet.</p>;
  const row = `grid ${compact ? "grid-cols-[repeat(4,minmax(0,56px))]" : "grid-cols-[repeat(6,minmax(0,50px))]"} justify-between gap-x-1 gap-y-2`;
  const timed = core.some((c) => c.minute !== null);
  const small = "text-xs leading-tight tabular-nums";
  return (
    <div className="grid gap-3">
      {!compact && early.length > 0 && (
        <div className="grid gap-1.5">
          <span className="text-sm text-subtle">Early</span>
          <div className={row}>
            {early.map((e) => (
              <ItemTile key={e.id} id={e.id} art={art}>
                <span className={`${small} text-muted`}>{Math.round(e.share)}%</span>
              </ItemTile>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-1.5">
        {!compact && <span className="text-sm text-subtle">{timed ? "Core, in the Order Bought" : "Core"}</span>}
        <div className={row}>
          {core.slice(0, compact ? 4 : 6).map((c) => (
            <ItemTile key={c.id} id={c.id} art={art}>
              {timed && <span className={`${small} text-fg`}>{c.minute === null ? " " : `${c.minute} min`}</span>}
              <span className={`${small} text-muted`}>{Math.round(c.share)}%</span>
            </ItemTile>
          ))}
        </div>
      </div>
    </div>
  );
}

function LosesTo({ hero, extras, heroes, onSelect }: { hero: number; extras: MetaExtras; heroes: Map<number, MetaHero>; onSelect: (id: number) => void }) {
  const rows = (extras.matchups[hero]?.worst ?? []).slice(0, 3);
  if (rows.length === 0) return <p className="text-sm text-subtle">Too few games against each Enemy yet.</p>;
  return (
    <ul className="grid grid-cols-3 gap-2">
      {rows.map(([id, rate, games]) => {
        const enemy = heroes.get(id);
        if (!enemy) return null;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              aria-label={`${enemy.name}: wins ${rate.toFixed(1)}% against, ${games.toLocaleString("en-US")} games. Open ${enemy.name}`}
              className="grid w-full gap-1 rounded-md text-left hover:brightness-125"
            >
              <Image src={enemy.image} alt="" width={160} height={90} className="aspect-video w-full rounded-md object-cover" />
              <span className="text-sm leading-tight text-fg">{enemy.name}</span>
              <span className="text-sm tabular-nums text-dire">{rate.toFixed(1)}%</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The card's art and name: opens the hero card further down. */
function CardTop({ hero, rank, tag, line, onSelect }: { hero: MetaHero; rank?: number; tag: { text: string; tone: string }; line?: string; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-label={`${hero.name}. Open ${hero.name}`} className="group grid text-left">
      <span className="relative block">
        <Image src={hero.image} alt="" width={480} height={270} className="aspect-video w-full object-cover transition-[filter] duration-(--dur-fast) group-hover:brightness-110" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 top-[45%] bg-gradient-to-b from-transparent to-surface/90" />
        {rank !== undefined && (
          <span className="absolute left-3 top-3 grid h-[34px] min-w-[34px] place-content-center rounded-lg bg-bg/80 px-2 font-semibold tabular-nums text-fg ring-1 ring-line-hover">{rank}</span>
        )}
      </span>
      <span className="relative -mt-11 grid gap-1.5 px-4 pb-4 sm:px-[18px]">
        <span className="text-xl font-semibold leading-tight text-fg">{hero.name}</span>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-muted">
          <span className={`rounded-md px-2.5 py-0.5 text-sm ring-1 ring-inset ${tag.tone}`}>{tag.text}</span>
          {line}
        </span>
      </span>
    </button>
  );
}

const TONES = {
  gold: "bg-accent-tint text-accent-bright ring-accent-deep",
  good: "bg-radiant-tint text-radiant ring-radiant/35",
  bad: "bg-dire-tint text-dire ring-dire/35",
  plain: "bg-raised text-fg ring-line-strong",
};

/** A short label each leader earns from its numbers. */
function leaderTag(h: RoleHero, i: number, all: RoleHero[], role: number) {
  const d = change(h.rate, "win");
  if (i === 0) return { text: `Top ${POSITION_NAMES[role - 1]}`, tone: TONES.gold };
  if (all.every((o) => o.rate.pick <= h.rate.pick)) return { text: "Most Picked", tone: TONES.gold };
  if (all.every((o) => o.rate.win <= h.rate.win)) return { text: "Highest Win Rate", tone: TONES.good };
  if (d !== null && d >= 1.5) return { text: "Rising", tone: TONES.good };
  if (d !== null && d <= -1.5) return { text: "Falling but Strong", tone: TONES.bad };
  return { text: "Steady", tone: TONES.plain };
}

/** One sentence from the hero's own numbers. */
export function whyLine(h: RoleHero, high: HeroRate | undefined, changes: number | undefined, role: number, oldPatch: string): string {
  const parts: string[] = [];
  const d = change(h.rate, "win");
  if (high && high.win - h.rate.win >= 1.5) parts.push(`wins ${high.win.toFixed(1)}% in Divine and Immortal, ${(high.win - h.rate.win).toFixed(1)} points more than across all ranks`);
  else if (high && h.rate.win - high.win >= 1.5) parts.push(`wins ${(h.rate.win - high.win).toFixed(1)} points less in Divine and Immortal (${high.win.toFixed(1)}%)`);
  if (d !== null && d >= 1) parts.push(`up ${d.toFixed(1)} points since ${oldPatch}${changes ? ` with ${changes} changes in the patch` : ""}`);
  else if (d !== null && d <= -1) parts.push(`down ${(-d).toFixed(1)} points since ${oldPatch} and still above most ${ROLE_PLURAL[role - 1]}`);
  else if (d !== null) parts.push(`held its ${oldPatch} win rate within ${Math.abs(d).toFixed(1)} points`);
  if (parts.length === 0) parts.push(`played as ${POSITION_NAMES[role - 1]} in ${Math.round(h.share)}% of its games`);
  const s = parts.slice(0, 2).join(", and ");
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

interface CardProps {
  h: RoleHero;
  role: number;
  hero: MetaHero;
  high: HeroRate | undefined;
  days: MetaDay[];
  oldPatch: string;
  extras: MetaExtras | undefined;
  art: ItemArt;
  heroes: Map<number, MetaHero>;
  onSelect: (id: number) => void;
}

const CARD = "row-span-5 grid min-w-0 grid-rows-subgrid gap-0 overflow-hidden rounded-xl border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line";

export function LeaderCard({ h, i, all, ...p }: CardProps & { i: number; all: RoleHero[] }) {
  const notes = p.extras?.patchNotes?.[h.rate.id];
  return (
    <article aria-label={p.hero.name} className={CARD}>
      <CardTop hero={p.hero} rank={i + 1} tag={leaderTag(h, i, all, p.role)} line={`${POSITION_NAMES[p.role - 1]} in ${Math.round(h.share)}% of Games`} onSelect={() => p.onSelect(h.rate.id)} />
      <dl className="grid grid-cols-3 content-start gap-x-3.5 gap-y-3 px-4 py-4 sm:px-[18px]">
        <Stat label="Win Rate" value={`${h.rate.win.toFixed(1)}%`} delta={change(h.rate, "win")} since={p.oldPatch} />
        <Stat label="Picked" value={`${h.rate.pick.toFixed(1)}%`} delta={change(h.rate, "pick")} since={p.oldPatch} />
        <Stat label="Divine and Immortal" value={p.high ? `${p.high.win.toFixed(1)}%` : "Few"} />
        <DayLine rate={h.rate} days={p.days} />
      </dl>
      <Block title="In the Patch" note={notes ? `${notes.changes} changes` : undefined}>
        {p.extras?.patchNotes ? <PatchLines notes={notes} count={3} /> : null}
        <p className="text-sm leading-normal text-fg">{whyLine(h, p.high, notes?.changes, p.role, p.oldPatch)}</p>
      </Block>
      <Block title="Build Path" note={p.extras?.builds[h.rate.id]?.[p.role] ? `${p.extras.builds[h.rate.id]![p.role]!.games.toLocaleString("en-US")} games` : undefined}>
        {p.extras ? <BuildRows hero={h.rate.id} role={p.role} extras={p.extras} art={p.art} /> : <p className="text-sm text-subtle">Builds are being counted.</p>}
      </Block>
      <Block title="Loses Most To" note="Adjusted for each Enemy's strength">
        {p.extras ? <LosesTo hero={h.rate.id} extras={p.extras} heroes={p.heroes} onSelect={p.onSelect} /> : <p className="text-sm text-subtle">Matchups are being counted.</p>}
      </Block>
    </article>
  );
}

export function DarkHorseCard({ h, ...p }: CardProps) {
  const d = change(h.rate, "win") ?? 0;
  return (
    <article aria-label={p.hero.name} className={CARD.replace("row-span-5", "row-span-4")}>
      <CardTop hero={p.hero} tag={{ text: `Up ${d.toFixed(1)} Since ${p.oldPatch}`, tone: TONES.good }} onSelect={() => p.onSelect(h.rate.id)} />
      <dl className="grid grid-cols-3 content-start gap-3 px-4 py-4">
        <Stat label="Win Rate" value={`${h.rate.win.toFixed(1)}%`} />
        <Stat label="Picked" value={`${h.rate.pick.toFixed(1)}%`} />
        <Stat label={POSITION_NAMES[p.role - 1]!} value={`${Math.round(h.share)}%`} />
      </dl>
      <Block title="In the Patch">
        {p.extras?.patchNotes ? (
          <PatchLines notes={p.extras.patchNotes[h.rate.id]} count={2} />
        ) : (
          <p className="text-sm leading-normal text-fg">{whyLine(h, p.high, undefined, p.role, p.oldPatch)}</p>
        )}
      </Block>
      <Block title="Core Build" note={p.extras?.builds[h.rate.id]?.[p.role]?.minutes?.length ? "In the order bought" : undefined}>{p.extras ? <BuildRows hero={h.rate.id} role={p.role} extras={p.extras} art={p.art} compact /> : null}</Block>
    </article>
  );
}

/** What the marks and lines on the cards mean. */
function CardKey() {
  const dot = (cls: string) => <i aria-hidden className={`inline-block size-2.5 rounded-xs ${cls}`} />;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-subtle" aria-hidden>
      <span className="flex items-center gap-1.5">{dot("bg-radiant")}Buff</span>
      <span className="flex items-center gap-1.5">{dot("bg-dire")}Nerf</span>
      <span className="flex items-center gap-1.5">{dot("bg-accent")}Win Rate by Day</span>
      <span className="flex items-center gap-1.5">{dot("ring-1 ring-inset ring-line-control")}Win Rate Before, Dashed</span>
    </div>
  );
}

export function SectionHead({ title, note, children }: { title: string; note: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="grid max-w-3xl gap-1">
        <h2 className="section-title">{title}</h2>
        <p className="text-sm text-muted">{note}</p>
      </div>
      {children}
    </div>
  );
}

/** A role's six leaders and four dark horses, each card opening the hero card below. */
export function RoleLeaders({
  role,
  pool,
  leaders,
  dark,
  ...p
}: { role: number; pool: number; leaders: RoleHero[]; dark: RoleHero[]; highs: Map<number, HeroRate> } & Omit<CardProps, "h" | "role" | "hero" | "high">) {
  const card = (h: RoleHero) => ({ h, role, hero: p.heroes.get(h.rate.id)!, high: p.highs.get(h.rate.id), ...p });
  const plural = ROLE_PLURAL[role - 1]!;
  if (leaders.length === 0) return <p className="text-muted">Too few {plural} at this rank yet.</p>;
  return (
    <div className="grid gap-10">
      <section className="grid gap-[18px]">
        <SectionHead
          title={`${POSITION_NAMES[role - 1]} Leaders`}
          note={`The ${plural} that win the most games above even: games in the role times how far the win rate is over 50%. ${pool} heroes play ${POSITION_NAMES[role - 1]} in at least 30% of their games.`}
        >
          <CardKey />
        </SectionHead>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leaders.map((h, i) => (
            <LeaderCard key={h.rate.id} {...card(h)} i={i} all={leaders} />
          ))}
        </div>
      </section>
      {dark.length > 0 && (
        <section className="grid gap-[18px]">
          <SectionHead title="Dark Horses" note={`The ${plural} that rose the most since ${p.oldPatch} without making the top six.`} />
          <div className={`grid gap-4 md:grid-cols-2 ${dark.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
            {dark.map((h) => (
              <DarkHorseCard key={h.rate.id} {...card(h)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
