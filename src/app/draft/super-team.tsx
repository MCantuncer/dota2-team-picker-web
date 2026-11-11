import { HeroArt, HeroStage, LaneMark, type HeroArtPlacement } from "@/components/hero-frame";
import { Icon, type IconName } from "@/components/icon";
import type { Style } from "@/lib/engine/gameplan";
import type { PlanReason, TeamPlan } from "@/lib/engine/plan";
import { capitalize, minus, NeedRows, Reason, type PlanHeroOf } from "./team-plan";

const STYLE_ICONS: Record<Style, IconName> = {
  teamfight: "users",
  push: "castle",
  pickoff: "search",
  lategame: "clock",
};

/** A Pair Frame is 148x84; each half puts its hero's face on the same spot at the same scale. */
const PAIR_W = 148;
const PAIR_H = 84;
const PAIR_LEFT: HeroArtPlacement = { width: 218, at: [0.27, 0.42] };
const PAIR_RIGHT: HeroArtPlacement = { width: 218, at: [0.76, 0.42] };

interface Tile {
  label: string;
  /** The big number, or a short line for a combo. */
  value?: string;
  text?: string;
  caption: string;
  a: number;
  b: number;
  icon: IconName;
  /** The right hero is an enemy. */
  isEnemy?: boolean;
  /** The engine's full line, as the tooltip. */
  title: string;
}

/**
 * Why This Is a Super Team: how the five want to win, Pair Frames for the best pair, the edge against the enemy picks
 * and the key combo, any other line the engine gives, and Team Needs with the heroes covering each need.
 */
