"use client";

import Image from "next/image";
import { useId, useState } from "react";
import type { SkillLive, SkillPlan, TalentTier } from "@/lib/engine/skill-plan";
import { TALENT_LEVELS, type HeroAbilities } from "@/lib/engine/types";
import { FitLine } from "./fit-line";
import { HeroRender } from "./hero-render";
import { ABILITY_CDN, AgreementMeter, MaxOrder, maxOrder, SkillTrack, TALENT_ICON } from "./skill-track";
import { splitTalent, talentIcon, type TalentIcon } from "./talent-icon";

/**
 * The level a tier sits at in the game's talent tree: always 10, 15, 20 or 25. `tier.level` is when players usually
 * take it, which places the talent on the skill track and can be a level later.
 */
export const treeLevel = (tier: TalentTier) => TALENT_LEVELS[tier.tier] ?? tier.level;

/**
 * A talent name's font size in pixels, and the smallest a long name shrinks to so it stays on one line. The tree
 * keeps its width (Can 2026-11-22), so the longest names in the game (Alchemist's Corrosive Weaponry one) go to 9px.
 */
const NAME_MAX_PX = 15;
const NAME_MIN_PX = 9;
/** The size a name that can't fit one line even at NAME_MIN_PX wraps at (a phone's narrow tiles). */
const NAME_WRAP_PX = 13;

/** Below this gap between the two shares (in points), players are split on a tier rather than agreeing. */
const SPLIT_POINTS = 15;

const STATE_LINES: Record<Exclude<SkillLive, "ready">, string> = {
  loading: "Loading games against these enemies…",
  unavailable: "Games against these enemies aren't available, so the usual talents are shown.",
  "sign-in": "Sign in to compare talents against these enemies.",
};

/** One row of the skill grid: an ability, the attribute bonus or the talents, and the levels it takes points at. */
export interface SkillRow {
  id: number;
  name: string;
  key?: string;
  kind: "ability" | "attributes" | "talents";
  levels: number[];
}

/**
 * The levels this game's talents go at, beside that level's ability (a talent doesn't use the level's skill point):
 * each tier with a pick, at the level players usually take it, within the shown levels.
 */
export function talentLevels(plan: SkillPlan): number[] {
  const shown = plan.levels?.length ?? 0;
  return plan.talents.flatMap((t) => (t.pick !== null && t.level <= shown ? [t.level] : []));
}

/**
 * The level by level order as the game's own skill build grid: one row per ability in hotkey order, then the
 * attribute bonus when it takes points, then one row for the talents (Can 2026-11-04 asked for the in-game
 * layout). An id that isn't an ability or talent of the hero is the attribute bonus. Talents come from the tree's
 * levels; an older order (or a hero with a point every level) that still holds talent ids on their own levels keeps
 * those.
 */
export function skillRows(plan: SkillPlan, abilities?: HeroAbilities): SkillRow[] {
  if (!plan.levels) return [];
  const isTalent = (id: number) => plan.talents.some((t) => t.options.some((o) => o.id === id));
  const byId = new Map<number, number[]>();
  const inLevels: number[] = [];
  const attributes: number[] = [];
  plan.levels.forEach((id, i) => {
    if (id === 0) return;
    if (isTalent(id)) inLevels.push(i + 1);
    else if (!plan.names[id]) attributes.push(i + 1);
    else byId.set(id, [...(byId.get(id) ?? []), i + 1]);
  });
  // Hotkey order from the hero's abilities; any skilled ability they don't list goes after, in the order taken.
  const order = [...(abilities?.abilities.map((a) => a.id) ?? []), ...byId.keys()].filter((id, i, all) => all.indexOf(id) === i);
  const rows: SkillRow[] = order
    .filter((id) => byId.has(id) || plan.names[id])
    .map((id) => ({
      id,
      name: plan.names[id] ?? abilities?.abilities.find((a) => a.id === id)?.name ?? "",
      key: abilities?.abilities.find((a) => a.id === id)?.key,
      kind: "ability",
      levels: byId.get(id) ?? [],
    }));
  if (attributes.length) rows.push({ id: -1, name: "Attributes", kind: "attributes", levels: attributes });
  const talents = inLevels.length ? inLevels : talentLevels(plan);
  rows.push({ id: -2, name: "Talents", kind: "talents", levels: talents });
  return rows;
}

/**
 * Whether a tier has a reason of its own to show: this game's enemies decided it. The usual pick's share and a new
 * pair already show in the tree, so those tiers have no sentence under it.
 */
export const explained = (tier: TalentTier) => tier.result !== "general" && tier.result !== "no-data";

