import Image from "next/image";
import Link from "next/link";
import { OpenDotaButton } from "@/components/external-button";
import { Icon } from "@/components/icon";
import type { Facts, HeroCard } from "@/lib/report-facts";
import { draftLine, headline, heroNotes } from "@/lib/report-text";
import { HurtChart, LaneChart, TurningChart } from "./report-charts";

/** What the report needs to show a hero or an item by its art. Art is optional: names always show. */
export interface ReportArt {
  heroes: Map<number, { name: string; image?: string }>;
  items: Map<number, { name: string; image: string }>;
}

/**
 * A post-game report: the result, then our heroes with the lanes and what hurt beside them, then the turning points
 * on the game clock and the draft. Lanes, turning points, what hurt and the draft need a parsed replay; a part the
 * facts don't have is left out, and the team takes the full width when nothing sits beside it.
 */
export function ReportView({
  facts,
  art,
  myHeroId,
  feedbackHref = null,
}: {
  facts: Facts;
  art: ReportArt;
  myHeroId: number | null;
  /** The player's own game page, once the feedback job has read this game. */
  feedbackHref?: string | null;
}) {
  const name = (id: number) => art.heroes.get(id)?.name ?? `Hero ${id}`;
  const swings = facts.swings ?? [];
  const fights = facts.fights ?? [];
  const damage = facts.damageTaken ?? [];
  const hasLanes = !!facts.lanes && facts.lanes.length > 0;
  const hasHurt = damage.length > 0 || !!facts.enemyBest;
  const hasSide = hasLanes || hasHurt;

  return (
    <div className="flex flex-col gap-6">
      <header className={`flex flex-col gap-2 border-t-2 pt-5 ${facts.won ? "border-t-radiant" : "border-t-dire"}`}>
        <span className={`text-sm font-medium ${facts.won ? "text-radiant" : "text-dire"}`}>{facts.won ? "Won" : "Lost"}</span>
        <p className="text-xl font-semibold leading-9 tracking-[-0.02em] text-fg">{headline(facts)}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm text-muted">
            You played {facts.side === "radiant" ? "Radiant" : "Dire"}. Match <span className="num text-fg">{facts.matchId}</span>
          </p>
          <OpenDotaButton matchId={facts.matchId} />
        </div>
        {feedbackHref && (
          <Link href={feedbackHref} data-tour="report-feedback" className="btn btn-secondary btn-sm self-start">
            Your Feedback
            <Icon name="chevronRight" />
          </Link>
        )}
      </header>

      <div className={`grid grid-cols-1 items-start gap-4 ${hasSide ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : ""}`}>
        <Panel id="report-heroes" tour="report-team" title="Your Team">
          <ul className="flex flex-col divide-y divide-line">
            {facts.heroes.map((hero) => (
              <HeroRow key={hero.heroId} hero={hero} art={art} isMine={hero.heroId === myHeroId} />
            ))}
          </ul>
        </Panel>
        {hasSide && (
          <div className="grid grid-cols-1 gap-4">
            {hasLanes && (
              <Panel id="report-lanes" tour="report-lanes" title="Lanes at 10 Minutes">
                <LaneChart lanes={facts.lanes!} art={art} name={name} />
              </Panel>
            )}
            {hasHurt && (
              <Panel id="report-hurt" tour="report-hurt" title="What Hurt You">
                <HurtChart damage={damage} enemyBest={facts.enemyBest} art={art} name={name} />
              </Panel>
            )}
          </div>
        )}
      </div>

      {(swings.length > 0 || fights.length > 0) && (
        <Panel id="report-turning" tour="report-turning" title="Turning Points">
          <TurningChart swings={swings} fights={fights} durationS={facts.durationS} name={name} />
        </Panel>
      )}
      {facts.draft && facts.draft.length > 0 && (
        <Panel id="report-draft" title="Draft">
          <ul className="flex flex-col gap-2 text-sm">
            {facts.draft.map((d) => (
              <li key={d.heroId}>{draftLine(d, name)}</li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function Panel({ id, title, tour, children }: { id: string; title: string; tour?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} data-tour={tour} className="card flex min-w-0 flex-col gap-4 p-5 sm:p-6">
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

function HeroRow({ hero, art, isMine }: { hero: HeroCard; art: ReportArt; isMine: boolean }) {
  const info = art.heroes.get(hero.heroId);
  const heroName = info?.name ?? `Hero ${hero.heroId}`;
  const notes = heroNotes(hero);
  const items = (hero.keyItems ?? []).flatMap((k) => {
    const item = art.items.get(k.itemId);
    return item ? [{ ...item, minute: k.minute }] : [];
  });

  return (
    <li className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0">
      <span className="relative shrink-0">
        {info?.image ? (
          <Image src={info.image} alt="" width={80} height={45} className="h-11.25 w-20 rounded-xs object-cover" />
        ) : (
          <span className="micro flex h-11.25 w-20 items-center justify-center rounded-xs bg-surface p-1 text-center text-muted">
            {heroName}
          </span>
        )}
        {isMine && (
          <span className="absolute right-0.5 top-0.5 rounded-xs bg-radiant px-1 text-xs font-semibold leading-4 text-bg">You</span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-lg font-semibold leading-6 tracking-[-0.02em] text-fg">{heroName}</span>
          {/* The numbers wrap as one group, so a phone shows them on their own line, never one left alone. */}
          <span className="flex gap-x-3 whitespace-nowrap">
            <span className="num text-sm">
              <span className="sr-only">Kills, deaths, assists: </span>
              {hero.kills}/{hero.deaths}/{hero.assists}
            </span>
            <span className="num text-sm text-muted">{hero.goldPerMin} GPM</span>
            <span className="num text-sm text-muted">{hero.lastHits} LH</span>
          </span>
        </div>
        {notes.length > 0 && (
          <ul className="flex flex-col text-sm">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <ul aria-label={`${heroName} key items`} className="flex flex-wrap gap-2">
            {items.map((item) => (
              <li key={`${item.name}-${item.minute}`} className="flex items-center gap-1 text-xs text-muted">
                <Image src={item.image} alt={item.name} title={item.name} width={32} height={24} className="h-6 w-8 rounded-xs" />
                <span className="num">{item.minute}m</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