export function SuperTeamPanel({
  plan,
  hero,
  enemies,
}: {
  plan: TeamPlan;
  hero: PlanHeroOf;
  enemies: readonly number[];
}) {
  const enemySet = new Set(enemies);
  const idOf = (name: string) => plan.slots.find((s) => s.name === name)?.heroId;
  const names = (ids: number[]) => ids.map((id) => hero(id).name).join(" and ");
  const tiles: Tile[] = [];
  const shown = new Set<PlanReason>();

  const pair = plan.why.find((r) => r.kind === "pair" && r.heroes?.length === 2);
  if (pair) {
    shown.add(pair);
    const [a, b] = pair.heroes as [number, number];
    tiles.push({
      label: "Best Pair",
      value: minus(pair.lead),
      caption: names([a, b]),
      a,
      b,
      icon: "plus",
      title: minus(pair.text),
    });
  }
  // The team's whole edge against the enemy picks, framed by the matchup that gives the most of it.
  const counter = plan.why.find((r) => r.kind === "counter" && r.heroes?.length === 2);
  if (counter) {
    shown.add(counter);
    const [a, b] = counter.heroes as [number, number];
    tiles.push({
      label: "Against Enemy",
      value: minus(counter.lead),
      caption: `Most from ${hero(a).name} against ${hero(b).name}`,
      a,
      b,
      icon: "swords",
      isEnemy: true,
      title: minus(capitalize(counter.text)),
    });
  }
  const combo = plan.combos[0];
  const comboA = combo && idOf(combo.heroes[0]);
  const comboB = combo && idOf(combo.heroes[1]);
  if (combo && comboA !== undefined && comboB !== undefined) {
    tiles.push({
      label: "Key Combo",
      text: capitalize(combo.text),
      caption: `${combo.heroes[0]} and ${combo.heroes[1]}`,
      a: comboA,
      b: comboB,
      icon: "zap",
      title: capitalize(combo.text),
    });
  }
  // Team Needs below counts the needs, so the "7 of 7" line is not repeated.
  const more = plan.why.filter((r) => !shown.has(r) && r.kind !== "need");
  const covered = plan.needs.filter((n) => n.heroes.length >= n.wanted).length;
  // "Teamfight: group up and ... ultimates. Key combo: ..." The chip names the style; the line keeps the plan.
  const [, label, line] = /^([^:]+):\s*(.*?)(?:\s*Key combo:.*)?$/.exec(plan.gamePlan) ?? [];

  return (
    // Beside the lane it is one column; under the lane, from 768px, Team Needs takes a second column.
    <section
      aria-labelledby="super-team-why"
      className="grid items-start rounded-xl bg-surface ring-1 ring-line ring-inset md:grid-cols-2 xl:grid-cols-1"
    >
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4 md:px-6 md:pt-6">
          <div className="flex items-center gap-2">
            <LaneMark className="text-fg" />
            <h2 id="super-team-why" className="text-base font-semibold text-fg">
              Why This Is a Super Team
            </h2>
          </div>
          {line && (
            <p className="flex items-start gap-2.5 text-sm text-muted">
              <span className="chip micro h-6 shrink-0 gap-1.5 px-2 text-fg">
                <Icon name={plan.style ? STYLE_ICONS[plan.style.key] : "layers"} />
                {plan.style?.label ?? label}
              </span>
              <span className="pt-0.5">{capitalize(line)}</span>
            </p>
          )}
        </div>
        {tiles.length > 0 && (
          <ul className="flex flex-col">
            {tiles.map((t) => (
              <WhyTile key={t.label} tile={t} hero={hero} />
            ))}
          </ul>
        )}
        {more.length > 0 && (
          <ul aria-label="More Reasons" className="flex flex-col gap-2.5 border-t border-line px-5 py-5 md:px-6">
            {more.map((r) => (
              <Reason key={`${r.kind}:${r.text}`} reason={r} hero={hero} enemies={enemySet} />
            ))}
          </ul>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3 border-t border-line px-5 pt-5 pb-5 md:h-full md:border-t-0 md:border-l md:px-6 md:pt-6 md:pb-6 xl:h-auto xl:border-t xl:border-l-0 xl:pt-5">
        <h3 className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-fg">Team Needs</span>
          <span className="num text-muted">
            {covered} of {plan.needs.length}
          </span>
        </h3>
        <NeedRows needs={plan.needs} hero={hero} />
      </div>
    </section>
  );
}

function WhyTile({ tile: t, hero }: { tile: Tile; hero: PlanHeroOf }) {
  return (
    <li
      title={t.title}
      className="flex items-center gap-5 border-t border-line px-5 py-5 first:border-t-0 first:pt-2 md:px-6"
    >
      <PairFrame a={t.a} b={t.b} icon={t.icon} isEnemy={t.isEnemy} hero={hero} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="micro text-subtle">{t.label}</span>
        {t.value && (
          <span className="text-3xl leading-8 font-semibold tracking-tight text-fg tabular-nums">{t.value}</span>
        )}
        {t.text && <span className="text-sm leading-5 font-semibold text-fg">{t.text}</span>}
        <span className="micro text-muted">{t.caption}</span>
      </span>
    </li>
  );
}

/**
 * A Pair Frame: two heroes in one Lane Cut frame, split by the bright lane, with a neutral node at the centre holding
 * how they relate (pair, against, combo). A small copy of the logo, never copper. An enemy's half takes a Dire wash
 * and a Dire edge along its foot.
 */
export function PairFrame({
  a,
  b,
  icon,
  isEnemy = false,
  hero,
}: {
  a: number;
  b: number;
  icon: IconName;
  isEnemy?: boolean;
  hero: PlanHeroOf;
}) {
  const half = PAIR_H / 2;
  const x0 = PAIR_W / 2 - half;
  const x1 = PAIR_W / 2 + half;
  const left = `polygon(0 0, ${x1}px 0, ${x0}px 100%, 0 100%)`;
  const right = `polygon(${x1}px 0, 100% 0, 100% 100%, ${x0}px 100%)`;
  const art = (id: number, placement: HeroArtPlacement) => {
    const { portrait } = hero(id);
    return portrait && <HeroArt heroId={id} portrait={portrait} placement={placement} />;
  };
  return (
    <HeroStage size={PAIR_H} className="shrink-0">
      <span className="block" style={{ width: PAIR_W, height: PAIR_H }} />
      <span className="absolute inset-0" style={{ clipPath: left }}>
        {art(a, PAIR_LEFT)}
      </span>
      <span className={`absolute inset-0 ${isEnemy ? "bg-dire-tint" : ""}`} style={{ clipPath: right }}>
        {art(b, PAIR_RIGHT)}
      </span>
      {isEnemy && (
        <span className="absolute right-0 bottom-0 z-[2] h-0.5 bg-dire" style={{ left: x0 + 6 }} aria-hidden />
      )}
      <svg viewBox={`0 0 ${PAIR_W} ${PAIR_H}`} className="absolute inset-0 z-[2] size-full" aria-hidden>
        <path d={`M${x0} ${PAIR_H} L${x1} 0`} stroke="var(--fg)" strokeOpacity="0.9" strokeWidth="2" />
      </svg>
      <span className="absolute top-1/2 left-1/2 z-[2] flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg text-fg ring-2 ring-fg/90 [&_svg]:size-3.5">
        <Icon name={icon} />
      </span>
    </HeroStage>
  );
}