/** The tier whose reason shows first: the highest one this game changes, else the highest one explained. */
const firstTier = (tiers: TalentTier[]) =>
  [...tiers].reverse().find((t) => t.result === "recommended")?.tier ?? [...tiers].reverse().find(explained)?.tier;

/**
 * Skills and Talents for one player (approved C board and mockup v5): the skill order as the game's skill
 * build grid, and the whole talent tree in game layout, level 25 on top, each talent with the icon of what it buffs and this game's pick lit.
 * Picking a level shows why. `portrait` gives the hero's render beside them.
 */
export function SkillPlanCard({ plan, abilities, portrait }: { plan: SkillPlan; abilities?: HeroAbilities; portrait?: string }) {
  const rows = skillRows(plan, abilities);
  const tiers = [...plan.talents].reverse();
  const [open, setOpen] = useState(() => firstTier(plan.talents));
  const [view, setView] = useState<"track" | "grid">("track");
  const shown = tiers.find((t) => t.tier === open);
  const pickName = (tier: TalentTier) => tier.options.find((o) => o.id === tier.pick)?.name;
  const id = useId();
  return (
    <div className="relative isolate flex flex-col gap-10 lg:pl-[min(20vw,15rem)]">
      <HeroRender
        portrait={portrait}
        className="absolute -left-10 top-0 -z-10 hidden w-[min(26vw,22rem)] opacity-90 lg:block"
      />
      <section aria-labelledby={`${id}-order`} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <div className="flex flex-col gap-1">
            <h3 id={`${id}-order`} className="text-lg font-semibold tracking-[-0.02em] text-fg">
              Skill Order
            </h3>
            {plan.agreement ? <AgreementMeter agreement={plan.agreement} /> : <p className="text-sm text-muted">{plan.buildReason}</p>}
          </div>
          {plan.levels && (
            <div role="group" aria-label="Skill order view" className="seg">
              {(["track", "grid"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className="seg-item">
                  {v === "track" ? "Track" : "Grid"}
                </button>
              ))}
            </div>
          )}
        </div>
        {plan.levels && <MaxOrder steps={maxOrder(rows, abilities)} />}
        {plan.levels && (view === "track" ? <SkillTrack plan={plan} rows={rows} /> : <SkillGrid rows={rows} levels={plan.levels.length} />)}
      </section>

      <section aria-labelledby={`${id}-talents`} className="flex max-w-[46rem] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h3 id={`${id}-talents`} className="text-lg font-semibold tracking-[-0.02em] text-fg">
            Talents
          </h3>
          <TreeLegend newPairs={tiers.some((t) => t.newPair)} />
        </div>
        <ol aria-label="Talent tree" className="relative flex flex-col gap-3">
          {/* The tree's trunk, behind the level circles. */}
          <span aria-hidden className="absolute inset-y-8 left-1/2 w-0.5 -translate-x-1/2 bg-line-strong" />
          {tiers.map((tier) => {
            const [left, right] = tier.options;
            const label = `Level ${treeLevel(tier)}: ${left?.name} or ${right?.name}${pickName(tier) ? `, take ${pickName(tier)}` : ""}${tier.odds ? `, ${tier.odds}` : ""}`;
            const body = (
              <>
                {left && <Option option={left} tier={tier} align="right" abilities={abilities} />}
                <LevelNode tier={tier} on={explained(tier) && tier.tier === shown?.tier} />
                {right && <Option option={right} tier={tier} align="left" abilities={abilities} />}
                {split(tier) && <span className="chip relative col-span-full justify-self-center bg-bg px-2 text-xs">Players Split</span>}
              </>
            );
            const grid = "grid w-full grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] items-stretch gap-y-2 text-left sm:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)]";
            return (
              <li key={tier.tier} className="relative">
                {explained(tier) ? (
                  // A tier this game's enemies decide opens its reason below.
                  <button
                    type="button"
                    aria-pressed={tier.tier === shown?.tier}
                    aria-label={label}
                    aria-controls={`${id}-why`}
                    onClick={() => setOpen(tier.tier)}
                    className={`${grid} cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
                  >
                    {body}
                  </button>
                ) : (
                  <div role="group" aria-label={label} className={grid}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {shown && explained(shown) && (
          <p id={`${id}-why`} aria-live="polite" className="text-sm text-fg/85">
            <span className="font-medium text-fg">
              {pickName(shown) ? `Why ${pickName(shown)} at ${treeLevel(shown)}:` : `Level ${treeLevel(shown)}:`}
            </span>{" "}
            {shown.reason}
          </p>
        )}
        {plan.live !== "ready" && <p className="text-xs text-muted">{STATE_LINES[plan.live]}</p>}
        {plan.note && <p className="text-xs text-muted">{plan.note}</p>}
      </section>
    </div>
  );
}

/**
 * The small line under a talent. The odds ("1.8x the odds · 42 games", Can's chosen form) belong to the
 * talent that isn't the usual one; the usual one says so. Never raw wins and losses (Can 2026-11-02).
 */
function subLine(option: { id: number }, tier: TalentTier): string | undefined {
  const usual = option.id === tier.usual;
  if (tier.odds && !usual && tier.usual !== null) return tier.odds;
  // In general the lit tile is the usual pick, so it needs no words.
  if (usual && tier.result === "general") return undefined;
  if (usual && tier.result === "no-clear-difference") return "No Clear Difference";
  if (usual && tier.result === "too-few-games") return "Too Few Games";
  if (usual) return "Usual Pick";
  return undefined;
}

/** The share (0 to 1) of games that took this talent: the usual one's share, the other one the rest. */
export function optionShare(option: { id: number }, tier: TalentTier): number | undefined {
  if (tier.usualShare === undefined || tier.usual === null) return undefined;
  return option.id === tier.usual ? tier.usualShare : 1 - tier.usualShare;
}

/** Whether players split on a tier: the two shares are under SPLIT_POINTS apart. */
export function split(tier: TalentTier): boolean {
  return tier.usualShare !== undefined && Math.abs(tier.usualShare * 200 - 100) < SPLIT_POINTS;
}

/** Thousands as "66k", for the games under the usual pick. */
const games = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

/** The thin green arrow on a talent's icon: the talent makes that skill or stat stronger. */
function BuffArrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className={`text-radiant ${className}`}>
      <path d="M6 10.5V2M2.5 5.5L6 2l3.5 3.5" stroke="currentColor" strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** What the tree's marks mean: the arrow, the lit tile and (when a tier is new) the New tag. */
function TreeLegend({ newPairs }: { newPairs: boolean }) {
  return (
    <ul aria-label="Talent tree key" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
      <li className="flex items-center gap-1.5">
        <BuffArrow className="size-3.5" />
        Buffs This Skill
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-[3px] border border-accent-deep bg-accent-tint" />
        Take This
      </li>
      {newPairs && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-[3px] border border-dashed border-line-hover" />
          New This Patch
        </li>
      )}
    </ul>
  );
}

/** A level's circle on the trunk, with a copper line to the lit side; dashed while the tier has no picks. */
function LevelNode({ tier, on }: { tier: TalentTier; on: boolean }) {
  const side = tier.pick === null ? null : tier.options[0]?.id === tier.pick ? "left" : "right";
  return (
    <span className="relative flex items-center self-stretch">
      <span aria-hidden className={`h-0.5 flex-1 ${side === "left" ? "bg-accent" : ""}`} />
      <span
        className={`num flex size-10 shrink-0 items-center justify-center rounded-full border-2 bg-bg text-base font-semibold sm:size-11 ${
          tier.pick === null ? "border-dashed border-line-hover text-muted" : side ? "border-accent text-accent" : "border-line-strong text-fg"
        } ${on ? "bg-accent-tint" : ""}`}
      >
        <span className="sr-only">Level </span>
        {treeLevel(tier)}
      </span>
      <span aria-hidden className={`h-0.5 flex-1 ${side === "right" ? "bg-accent" : ""}`} />
    </span>
  );
}

/** The icon of what a talent buffs, with the thin green arrow on its corner. */
function TalentBadge({ icon }: { icon: TalentIcon }) {
  return (
    <span className="relative size-9 shrink-0 sm:size-10" title={icon.label ? `Buffs ${icon.label}` : undefined}>
      {icon.kind === "skill" ? (
        <Image src={icon.src} alt="" width={40} height={40} className="size-full rounded-md" />
      ) : (
        <span className="flex size-full items-center justify-center rounded-md border border-line-strong bg-raised">
          <Image src={icon.src} alt="" width={26} height={26} unoptimized className={icon.kind === "innate" ? "size-full rounded-md" : "size-[1.375rem] opacity-90 sm:size-6"} />
        </span>
      )}
      <BuffArrow className="absolute -right-1.5 -top-1.5 size-3.5 drop-shadow-[0_0_1.5px_var(--bg)]" />
    </span>
  );
}

function Option({
  option,
  tier,
  align,
  abilities,
}: {
  option: { id: number; name: string };
  tier: TalentTier;
  align: "left" | "right";
  abilities?: HeroAbilities;
}) {
  const picked = option.id === tier.pick;
  const line = subLine(option, tier);
  const share = optionShare(option, tier);
  const icon = talentIcon(option.name, abilities);
  const { value, rest } = splitTalent(option.name);
  const end = align === "right";
  return (
    <span
      className={`relative flex h-full min-w-0 flex-col gap-2.5 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3 ${
        end ? "items-end text-right sm:flex-row-reverse" : "items-start"
      } ${picked ? "border-accent-deep bg-accent-tint" : "border-line bg-surface"}`}
    >
      <TalentBadge icon={icon} />
      <span className="flex w-full min-w-0 flex-1 flex-col gap-2">
        {/* The game's own words, so the talent is easy to find in the game; long ones shrink to stay on one line. */}
        <FitLine max={NAME_MAX_PX} min={NAME_MIN_PX} wrap={NAME_WRAP_PX} className={`leading-snug ${picked ? "text-fg" : "text-muted"}`}>
          {value && <span className="font-semibold text-fg">{value} </span>}
          {rest}
          {icon.label && icon.kind !== "stat" && <span className="sr-only"> (buffs {icon.label})</span>}
          {picked && <span className="sr-only"> (take this)</span>}
        </FitLine>
        {share !== undefined ? (
          <span className={`flex w-full items-center gap-2 ${end ? "flex-row-reverse" : ""}`}>
            <span aria-hidden className={`flex h-1.5 min-w-8 flex-1 overflow-hidden rounded-xs bg-hover ${end ? "justify-end" : ""}`}>
              <i className={`block h-full rounded-xs ${picked ? "bg-accent" : "bg-line-control"}`} style={{ width: `${Math.round(share * 100)}%` }} />
            </span>
            <span className={`num text-sm ${picked ? "text-accent" : "text-muted"}`}>{Math.round(share * 100)}%</span>
            {option.id === tier.usual && tier.usualGames !== undefined && (
              <span className="hidden text-xs whitespace-nowrap text-muted sm:inline">{games(tier.usualGames)} Games</span>
            )}
          </span>
        ) : (
          tier.result === "no-data" && (
            <span className={`micro inline-flex h-6 items-center rounded-md border border-dashed border-line-hover px-2 text-muted ${end ? "self-end" : "self-start"}`}>
              {tier.newPair ? "New" : "No Picks Yet"}
            </span>
          )
        )}
        {line && <span className={`num text-xs ${picked ? "text-accent" : "text-muted"}`}>{line}</span>}
      </span>
    </span>
  );
}

/**
 * The game's skill build grid: one row per ability, one column per hero level, and the level's number in a
 * copper cell where the point goes. Scrolls sideways on narrow screens rather than shrinking the cells.
 */
function SkillGrid({ rows, levels }: { rows: SkillRow[]; levels: number }) {
  const columns = Array.from({ length: levels }, (_, i) => i + 1);
  return (
    <div className="overflow-x-auto pb-1">
      <table aria-label="Skill order" className="border-separate border-spacing-x-[3px] border-spacing-y-1.5">
        <thead className="sr-only">
          <tr>
            <th scope="col">Skill</th>
            {columns.map((level) => (
              <th key={level} scope="col">
                Level {level}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="sticky left-0 z-10 bg-bg pr-2 text-left font-normal sm:pr-3">
                <span className="flex items-center gap-2.5">
                  {row.kind === "talents" ? (
                    // Valve's own talent tree mark, as in the game's skill build. An SVG, so it isn't resized.
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xs bg-raised">
                      <Image src={TALENT_ICON} alt="" width={24} height={25} unoptimized className="size-6 opacity-90" />
                    </span>
                  ) : row.key ? (
                    <Image src={`${ABILITY_CDN}${row.key}.png`} alt="" width={36} height={36} className="size-9 shrink-0 rounded-xs" />
                  ) : (
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xs bg-raised text-muted">
                      +
                    </span>
                  )}
                  <span className="sr-only whitespace-nowrap text-sm text-fg sm:not-sr-only">{row.name}</span>
                  <span className="sr-only">{row.levels.length ? `, levels ${row.levels.join(", ")}` : ", no points"}</span>
                </span>
              </th>
              {columns.map((level) => {
                const on = row.levels.includes(level);
                return (
                  <td
                    key={level}
                    className={`num h-6 w-6 min-w-6 rounded-[3px] text-center text-xs ${on ? "bg-accent font-semibold text-bg" : "bg-raised/70"}`}
                  >
                    {on ? level : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
