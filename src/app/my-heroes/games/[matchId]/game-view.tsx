import Image from "next/image";
import Link from "next/link";
import { HeroRender } from "@/components/hero-render";
import { Icon, type IconName } from "@/components/icon";
import { PageTour } from "@/components/page-tour";
import { PositionIcon } from "@/components/position-icon";
import type { Finding } from "@/lib/player-feedback";
import { buildingName, clock, type Death, type GameDetail } from "@/lib/player-game";
import { gameLength } from "@/lib/player-games";
import { FindingCard } from "../feedback-view";
import type { HeroArt } from "../previous-games";

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"];
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const number = new Intl.NumberFormat("en-GB");
/** The lane bar's ends: a 2,000 gold gap at 10 minutes fills one side. */
const LANE_SCALE = 2000;
/** The laning stage, shaded on the deaths timeline. */
const LANE_END_S = 600;

const STATUS_NOTES: Record<GameDetail["status"], string | null> = {
  waiting_parse:
    "OpenDota hasn't parsed this game yet, so lane, deaths and percentiles are missing. We check again every 30 minutes.",
  basic: "OpenDota didn't parse this game, so only the basic numbers are here.",
  parsed: null,
};

/** One previous game: the hero and result, the numbers, what went well and what to fix, the lane and every death. */
export function GameView({ game, heroes }: { game: GameDetail; heroes: Map<number, HeroArt> }) {
  const name = (id: number) => heroes.get(id)?.name ?? `Hero ${id}`;
  const hero = heroes.get(game.heroId);
  const status = STATUS_NOTES[game.status];
  const hasFindings = game.strengths.length + game.problems.length > 0;

  return (
    // The render is placed against this wrapper, behind everything in it, so a short header never
    // lets it paint over the Numbers below.
    <div className="relative isolate flex flex-col gap-10">
      <header className="flex min-h-32 flex-col gap-3">
        <HeroRender
          portrait={hero?.image}
          className="absolute -right-16 -top-16 -z-10 w-[min(24rem,70vw)] opacity-70 sm:-right-4 sm:opacity-100"
        />
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="page-title">{name(game.heroId)}</h1>
          <span
            className={`rounded-sm px-3 py-1 text-base font-semibold ${
              game.isWin ? "bg-radiant-tint text-radiant" : "bg-dire-tint text-dire"
            }`}
          >
            {game.isWin ? "Won" : "Lost"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <p className="num flex flex-wrap items-center gap-2.5 text-sm text-muted">
            {game.position ? (
              <>
                <PositionIcon position={game.position} size={18} className="text-muted" />
                {POSITION_NAMES[game.position - 1]}
              </>
            ) : (
              "Position unknown"
            )}
            <span aria-hidden className="text-line-hover">
              |
            </span>
            {dateFormat.format(new Date(game.startedAt))}
            <span aria-hidden className="text-line-hover">
              |
            </span>
            {gameLength(game.durationS)}
          </p>
          <div className="flex flex-wrap gap-2">
            {game.draftId && (
              <Link href={`/reports/${game.draftId}`} className="btn btn-secondary">
                <Icon name="users" />
                Party Report
              </Link>
            )}
            <a
              href={`https://www.opendota.com/matches/${game.matchId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              data-tour="one-game-opendota"
            >
              OpenDota
              <Icon name="external" />
            </a>
            <PageTour tour="one-game" />
          </div>
        </div>
      </header>

      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}

      <Stats game={game} heroName={name(game.heroId)} />

      {game.status === "parsed" &&
        (hasFindings ? (
          // A side with nothing in it is left out rather than shown as an empty box.
          <div
            data-tour="one-game-findings"
            className={`grid gap-8 ${game.strengths.length > 0 && game.problems.length > 0 ? "lg:grid-cols-2" : ""}`}
          >
            {game.strengths.length > 0 && (
              <FindingList id="game-strengths" title="Went Well" tone="strength" findings={game.strengths} />
            )}
            {game.problems.length > 0 && (
              <FindingList id="game-problems" title="To Fix" tone="problem" findings={game.problems} />
            )}
          </div>
        ) : (
          <p role="status" className="notice">
            Nothing stood out in this game: no number was far enough from the average to call it a strength or a problem.
          </p>
        ))}

      {game.lane && <Lane lane={game.lane} />}
      {game.deathList && <Deaths deaths={game.deathList} durationS={game.durationS} heroes={heroes} name={name} />}
    </div>
  );
}

interface Tile {
  label: string;
  icon?: IconName;
  value: React.ReactNode;
  /** Percent of the hero's games this one beat, drawn as a bar. */
  beat?: number | null;
  note?: string | null;
}

// The last tile stretches over the free cells of its row, so the grid never ends in an empty block.
const SPAN_SM = ["", "sm:col-span-4", "sm:col-span-3", "sm:col-span-2"];
const lastTileSpan = (count: number) => `${count % 2 === 1 ? "col-span-2" : ""} ${SPAN_SM[count % 4]}`;

function Stats({ game, heroName }: { game: GameDetail; heroName: string }) {
  const s = game.stats;
  const fmt = (n: number | null) => (n === null ? null : number.format(n));
  const kda =
    game.kills !== null && game.deaths !== null && game.assists !== null ? (
      <>
        {game.kills}
        <span className="text-subtle">/</span>
        <span className="text-dire">{game.deaths}</span>
        <span className="text-subtle">/</span>
        {game.assists}
      </>
    ) : null;
  const main: Tile[] = [
    { label: "KDA", icon: "swords", value: kda, note: s.killShare === null ? null : `In ${s.killShare}% of your team's kills` },
    { label: "Gold per Minute", icon: "coins", value: fmt(game.goldPerMin), beat: s.goldPerMinBeat },
    { label: "Hero Damage", icon: "flame", value: fmt(s.heroDamage), beat: s.heroDamageBeat },
    { label: "Tower Damage", icon: "castle", value: fmt(s.towerDamage) },
  ];
  const more: Tile[] = [
    { label: "Experience per Minute", value: fmt(s.xpPerMin) },
    {
      label: "Last Hits and Denies",
      value:
        s.lastHits === null ? null : (
          <>
            {s.lastHits} <span className="text-subtle">/</span> {s.denies ?? 0}
          </>
        ),
    },
    { label: "Net Worth", value: fmt(s.netWorth) },
    { label: "Level", value: fmt(s.level) },
    { label: "Healing", value: s.heroHealing ? fmt(s.heroHealing) : null },
  ];
  const shown = [...main, ...more].filter((t) => t.value !== null);
  if (shown.length === 0) return null;
  return (
    <section aria-labelledby="game-numbers" data-tour="one-game-numbers" className="flex flex-col gap-3">
      <h2 id="game-numbers" className="section-title">
        Numbers
      </h2>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
        {shown.map((t, i) => (
          <div
            key={t.label}
            className={`flex min-w-0 flex-col gap-1.5 bg-surface p-4 ${i === shown.length - 1 ? lastTileSpan(shown.length) : ""}`}
          >
            <dt className="flex items-center gap-1.5 text-sm text-subtle">
              {t.icon && <Icon name={t.icon} />}
              {t.label}
            </dt>
            <dd className={`num font-semibold text-fg ${t.icon ? "text-2xl" : "text-xl"}`}>{t.value}</dd>
            {t.beat != null && (
              <dd className="flex flex-col gap-1">
                <span className="relative h-1 rounded-full bg-line-strong">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${t.beat >= 50 ? "bg-radiant" : "bg-dire"}`}
                    style={{ width: `${Math.min(100, Math.max(0, t.beat))}%` }}
                  />
                  <span aria-hidden className="absolute -top-1 left-1/2 h-3 w-px bg-subtle" />
                </span>
                <span className="text-xs text-subtle">
                  Better than {t.beat}% of {heroName} games
                </span>
              </dd>
            )}
            {t.note && <dd className="text-xs text-subtle">{t.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

function FindingList({ id, title, tone, findings }: { id: string; title: string; tone: Finding["tone"]; findings: Finding[] }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <h2 id={id} className="section-title flex items-center gap-2">
        <span aria-hidden className={`size-2 rounded-full ${tone === "strength" ? "bg-radiant" : "bg-dire"}`} />
        {title}
      </h2>
      <ol className="flex flex-col gap-3">
        {findings.map((f) => (
          <li key={f.kind}>
            <FindingCard finding={f} open />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Lane({ lane }: { lane: NonNullable<GameDetail["lane"]> }) {
  const diff = lane.netWorthDiff;
  const share = diff === null ? 0 : Math.min(1, Math.abs(diff) / LANE_SCALE) * 50;
  return (
    <section aria-labelledby="game-lane" data-tour="one-game-lane" className="flex flex-col gap-3">
      <h2 id="game-lane" className="section-title">
        Lane at 10 Minutes
      </h2>
      <div className="card grid items-center gap-6 p-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
        {lane.lastHits !== null && (
          <div className="flex gap-6">
            <span className="flex flex-col">
              <span className="num text-3xl font-semibold text-fg">{lane.lastHits}</span>
              <span className="text-xs text-subtle">Last Hits</span>
            </span>
            <span className="flex flex-col">
              <span className="num text-3xl font-semibold text-fg">{lane.denies ?? 0}</span>
              <span className="text-xs text-subtle">Denies</span>
            </span>
          </div>
        )}
        {diff !== null && (
          <div className="flex flex-col gap-2">
            <div aria-hidden className="flex justify-between text-xs text-subtle">
              <span>Behind</span>
              <span>Even</span>
              <span>Ahead</span>
            </div>
            <div aria-hidden className="relative h-2.5 rounded-full bg-raised">
              <span
                className={`absolute inset-y-0 ${diff < 0 ? "right-1/2 rounded-l-full bg-dire" : "left-1/2 rounded-r-full bg-radiant"}`}
                style={{ width: `${share}%` }}
              />
              <span className="absolute -top-1 left-1/2 h-[18px] w-0.5 -translate-x-1/2 bg-subtle" />
            </div>
            <p className="text-sm text-muted">
              {diff === 0 ? (
                "Even with the richest enemy in your lane."
              ) : (
                <>
                  <span className={`num font-semibold ${diff > 0 ? "text-radiant" : "text-dire"}`}>
                    {number.format(Math.abs(diff))} net worth {diff > 0 ? "ahead of" : "behind"}
                  </span>{" "}
                  the richest enemy in your lane.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Deaths({
  deaths,
  durationS,
  heroes,
  name,
}: {
  deaths: Death[];
  durationS: number;
  heroes: Map<number, HeroArt>;
  name: (id: number) => string;
}) {
  const gold = deaths.reduce((n, d) => n + d.goldLost, 0);
  const dead = deaths.reduce((n, d) => n + d.timeDead, 0);
  const at = (s: number) => `${Math.min(100, Math.max(0, (100 * s) / durationS))}%`;
  const early = deaths.filter((d) => d.time < LANE_END_S).length;
  // Keep the last tick clear of the game length label at the right end, on a phone too.
  const ticks = [600, 1200, 1800, 2400, 3000, 3600].filter((t) => t < durationS * 0.88);
  return (
    <section aria-labelledby="game-deaths" data-tour="one-game-deaths" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="game-deaths" className="section-title">
          Deaths <span className="num text-base font-medium text-subtle">{deaths.length}</span>
        </h2>
        {deaths.length > 0 && (
          <p className="text-sm text-muted">
            <span className="num font-semibold text-fg">{number.format(gold)}</span> gold lost and{" "}
            <span className="num font-semibold text-fg">{clock(dead)}</span> dead
          </p>
        )}
      </div>
      {deaths.length === 0 ? (
        <p className="text-sm text-muted">You didn&apos;t die this game.</p>
      ) : (
        <>
          <div className="card px-5 pb-3 pt-5">
            <div
              role="img"
              aria-label={`${deaths.length} deaths on the game clock, ${early} of them before 10 minutes`}
              className="relative h-16"
            >
              <span className="absolute left-0 top-[34px] h-2 rounded-l-full bg-dire-tint" style={{ width: at(LANE_END_S) }} />
              <span className="absolute inset-x-0 top-[37px] h-0.5 bg-line-strong" />
              {deaths.map((d, i) => {
                const art = d.killerHeroId ? heroes.get(d.killerHeroId) : undefined;
                const isEarly = d.time < LANE_END_S;
                return (
                  <span
                    key={i}
                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: at(d.time) }}
                  >
                    {art?.image ? (
                      <Image
                        src={art.image}
                        alt=""
                        width={40}
                        height={22}
                        className={`h-[22px] w-10 rounded-xs object-cover ${isEarly ? "outline-2 outline-dire" : ""}`}
                      />
                    ) : (
                      <span className="flex h-[22px] w-10 items-center justify-center rounded-xs bg-raised text-subtle">
                        <Icon name="skull" />
                      </span>
                    )}
                    <span className={`mt-0.5 h-[22px] w-0.5 ${isEarly ? "bg-dire" : "bg-muted"}`} />
                  </span>
                );
              })}
            </div>
            <div aria-hidden className="num relative h-5 text-xs text-subtle">
              <span className="absolute left-0">0:00</span>
              {ticks.map((t) => (
                <span key={t} className="absolute -translate-x-1/2" style={{ left: at(t) }}>
                  {clock(t)}
                </span>
              ))}
              <span className="absolute right-0">{gameLength(durationS)}</span>
            </div>
          </div>
          <ol className="flex flex-col divide-y divide-line border-y border-line">
            {deaths.map((d, i) => {
              const art = d.killerHeroId ? heroes.get(d.killerHeroId) : undefined;
              return (
                <li
                  key={i}
                  className="grid grid-cols-[3.5rem_2.5rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 py-2.5 sm:grid-cols-[3.5rem_2.5rem_minmax(0,1fr)_auto]"
                >
                  <span className="num text-sm font-semibold text-fg">{clock(d.time)}</span>
                  {art?.image ? (
                    <Image src={art.image} alt="" width={40} height={22} className="h-[22px] w-10 rounded-xs object-cover" />
                  ) : (
                    <span className="flex h-[22px] w-10 items-center justify-center rounded-xs bg-raised text-subtle">
                      <Icon name="skull" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-fg">
                    {d.killerHeroId ? name(d.killerHeroId) : "Creeps or a tower"}
                    {d.isKillerFromMid && (
                      <span className="rounded-xs bg-dire-tint px-2 py-0.5 text-xs text-dire">Rotation from Mid</span>
                    )}
                    {d.buildingsLost.length > 0 && (
                      <span className="flex items-center gap-1.5 rounded-xs bg-dire-tint px-2 py-0.5 text-xs text-dire">
                        <Icon name="castle" />
                        Lost while dead: {d.buildingsLost.map(buildingName).join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="num col-start-3 text-sm text-muted sm:col-start-auto sm:text-right">
                    {number.format(d.goldLost)} gold, {d.timeDead}s dead
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
