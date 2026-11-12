import Image from "next/image";
import type { SkillPlan } from "@/lib/engine/skill-plan";
import type { HeroAbilities } from "@/lib/engine/types";
import type { SkillRow } from "./skill-plan-card";

export const TALENT_ICON = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/talents.svg";
export const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";

/** A basic ability's place in the max order: the level its last point goes in, or the levels the ultimate takes. */
export interface MaxStep {
  id: number;
  name: string;
  key?: string;
  /** "Max by 7", or "6, 12, 18" for the ultimate. */
  when: string;
  ult: boolean;
}

/**
 * The order the basic abilities are maxed in, then the ultimate with the levels it takes (the last ability in hotkey
 * order is the ultimate). Abilities without points are left out.
 */
export function maxOrder(rows: SkillRow[], abilities?: HeroAbilities): MaxStep[] {
  const ultId = abilities?.abilities.at(-1)?.id;
  const skilled = rows.filter((r) => r.kind === "ability" && r.levels.length > 0);
  const basics = skilled
    .filter((r) => r.id !== ultId)
    .sort((a, b) => a.levels.at(-1)! - b.levels.at(-1)!) // Filtered to rows with levels.
    .map((r) => ({ id: r.id, name: r.name, key: r.key, when: `Max by ${r.levels.at(-1)}`, ult: false }));
  const ult = skilled.find((r) => r.id === ultId);
  return ult ? [...basics, { id: ult.id, name: ult.name, key: ult.key, when: ult.levels.join(", "), ult: true }] : basics;
}

/** How many high-rank wins used this order, as a meter and the counts. */
export function AgreementMeter({ agreement }: { agreement: NonNullable<SkillPlan["agreement"]> }) {
  return (
    <span className="flex items-center gap-2.5 text-[0.8125rem] text-muted">
      <span aria-hidden className="block h-2 w-28 overflow-hidden rounded-xs bg-raised">
        <i className="block h-full bg-radiant" style={{ width: `${Math.round(agreement.share * 100)}%` }} />
      </span>
      <span>
        <span className="num font-semibold text-fg">{agreement.wins.toLocaleString("en-US")}</span> of{" "}
        <span className="num">{agreement.of.toLocaleString("en-US")}</span> high-rank wins used this order
      </span>
    </span>
  );
}

/** The max order as chips: each basic ability with the level it is maxed by, then the ultimate with its levels. */
export function MaxOrder({ steps }: { steps: MaxStep[] }) {
  if (!steps.length) return null;
  return (
    <ol aria-label="Max order" className="flex flex-wrap items-center gap-3">
      {steps.map((s, i) => (
        <li key={s.id} className={`flex items-center gap-3 ${s.ult && i > 0 ? "sm:ml-2" : ""}`}>
          {i > 0 && !s.ult && (
            <svg aria-hidden viewBox="0 0 16 16" className="hidden size-4 text-subtle sm:block" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 3l5 5-5 5" />
            </svg>
          )}
          <span className={`flex items-center gap-2.5 rounded-lg border py-1.5 pl-1.5 pr-3.5 ${s.ult ? "border-accent-deep bg-accent-tint" : "border-line-strong bg-surface"}`}>
            {s.key && <Image src={`${ABILITY_CDN}${s.key}.png`} alt="" width={32} height={32} className="size-8 rounded-md" />}
            <span className="flex flex-col leading-tight">
              <b className="text-sm font-semibold text-fg">{s.name}</b>
              <span className="num text-xs text-muted">{s.when}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The skill order level by level as art: the level's number over the icon of the ability, the talent mark or the
 * attribute bonus that takes its point, or an empty No Point cell. Scrolls sideways on narrow screens.
 */
export function SkillTrack({ plan, rows }: { plan: SkillPlan; rows: SkillRow[] }) {
  if (!plan.levels) return null;
  const at = (level: number) => rows.find((r) => r.levels.includes(level));
  return (
    <div role="region" aria-label="Skill order by level" tabIndex={0} className="-mx-1 overflow-x-auto px-1 pb-1 pt-1 focus-visible:outline-2 focus-visible:outline-accent">
      <ol className="grid min-w-[52rem] gap-1.5" style={{ gridTemplateColumns: `repeat(${plan.levels.length}, minmax(2.75rem, 1fr))` }}>
        {plan.levels.map((_, i) => {
          const level = i + 1;
          const row = at(level);
          const name = row ? (row.kind === "talents" ? plan.names[plan.levels![i]!] ?? "Talent" : row.name) : "No point";
          return (
            <li key={level} className="flex flex-col items-center gap-1.5" aria-label={`Level ${level}: ${name}`}>
              <span className="num text-xs text-subtle">{level}</span>
              {!row ? (
                <span title="No Point" className="flex size-10 items-center justify-center rounded-md border border-dashed border-line-control text-subtle" />
              ) : row.kind === "talents" ? (
                <span title={name} className="flex size-10 items-center justify-center rounded-md bg-accent-tint shadow-[inset_0_0_0_1px_var(--accent-deep)]">
                  <Image src={TALENT_ICON} alt="" width={24} height={25} unoptimized className="size-6" />
                </span>
              ) : row.key ? (
                <Image src={`${ABILITY_CDN}${row.key}.png`} alt="" title={name} width={40} height={40} className="size-10 rounded-md" />
              ) : (
                <span title={name} className="flex size-10 items-center justify-center rounded-md bg-raised text-muted">
                  +
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
