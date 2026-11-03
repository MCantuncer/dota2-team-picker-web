import Image from "next/image";
import type { SkillPlan, TalentTier } from "@/lib/engine/skill-plan";
import type { HeroAbilities } from "@/lib/engine/types";

const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";

const RESULT_LABELS: Record<TalentTier["result"], string> = {
  recommended: "Best for This Game",
  leaning: "Leaning",
  "no-clear-difference": "No Clear Difference",
  "too-few-games": "Too Few Games",
  general: "Usual Pick",
  "no-data": "No Data",
};

/**
 * A player's skill order, level by level, and the whole talent tree with the pick for this game
 * and why. `abilities` gives the ability icons; without it each level shows the ability's initial.
 */
export function SkillPlanCard({ plan, abilities }: { plan: SkillPlan; abilities?: HeroAbilities }) {
  const keyOf = (id: number) => abilities?.abilities.find((a) => a.id === id)?.key;
  const isTalent = (id: number) => plan.talents.some((t) => t.options.some((o) => o.id === id));
  return (
    <div className="flex flex-col gap-3">
      <span className="micro text-muted">Skills and Talents</span>
      {plan.levels && (
        <ol aria-label="Skill order" className="flex flex-wrap gap-1">
          {plan.levels.map((id, i) => {
            const level = i + 1;
            const name = id ? (plan.names[id] ?? "Unknown") : "No point";
            const key = id ? keyOf(id) : undefined;
            return (
              <li key={level} title={`Level ${level}: ${name}`} className="flex w-7 flex-col items-center gap-0.5">
                {key ? (
                  <Image src={`${ABILITY_CDN}${key}.png`} alt={name} width={28} height={28} className="size-7 rounded-xs" />
                ) : (
                  <span
                    aria-label={name}
                    className={`micro flex size-7 items-center justify-center rounded-xs ${
                      id === 0 ? "text-subtle" : isTalent(id) ? "bg-accent-tint text-accent" : "bg-raised text-fg"
                    }`}
                  >
                    {id === 0 ? "·" : isTalent(id) ? "T" : name.charAt(0)}
                  </span>
                )}
                <span className="num text-xs text-muted">{level}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-muted">{plan.buildReason}</p>

      <ol aria-label="Talent tree" className="flex flex-col gap-3">
        {plan.talents.map((tier) => (
          <li key={tier.tier} className="flex flex-col gap-1">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2">
              <span className="num self-center text-muted">{tier.level}</span>
              {tier.options.map((option) => {
                const picked = option.id === tier.pick;
                return (
                  <span
                    key={option.id}
                    aria-current={picked ? "true" : undefined}
                    className={`rounded-xs px-2 py-1 text-sm ${
                      picked ? "bg-accent-tint text-fg ring-1 ring-accent" : "bg-surface text-muted"
                    }`}
                  >
                    {option.name}
                  </span>
                );
              })}
            </div>
            <p className="pl-[3rem] text-xs">
              <span className={tier.result === "recommended" ? "text-accent" : "text-muted"}>{RESULT_LABELS[tier.result]}.</span>{" "}
              <span className="text-fg/85">{tier.reason}</span>
            </p>
          </li>
        ))}
      </ol>
      {plan.live === "loading" && <p className="text-xs text-muted">Loading games against these enemies…</p>}
      {plan.note && <p className="text-xs text-subtle">{plan.note}</p>}
    </div>
  );
}
