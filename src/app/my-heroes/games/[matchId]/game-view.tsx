import Image from "next/image";
import Link from "next/link";
import type { Finding } from "@/lib/player-feedback";
import { buildingName, clock, type Death, type GameDetail } from "@/lib/player-game";
import { gameLength } from "@/lib/player-games";
import { FindingCard } from "../feedback-view";
import type { HeroArt } from "../previous-games";

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"];
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const number = new Intl.NumberFormat("en-GB");
const signed = (n: number) => `${n > 0 ? "+" : ""}${number.format(n)}`;

const STATUS_NOTES: Record<GameDetail["status"], string | null> = {
  waiting_parse:
    "OpenDota hasn't parsed this game yet, so lane, deaths and percentiles are missing. We check again every 30 minutes.",
  basic: "OpenDota didn't parse this game, so only the basic numbers are here.",
  parsed: null,
};

/** One previous game: what went well, what to fix, the numbers, the lane and every death. */
export function GameView({ game, heroes }: { game: GameDetail; heroes: Map<number, HeroArt> }) {
  const name = (id: number) => heroes.get(id)?.name ?? `Hero ${id}`;
  const hero = heroes.get(game.heroId);
  const status = STATUS_NOTES[game.status];
  const hasFindings = game.strengths.length + game.problems.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center gap-4">
        {hero?.icon && <Image src={hero.icon} alt="" width={48} height={48} unoptimized className="rounded-sm" />}
        <div className="flex flex-col gap-1">
          <h1 className="page-title">
            {name(game.heroId)} <span className={game.isWin ? "text-radiant" : "text-dire"}>{game.isWin ? "Won" : "Lost"}</span>
          </h1>
          <p className="num text-sm text-muted">
            {game.position ? `Pos ${game.position} ${POSITION_NAMES[game.position - 1]}` : "Position unknown"} ·{" "}
            {dateFormat.format(new Date(game.startedAt))} · {gameLength(game.durationS)}
          </p>
        </div>
        <div className="ml-auto flex gap-4 text-sm">
          {game.draftId && (
            <Link href={`/reports/${game.draftId}`} className="link">
              Party Report
            </Link>
          )}
          <a href={`https://www.opendota.com/matches/${game.matchId}`} target="_blank" rel="noopener noreferrer" className="link">
            OpenDota
          </a>
        </div>
      </header>

      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}

      <Stats game={game} />

      {game.status === "parsed" &&
        (hasFindings ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <FindingList id="game-strengths" title="Went Well" tone="strength" findings={game.strengths} />
            <FindingList id="game-problems" title="To Fix" tone="problem" findings={game.problems} />
          </div>
        ) : (
          <p role="status" className="notice">
            Nothing stood out in this game: no number was far enough from the average to call it a strength or a problem.
          </p>
        ))}

      {game.lane && <Lane lane={game.lane} />}
      {game.deathList && <Deaths deaths={game.deathList} name={name} />}
    </div>
  );
}

function Stats({ game }: { game: GameDetail }) {
  const s = game.stats;
  const kda =
    game.kills !== null && game.deaths !== null && game.assists !== null ? `${game.kills}/${game.deaths}/${game.assists}` : null;
  const tiles: { label: string; value: string | null; hint?: string | null }[] = [
    { label: "KDA", value: kda },
    {
      label: "GPM",
      value: game.goldPerMin === null ? null : number.format(game.goldPerMin),
      hint: s.goldPerMinBeat === null ? null : `Beat ${s.goldPerMinBeat}%`,
    },
    { label: "XPM", value: s.xpPerMin === null ? null : number.format(s.xpPerMin) },
    { label: "Last Hits", value: s.lastHits === null ? null : `${s.lastHits}/${s.denies ?? 0}` },
    { label: "Net Worth", value: s.netWorth === null ? null : number.format(s.netWorth) },
    {
      label: "Hero Damage",
      value: s.heroDamage === null ? null : number.format(s.heroDamage),
      hint: s.heroDamageBeat === null ? null : `Beat ${s.heroDamageBeat}%`,
    },
    { label: "Tower Damage", value: s.towerDamage === null ? null : number.format(s.towerDamage) },
    { label: "Healing", value: s.heroHealing ? number.format(s.heroHealing) : null },
  ];
  const shown = tiles.filter((t) => t.value !== null);
  if (shown.length === 0) return null;
  return (
    <section aria-labelledby="game-numbers" className="flex flex-col gap-3">
      <h2 id="game-numbers" className="section-title">
        Numbers
      </h2>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
        {shown.map((t) => (
          <div key={t.label} className="flex flex-col gap-0.5 bg-surface p-3">
            <dt className="label-caps">{t.label}</dt>
            <dd className="num text-lg font-semibold text-fg">{t.value}</dd>
            {t.hint && (
              <dd className="text-xs text-subtle" title="Of all games on this hero on OpenDota">
                {t.hint}
              </dd>
            )}
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
      {findings.length === 0 ? (
        <p className="text-sm text-subtle">Nothing stood out.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {findings.map((f) => (
            <li key={f.kind}>
              <FindingCard finding={f} open />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Lane({ lane }: { lane: NonNullable<GameDetail["lane"]> }) {
  const diff = lane.netWorthDiff;
  return (
    <section aria-labelledby="game-lane" className="flex flex-col gap-2">
      <h2 id="game-lane" className="section-title">
        Lane at 10 Minutes
      </h2>
      <p className="text-sm text-muted">
        {lane.lastHits !== null && (
          <>
            <span className="num text-fg">{lane.lastHits}</span> last hits and{" "}
            <span className="num text-fg">{lane.denies ?? 0}</span> denies.{" "}
          </>
        )}
        {diff !== null &&
          (diff === 0 ? (
            "Even with the richest enemy in your lane."
          ) : (
            <>
              <span className={`num ${diff > 0 ? "text-radiant" : "text-dire"}`}>{signed(diff)}</span> net worth against the
              richest enemy in your lane.
            </>
          ))}
      </p>
    </section>
  );
}

function Deaths({ deaths, name }: { deaths: Death[]; name: (id: number) => string }) {
  const gold = deaths.reduce((n, d) => n + d.goldLost, 0);
  const dead = deaths.reduce((n, d) => n + d.timeDead, 0);
  return (
    <section aria-labelledby="game-deaths" className="flex flex-col gap-3">
      <h2 id="game-deaths" className="section-title">
        Deaths <span className="num text-base font-medium text-subtle">{deaths.length}</span>
      </h2>
      {deaths.length === 0 ? (
        <p className="text-sm text-muted">You didn&apos;t die this game.</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            <span className="num text-fg">{number.format(gold)}</span> gold lost and{" "}
            <span className="num text-fg">{clock(dead)}</span> dead in total.
          </p>
          <ol className="flex flex-col divide-y divide-line border-y border-line">
            {deaths.map((d, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="num w-12 font-medium text-fg">{clock(d.time)}</span>
                <span className="min-w-40 flex-1 text-fg">
                  {d.killerHeroId ? `Killed by ${name(d.killerHeroId)}` : "Killed by creeps or a tower"}
                  {d.isKillerFromMid && <span className="text-subtle"> (rotation from mid)</span>}
                </span>
                <span className="num text-muted">
                  {number.format(d.goldLost)} gold · {d.timeDead}s dead
                </span>
                {d.buildingsLost.length > 0 && (
                  <span className="w-full text-dire">Lost while dead: {d.buildingsLost.map(buildingName).join(", ")}</span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
