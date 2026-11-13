import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import {
  DEFAULT_PERIOD,
  type HeroInsights,
  type HeroLine,
  type HeroSort,
  PERIODS,
  type Period,
  signedPoints,
} from "@/lib/hero-insights";

export interface InsightHero {
  name: string;
  image: string;
}

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"];
const number = new Intl.NumberFormat("en-GB");

/** The Profile link for a period and sort, leaving out the defaults. */
function profileHref(period: Period, sort: HeroSort) {
  const params = new URLSearchParams();
  if (period !== DEFAULT_PERIOD) params.set("period", String(period.days));
  if (sort !== "games") params.set("sort", sort);
  const query = params.toString();
  return query ? `/profile?${query}` : "/profile";
}

/**
 * The player's heroes over the chosen period (a week up to six months): three takeaways (most
 * played, best, costing games), then the top heroes with games, win rate against their own
 * average and the positions they play each hero at on My Heroes.
 */
export function HeroInsightsView({
  insights,
  loaded,
  heroes,
  pool,
  sort,
  period,
}: {
  /** Null when the period has no games, or has not been loaded yet. */
  insights: HeroInsights | null;
  /** False until a sync has saved this period. */
  loaded: boolean;
  heroes: Map<number, InsightHero>;
  /** Positions per hero from My Heroes. */
  pool: Map<number, number[]>;
  sort: HeroSort;
  period: Period;
}) {
  return (
    <section aria-labelledby="heroes-heading" data-tour="profile-heroes" className="flex flex-col gap-5 border-t border-line pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="heroes-heading" className="section-title">
            Your Heroes
          </h2>
          <p className="text-sm text-muted">
            {insights ? (
              <>
                Your public games of {period.words} on OpenDota. You won <span className="num text-fg">{insights.won}%</span> of{" "}
                <span className="num text-fg">{number.format(insights.games)}</span> {insights.games === 1 ? "game" : "games"}.
              </>
            ) : loaded ? (
              `OpenDota has no public games of yours from ${period.words}.`
            ) : (
              `Press the refresh button next to your rank to load ${period.words}.`
            )}
          </p>
        </div>
        <nav aria-label="Period" className="flex gap-1 self-start rounded-md border border-line p-0.5 text-sm sm:self-auto">
          {PERIODS.map((p) => (
            <SegLink key={p.days} href={profileHref(p, sort)} current={p === period} label={p.label} />
          ))}
        </nav>
      </div>
      {insights && <HeroInsightsBody insights={insights} heroes={heroes} pool={pool} sort={sort} period={period} />}
    </section>
  );
}

