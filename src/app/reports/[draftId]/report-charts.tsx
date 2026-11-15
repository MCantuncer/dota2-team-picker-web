import Image from "next/image";
import type { DamageSource, EnemyBest, FightFact, LaneName, LaneResult, Swing } from "@/lib/report-facts";
import { amount, clock, damageLine, enemyBestLine, fightLine, type HeroName, laneLine, signedAmount, swingLine } from "@/lib/report-text";
import type { ReportArt } from "./report-view";

/** A lane closer than this at 10 minutes reads as even, the same as the lane sentence. */
const EVEN_LANE = 300;

/** Half the lane axis in gold: the biggest lane rounded up to a thousand, at least 1k, so every lane shares one scale. */
export function laneScale(lanes: LaneResult[]): number {
  const biggest = Math.max(0, ...lanes.map((l) => Math.abs(l.netWorthDiff)));
  return Math.max(1000, Math.ceil(biggest / 1000) * 1000);
}

/**
 * The row of each fight marker on the timeline: a fight goes on the first row where it is at least `gap` minutes
 * after the last marker, so markers never sit on top of each other, even on a phone.
 */
export function fightRows(minutes: number[], gap: number): number[] {
  const lastOnRow: number[] = [];
  return minutes.map((m) => {
    const row = lastOnRow.findIndex((last) => m - last >= gap);
    const at = row === -1 ? lastOnRow.length : row;
    lastOnRow[at] = m;
    return at;
  });
}

/** An ability or item key as its name in Title Case: `bloodseeker_blood_bath` becomes "Bloodseeker Blood Bath". */
export function damageName(source: string): string {
  if (source === "attacks") return "Right-clicks";
  const words = source.replace(/^item_/, "").split("_").filter(Boolean);
  return words.length ? words.map((w) => `${w[0].toUpperCase()}${w.slice(1)}`).join(" ") : source;
}

const LANE_LABEL: Record<LaneName, string> = { top: "Top", mid: "Mid", bottom: "Bottom" };

/** Each lane's path on a 24 unit minimap: Radiant's base is bottom left, Dire's top right. */
const LANE_PATH: Record<LaneName, string> = {
  top: "M5 19V5h14",
  mid: "M5 19 19 5",
  bottom: "M5 19h14V5",
};

