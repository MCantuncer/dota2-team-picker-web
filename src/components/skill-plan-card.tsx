import Image from "next/image";
import type { SkillLive, SkillPlan, TalentTier } from "@/lib/engine/skill-plan";
import type { HeroAbilities } from "@/lib/engine/types";

const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";

const RESULT_LABELS: Record<Exclude<TalentTier["result"], "leaning">, string> = {
  recommended: "Best for This Game",
  "no-clear-difference": "No Clear Difference",
  "too-few-games": "Too Few Games",
  general: "Usual Pick",
  "no-data": "No Data",
};

const STATE_LINES: Record<Exclude<SkillLive, "ready">, string> = {
  loading: "Loading games against these enemies…",
  unavailable: "Games against these enemies didn't load, so the usual talents are shown.",
  "sign-in": "Sign in to compare talents against these enemies.",
};

const label = (tier: TalentTier) =>
  tier.result === "leaning"
    ? `Leaning ${tier.options.find((o) => o.id !== tier.pick)?.name ?? "the Other"}`
    : RESULT_LABELS[tier.result];

/**
 * A player's skill order, level by level, and the whole talent tree (level 25 on top, as in the
 * game) with the pick for this game and why. `abilities` gives the ability icons; without them
 * each level shows the ability's initial.
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
            const talent = id !== 0 && isTalent(id);
            // An id that isn't an ability or talent of the hero is the attribute bonus.
            const name = id === 0 ? "No point" : (plan.names[id] ?? "Attributes");
            const key = id ? keyOf(id) : undefined;
            const mark = id === 0 ? "·" : talent ? "T" : plan.names[id] ? name.charAt(0) : "+";
            return (
              <li key={level} title={`Level ${level}: ${name}`} className="flex w-7 flex-col items-center gap-0.5">
                <span className="sr-only">Level {level}:</span>
                {key ? (
                  <Image src={`${ABILITY_CDN}${key}.png`} alt={name} width={28} height={28} className="size-7 rounded-xs" />
                ) : (
                  <span
                    role="img"
                    aria-label={name}
                    className={`micro flex size-7 items-center justify-center rounded-xs ${
                      id === 0 ? "text-subtle" : talent ? "bg-accent-tint text-accent" : "bg-raised text-fg"
                    }`}
                  >
                    {mark}
                  </span>
                )}
                <span aria-hidden className="num text-xs text-muted">
                  {level}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-muted">{plan.buildReason}</p>

      <ol aria-label="Talent tree" className="flex flex-col gap-3">
        {[...plan.talents].reverse().map((tier) => (
          <li key={tier.tier} className="flex flex-col gap-1">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2">
              <span className="num self-center text-muted">
                <span className="sr-only">Level </span>
                {tier.level}
              </span>
              {tier.options.map((option) => (
                <Option key={option.id} option={option} tier={tier} />
              ))}
            </div>
            <p className="pl-12 text-xs">
              <span className={`font-medium ${tier.result === "recommended" ? "text-accent" : "text-muted"}`}>{label(tier)}</span>
              <span aria-hidden className="text-subtle"> · </span>
              <span className="text-fg/85">{tier.reason}</span>
            </p>
          </li>
        ))}
      </ol>
      {plan.live !== "ready" && <p className="text-xs text-muted">{STATE_LINES[plan.live]}</p>}
      {plan.note && <p className="text-xs text-subtle">{plan.note}</p>}
    </div>
  );
}

/** One talent: its name, its wins and losses against these enemies, and whether to take it. */
function Option({ option, tier }: { option: { id: number; name: string }; tier: TalentTier }) {
  const picked = option.id === tier.pick;
  const side = tier.sides?.find((s) => s.id === option.id);
  const isUsual = option.id === tier.usual && tier.pick !== tier.usual;
  return (
    <span
      className={`flex flex-col rounded-xs px-2 py-1 text-sm ${
        picked ? "bg-accent-tint text-fg ring-1 ring-accent" : "bg-surface text-muted"
      }`}
    >
      <span>
        {option.name}
        {picked && <span className="sr-only"> (take this)</span>}
      </span>
      {(side || isUsual) && (
        <span className="micro text-muted">
          {side && (
            <span title={`Against these enemies: won ${side.wins}, lost ${side.losses}`}>
              <span className="num text-xs">{side.wins}</span> won, <span className="num text-xs">{side.losses}</span> lost
            </span>
          )}
          {side && isUsual && " · "}
          {isUsual && "Usual"}
        </span>
      )}
    </span>
  );
}