function HeroInsightsBody({
  insights,
  heroes,
  pool,
  sort,
  period,
}: {
  insights: HeroInsights;
  heroes: Map<number, InsightHero>;
  pool: Map<number, number[]>;
  sort: HeroSort;
  period: Period;
}) {
  const hero = (id: number) => heroes.get(id);
  const maxGames = Math.max(...insights.lines.map((l) => l.games));
  return (
    <>
      <ul aria-label="Takeaways" className="grid gap-3 md:grid-cols-3">
        {insights.mostPlayed && (
          <Takeaway
            title="Most Played"
            line={insights.mostPlayed}
            hero={hero(insights.mostPlayed.heroId)}
            value={`${insights.mostPlayed.games} ${plural(insights.mostPlayed.games, "game")}`}
            text={`Won ${insights.mostPlayed.won}%, ${deltaWords(insights.mostPlayed.delta)}.`}
            tone="neutral"
          />
        )}
        {insights.best && (
          <Takeaway
            title="Best Hero"
            line={insights.best}
            hero={hero(insights.best.heroId)}
            value={`Won ${insights.best.won}%`}
            text={`About ${insights.best.extraWins} more ${plural(insights.best.extraWins, "win")} than your average over ${insights.best.games} games.`}
            tone="good"
          />
        )}
        {insights.worst && (
          <Takeaway
            title="Costing You Games"
            line={insights.worst}
            hero={hero(insights.worst.heroId)}
            value={`Won ${insights.worst.won}%`}
            text={`About ${-insights.worst.extraWins} more ${plural(-insights.worst.extraWins, "loss")} than your average over ${insights.worst.games} games.`}
            tone="bad"
          />
        )}
      </ul>
      {!insights.best && !insights.worst && (
        <p className="text-sm text-subtle">
          Best and worst heroes show once a hero has {period.minGames} games in {period.words}.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <nav aria-label="Sort heroes" className="flex gap-1 self-start rounded-md border border-line p-0.5 text-sm">
          <SegLink href={profileHref(period, "games")} current={sort === "games"} label="Most Played" />
          <SegLink href={profileHref(period, "won")} current={sort === "won"} label="Best Win Rate" />
        </nav>
        <ol aria-label="Heroes" className="flex flex-col divide-y divide-line border-y border-line">
          {insights.lines.map((l) => (
            <HeroRow key={l.heroId} line={l} hero={hero(l.heroId)} positions={pool.get(l.heroId) ?? []} maxGames={maxGames} />
          ))}
        </ol>
        <p className="text-xs text-subtle">
          The bar shows each hero against your average of {insights.won}%: green above, red below.
        </p>
      </div>
    </>
  );
}

const plural = (n: number, word: string) => (n === 1 ? word : word === "loss" ? "losses" : `${word}s`);

function deltaWords(delta: number) {
  if (delta === 0) return "same as your average";
  return `${signedPoints(delta)} ${delta > 0 ? "over" : "under"} your average`;
}

function Takeaway({
  title,
  line,
  hero,
  value,
  text,
  tone,
}: {
  title: string;
  line: HeroLine;
  hero: InsightHero | undefined;
  value: string;
  text: string;
  tone: "good" | "bad" | "neutral";
}) {
  const color = tone === "good" ? "text-radiant" : tone === "bad" ? "text-dire" : "text-fg";
  return (
    <li className="card flex items-center gap-3 p-3">
      {hero && <Image src={hero.image} alt="" width={80} height={45} unoptimized className="shrink-0 rounded-xs" />}
      <span className="flex min-w-0 flex-col">
        <span className="label-caps">{title}</span>
        <span className="truncate text-base font-semibold text-fg">{hero?.name ?? `Hero ${line.heroId}`}</span>
        <span className={`num ${color}`}>{value}</span>
        <span className="text-xs text-muted">{text}</span>
      </span>
    </li>
  );
}

/** One option of a link-based switch: the page in the URL, so it survives reloads and sharing. */
function SegLink({ href, current, label }: { href: string; current: boolean; label: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "page" : undefined}
      className={`rounded-sm px-3 py-1 ${current ? "bg-raised font-medium text-fg" : "text-muted hover:text-fg"}`}
    >
      {label}
    </Link>
  );
}

function HeroRow({
  line,
  hero,
  positions,
  maxGames,
}: {
  line: HeroLine;
  hero: InsightHero | undefined;
  positions: number[];
  maxGames: number;
}) {
  const name = hero?.name ?? `Hero ${line.heroId}`;
  // Half the bar is 20 points: enough room for most heroes, and a clear edge for the rest.
  const reach = Math.min(Math.abs(line.delta), 20) * 2.5;
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 py-2.5 sm:grid-cols-[auto_12rem_minmax(6rem,1fr)_12rem_auto]">
      {hero ? (
        <Image src={hero.image} alt="" width={64} height={36} unoptimized className="rounded-xs" />
      ) : (
        <span className="h-9 w-16 rounded-xs bg-raised" />
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-fg">{name}</span>
        {positions.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {positions.map((p) => (
              <span key={p} className="chip micro" title={`In your ${POSITION_NAMES[p - 1]} pool`}>
                <PositionIcon position={p} size={12} />
                {POSITION_NAMES[p - 1]}
              </span>
            ))}
          </span>
        ) : (
          <span className="micro text-subtle">Not in your pool</span>
        )}
      </span>
      <span className="col-span-2 col-start-2 flex items-center gap-4 sm:contents">
        <span className="flex items-center gap-2">
          <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-raised sm:block" aria-hidden>
            <span className="block h-full rounded-full bg-muted" style={{ width: `${(100 * line.games) / maxGames}%` }} />
          </span>
          <span className="num whitespace-nowrap text-muted sm:w-20 sm:text-right">
            {line.games} {plural(line.games, "game")}
          </span>
        </span>
        <span className="flex flex-1 items-center gap-2">
          <span className="relative h-1.5 flex-1 rounded-full bg-raised" aria-hidden>
            <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line-strong" />
            <span
              className={`absolute inset-y-0 rounded-full ${line.delta >= 0 ? "left-1/2 bg-radiant" : "right-1/2 bg-dire"}`}
              style={{ width: `${reach}%` }}
            />
          </span>
          <span className="num w-10 text-right text-fg">{line.won}%</span>
          <span
            className={`micro w-8 text-right ${line.delta > 0 ? "text-radiant" : line.delta < 0 ? "text-dire" : "text-subtle"}`}
          >
            {signedPoints(line.delta)}
          </span>
        </span>
      </span>
      <Link
        href={`/my-heroes/games?hero=${line.heroId}`}
        aria-label={`Your games on ${name}`}
        className="col-start-3 row-start-1 text-subtle hover:text-fg sm:col-start-auto sm:row-start-auto"
      >
        <Icon name="chevronRight" />
      </Link>
    </li>
  );
}
