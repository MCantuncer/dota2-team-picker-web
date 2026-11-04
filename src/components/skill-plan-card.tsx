"use client";

import Image from "next/image";
import { useId, useState } from "react";
import type { SkillLive, SkillPlan, TalentTier } from "@/lib/engine/skill-plan";
import type { HeroAbilities } from "@/lib/engine/types";
import { HeroRender } from "./hero-render";

const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";

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
 * The level by level order as the game's own skill build grid: one row per ability in hotkey order, then the
 * attribute bonus when it takes points, then one row for the talents (Can 2026-11-04 asked for the in-game
 * layout). An id that isn't an ability or talent of the hero is the attribute bonus.
 */
export function skillRows(plan: SkillPlan, abilities?: HeroAbilities): SkillRow[] {
  if (!plan.levels) return [];
  const isTalent = (id: number) => plan.talents.some((t) => t.options.some((o) => o.id === id));
  const byId = new Map<number, number[]>();
  const talents: number[] = [];
  const attributes: number[] = [];
  plan.levels.forEach((id, i) => {
    if (id === 0) return;
    if (isTalent(id)) talents.push(i + 1);
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
  rows.push({ id: -2, name: "Talents", kind: "talents", levels: talents });
  return rows;
}

/** The tier whose reason shows first: the highest one this game changes, else the top of the tree. */
const firstTier = (tiers: TalentTier[]) =>
  [...tiers].reverse().find((t) => t.result === "recommended")?.tier ?? tiers.at(-1)?.tier;

/**
 * Skills and Talents for one player (approved C board and mockup v5): the skill order as the game's skill
 * build grid, and the whole talent tree in game layout, level 25 on top, with this game's pick underlined.
 * Picking a level shows why. `portrait` gives the hero's render beside them.
 */
export function SkillPlanCard({ plan, abilities, portrait }: { plan: SkillPlan; abilities?: HeroAbilities; portrait?: string }) {
  const rows = skillRows(plan, abilities);
  const tiers = [...plan.talents].reverse();
  const [open, setOpen] = useState(() => firstTier(plan.talents));
  const shown = tiers.find((t) => t.tier === open) ?? tiers[0];
  const pickName = (tier: TalentTier) => tier.options.find((o) => o.id === tier.pick)?.name;
  const id = useId();
  return (
    <div className="relative isolate flex flex-col gap-10 lg:pl-[min(20vw,15rem)]">
      <HeroRender
        portrait={portrait}
        className="absolute -left-10 top-0 -z-10 hidden w-[min(26vw,22rem)] opacity-90 lg:block"
      />
      <section aria-labelledby={`${id}-order`} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id={`${id}-order`} className="text-[1.75rem] font-semibold tracking-[-0.02em] text-fg">
            Skill Order
          </h3>
          <p className="text-sm text-muted">{plan.buildReason}</p>
        </div>
        {plan.levels && <SkillGrid rows={rows} levels={plan.levels.length} />}
      </section>

      <section aria-labelledby={`${id}-talents`} className="flex flex-col gap-4 max-w-[46rem]">
        <div className="flex flex-col gap-1">
          <h3 id={`${id}-talents`} className="text-[1.75rem] font-semibold tracking-[-0.02em] text-fg">
            Talents
          </h3>
          <p className="text-sm text-muted">Our pick is underlined. Choose a level to see why.</p>
        </div>
        <ol aria-label="Talent tree" className="flex flex-col border-t border-line">
          {tiers.map((tier) => {
            const [left, right] = tier.options;
            const on = tier.tier === shown?.tier;
            return (
              <li key={tier.tier} className="border-b border-line">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`Level ${tier.level}: ${left?.name} or ${right?.name}${pickName(tier) ? `, take ${pickName(tier)}` : ""}${tier.odds ? `, ${tier.odds}` : ""}`}
                  aria-controls={`${id}-why`}
                  onClick={() => setOpen(tier.tier)}
                  className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] items-center gap-3 px-2 py-3 text-left transition-colors sm:gap-5 ${
                    on ? "bg-raised/60" : "hover:bg-raised/30"
                  } focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent`}
                >
                  {left && <Option option={left} tier={tier} align="right" />}
                  <span
                    className={`num flex size-11 items-center justify-center justify-self-center rounded-full border text-lg ${
                      on ? "border-accent text-accent" : "border-line text-accent/85"
                    }`}
                  >
                    <span className="sr-only">Level </span>
                    {tier.level}
                  </span>
                  {right && <Option option={right} tier={tier} align="left" />}
                </button>
              </li>
            );
          })}
        </ol>
        {shown && (
          <p id={`${id}-why`} aria-live="polite" className="text-sm text-fg/85">
            <span className="font-medium text-fg">
              {pickName(shown) ? `Why ${pickName(shown)} at ${shown.level}:` : `Level ${shown.level}:`}
            </span>{" "}
            {shown.reason}
          </p>
        )}
        {plan.live !== "ready" && <p className="text-xs text-muted">{STATE_LINES[plan.live]}</p>}
        {plan.note && <p className="text-xs text-subtle">{plan.note}</p>}
      </section>
    </div>
  );
}

/**
 * The small line under a talent. The odds ("1.8x the odds · 42 games", Can's chosen form) belong to the
 * talent that isn't the usual one; the usual one says so. Never raw wins and losses (Can 2026-11-02).
 */
function subLine(option: { id: number }, tier: TalentTier): string | undefined {
  const picked = option.id === tier.pick;
  const usual = option.id === tier.usual;
  if (tier.odds && !usual && tier.usual !== null) return tier.odds;
  if (usual && tier.result === "general") return picked ? "Usual Pick" : undefined;
  if (usual && tier.result === "no-clear-difference") return "No Clear Difference";
  if (usual && tier.result === "too-few-games") return "Too Few Games";
  if (usual) return "Usual Pick";
  return undefined;
}

function Option({ option, tier, align }: { option: { id: number; name: string }; tier: TalentTier; align: "left" | "right" }) {
  const picked = option.id === tier.pick;
  const line = subLine(option, tier);
  return (
    <span className={`flex min-w-0 flex-col gap-0.5 ${align === "right" ? "items-end text-right" : "items-start"}`}>
      <span
        className={
          picked
            ? "text-[0.9375rem] text-fg underline decoration-accent decoration-1 underline-offset-[5px]"
            : "text-[0.9375rem] text-muted"
        }
      >
        {option.name}
        {picked && <span className="sr-only"> (take this)</span>}
      </span>
      {line && <span className={`num text-xs ${picked ? "text-accent" : "text-subtle"}`}>{line}</span>}
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
                  {row.key ? (
                    <Image src={`${ABILITY_CDN}${row.key}.png`} alt="" width={36} height={36} className="size-9 shrink-0 rounded-xs" />
                  ) : (
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xs bg-raised text-muted">
                      {row.kind === "talents" ? "T" : "+"}
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