/** The lane as a small minimap with its path lit, like Dota's lane picker. Decorative: the lane's name sits beside it. */
export function LaneIcon({ lane, size = 40 }: { lane: LaneName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <rect x="0.5" y="0.5" width="23" height="23" rx="4.5" fill="var(--raised)" stroke="var(--line-strong)" />
      {(Object.keys(LANE_PATH) as LaneName[])
        .filter((l) => l !== lane)
        .map((l) => (
          <path key={l} d={LANE_PATH[l]} fill="none" stroke="var(--ban)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        ))}
      <path d={LANE_PATH[lane]} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="4.5" cy="19.5" r="2.25" fill="var(--radiant)" />
      <circle cx="19.5" cy="4.5" r="2.25" fill="var(--dire)" />
    </svg>
  );
}

function Face({ heroId, art, name }: { heroId: number; art: ReportArt; name: HeroName }) {
  const image = art.heroes.get(heroId)?.image;
  return image ? (
    <Image src={image} alt="" title={name(heroId)} width={56} height={32} className="h-8 w-8 rounded-md object-cover object-[20%_center]" />
  ) : (
    <span title={name(heroId)} className="micro flex h-8 w-8 items-center justify-center rounded-md bg-raised text-muted">
      {name(heroId).slice(0, 2)}
    </span>
  );
}

/** Lanes at 10 minutes: one bar per lane on a shared scale, our side to the right when ahead. */
export function LaneChart({ lanes, art, name }: { lanes: LaneResult[]; art: ReportArt; name: HeroName }) {
  const scale = laneScale(lanes);
  const order: LaneName[] = ["top", "mid", "bottom"];
  const sorted = [...lanes].sort((a, b) => order.indexOf(a.lane) - order.indexOf(b.lane));
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-4 gap-y-4 sm:grid-cols-[max-content_minmax(0,1fr)_3.5rem]">
        {sorted.map((l) => {
          const even = Math.abs(l.netWorthDiff) < EVEN_LANE;
          const ahead = l.netWorthDiff > 0;
          const width = even ? 0 : (Math.min(Math.abs(l.netWorthDiff), scale) / scale) * 50;
          return (
            <li key={l.lane} className="col-span-2 grid grid-cols-subgrid items-center gap-y-2.5 sm:col-span-3">
              <span className="sr-only">{laneLine(l, name)}</span>
              {/* The lane's icon is its name (Can, 2026-11-16): set apart from the faces by a divider and more room. */}
              <span aria-hidden="true" className="flex items-center gap-4">
                <span title={LANE_LABEL[l.lane]} className="flex border-r border-line-strong pr-4">
                  <LaneIcon lane={l.lane} />
                </span>
                <span className="flex gap-1.5">
                  {l.ourHeroes.map((id) => (
                    <Face key={id} heroId={id} art={art} name={name} />
                  ))}
                </span>
              </span>
              <span aria-hidden="true" className="relative h-2.5 rounded-full bg-line-strong max-sm:order-last max-sm:col-span-2">
                <span className="absolute -inset-y-1 left-1/2 w-px bg-subtle" />
                {width > 0 && (
                  <span
                    className={`absolute inset-y-0 rounded-full ${ahead ? "bg-radiant" : "bg-dire"}`}
                    style={ahead ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
                  />
                )}
              </span>
              <span aria-hidden="true" className={`num text-right ${even ? "text-muted" : ahead ? "text-radiant" : "text-dire"}`}>
                {even ? "Even" : signedAmount(l.netWorthDiff)}
              </span>
            </li>
          );
        })}
        <li aria-hidden="true" className="col-span-2 grid grid-cols-subgrid sm:col-span-3">
          <span className="max-sm:hidden" />
          <span className="micro relative flex h-4 justify-between whitespace-nowrap text-subtle max-sm:col-span-2">
            <span>Behind {amount(scale)}</span>
            <span className="absolute left-1/2 -translate-x-1/2">Even</span>
            <span>Ahead {amount(scale)}</span>
          </span>
        </li>
      </ul>
    </div>
  );
}

/** Colours for the biggest damage sources, biggest first; the rest of the damage is grey. */
const HURT_COLORS = ["var(--dire)", "var(--accent)", "var(--attr-uni)", "var(--attr-int)"];

/** What hurt us: one stacked bar of the damage we took, a key under it, then the enemy who got furthest ahead. */
export function HurtChart({
  damage,
  enemyBest,
  art,
  name,
}: {
  damage: DamageSource[];
  enemyBest: EnemyBest | null;
  art: ReportArt;
  name: HeroName;
}) {
  const top = damage.slice(0, HURT_COLORS.length);
  const rest = Math.max(0, 1 - top.reduce((sum, d) => sum + d.share, 0));
  const parts = [
    ...top.map((d, i) => ({ key: d.source, label: damageName(d.source), share: d.share, color: HURT_COLORS[i] })),
    ...(rest > 0.005 ? [{ key: "rest", label: "Everything Else", share: rest, color: "var(--ban)" }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {damage.length > 0 && (
        <div className="flex flex-col gap-3">
          <ul className="sr-only">
            {damage.map((d) => (
              <li key={d.source}>{damageLine(d)}</li>
            ))}
          </ul>
          <span aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {parts.map((p) => (
              <span key={p.key} style={{ width: `${p.share * 100}%`, background: p.color }} />
            ))}
          </span>
          <ul aria-hidden="true" className="flex flex-col gap-2 md:max-lg:max-w-md">
            {parts.map((p) => (
              <li key={p.key} className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-center gap-x-2.5 text-sm">
                <span className="h-3 w-3 rounded-[3px]" style={{ background: p.color }} />
                <span className="text-muted">{p.label}</span>
                <span className="num text-fg">{Math.round(p.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {enemyBest && (
        <div className="flex items-center gap-3 rounded-lg border border-line-strong bg-raised p-3">
          <span className="sr-only">{enemyBestLine(enemyBest, name)}</span>
          <Face heroId={enemyBest.heroId} art={art} name={name} />
          <span aria-hidden="true" className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-sm text-muted">Strongest enemy</span>
            <span className="text-sm font-semibold text-fg">{name(enemyBest.heroId)}</span>
            <span className="num">
              {enemyBest.kills}/{enemyBest.deaths}/{enemyBest.assists}
            </span>
            <span className="num text-muted">{amount(enemyBest.netWorth)} net worth</span>
          </span>
        </div>
      )}
    </div>
  );
}

/** Height in rem of the space above and below the line that the biggest swing fills. */
const SWING_REM = 4.5;
/** Fight markers closer than this share of the game would overlap on a phone, so they take the next row. */
const FIGHT_GAP_SHARE = 0.075;

/**
 * Turning points on one game clock: the biggest gold swings as blocks above the line (our way) or below it (the
 * enemy's way), and the key fights as markers under it with their deaths, enemy first.
 */
export function TurningChart({
  swings,
  fights,
  durationS,
  name,
}: {
  swings: Swing[];
  fights: FightFact[];
  durationS: number;
  name: HeroName;
}) {
  const minutes = Math.max(1, durationS / 60);
  const x = (m: number) => `${(Math.min(Math.max(m, 0), minutes) / minutes) * 100}%`;
  const biggest = Math.max(1, ...swings.map((s) => Math.abs(s.change)));
  const anyAgainst = swings.some((s) => s.change < 0);
  const rows = fightRows(
    fights.map((f) => f.startMinute),
    minutes * FIGHT_GAP_SHARE,
  );
  const fightRowsCount = fights.length ? Math.max(...rows) + 1 : 0;
  const ticks = [...Array(Math.floor((minutes - 4) / 10) + 1).keys()].map((i) => i * 10);

  return (
    <div className="flex flex-col gap-4">
      <ul className="sr-only">
        {swings.map((s) => (
          <li key={`s${s.fromMinute}`}>{swingLine(s)}</li>
        ))}
        {fights.map((f) => (
          <li key={`f${f.startMinute}`}>{fightLine(f, name)}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="relative mx-3">
        {/* Swings: above the line when the gold went our way, below when it went theirs. */}
        <div className="relative" style={{ height: `${SWING_REM + 1.5}rem` }}>
          {swings
            .filter((s) => s.change >= 0)
            .map((s) => (
              <SwingBlock key={s.fromMinute} swing={s} x={x} biggest={biggest} />
            ))}
          <span className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
        </div>
        {anyAgainst && (
          <div className="relative" style={{ height: `${SWING_REM + 1.5}rem` }}>
            {swings
              .filter((s) => s.change < 0)
              .map((s) => (
                <SwingBlock key={s.fromMinute} swing={s} x={x} biggest={biggest} />
              ))}
          </div>
        )}
        {fightRowsCount > 0 && (
          <div className="relative mt-3" style={{ height: `${fightRowsCount * 1.75}rem` }}>
            {fights.map((f, i) => {
              const won = f.goldSwing >= 0;
              return (
                <span
                  key={f.startMinute}
                  title={fightLine(f, name)}
                  className={`num absolute flex h-6 min-w-9 -translate-x-1/2 items-center justify-center rounded-md px-1.5 text-xs text-bg ${
                    won ? "bg-radiant" : "bg-dire"
                  }`}
                  style={{ left: x(f.startMinute), top: `${rows[i] * 1.75}rem` }}
                >
                  {f.theirDeaths}-{f.ourDeaths}
                </span>
              );
            })}
          </div>
        )}
        <div className="relative mt-2 h-4">
          {ticks.map((t) => (
            <span key={t} className="micro absolute -translate-x-1/2 text-subtle" style={{ left: x(t) }}>
              {t}
            </span>
          ))}
          <span className="micro absolute right-0 translate-x-1/2 text-subtle">{clock(durationS)}</span>
        </div>
      </div>
      <ul aria-hidden="true" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-[3px] bg-radiant/55" />
          Gold Swung Your Way
        </li>
        {anyAgainst && (
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[3px] bg-dire/55" />
            Gold Swung the Enemy&apos;s Way
          </li>
        )}
        {fights.length > 0 && (
          <>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-[3px] bg-radiant" />
              Fight Won (Kills-Deaths)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-[3px] bg-dire" />
              Fight Lost
            </li>
          </>
        )}
      </ul>
    </div>
  );
}

function SwingBlock({ swing, x, biggest }: { swing: Swing; x: (m: number) => string; biggest: number }) {
  const ours = swing.change >= 0;
  const height = `${(Math.abs(swing.change) / biggest) * SWING_REM}rem`;
  const left = x(swing.fromMinute);
  const right = x(swing.toMinute);
  return (
    <span
      className="absolute flex justify-center"
      style={{ left, width: `calc(${right} - ${left})`, ...(ours ? { bottom: 0 } : { top: 0 }), height: `calc(${height} + 1.25rem)` }}
    >
      <span
        className={`absolute inset-x-0 rounded-sm ${ours ? "bottom-0 bg-radiant/55" : "top-0 bg-dire/55"}`}
        style={{ height }}
      />
      <span className={`num absolute whitespace-nowrap text-xs ${ours ? "top-0 text-radiant" : "bottom-0 text-dire"}`}>
        {signedAmount(swing.change)}
      </span>
    </span>
  );
}
