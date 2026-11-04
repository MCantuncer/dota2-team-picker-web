import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type { Facts, HeroCard } from "@/lib/report-facts";
import {
  damageLine,
  draftLine,
  enemyBestLine,
  fightLine,
  headline,
  heroNotes,
  laneLine,
  swingLine,
} from "@/lib/report-text";

/** What the report needs to show a hero or an item by its art. Art is optional: names always show. */
export interface ReportArt {
  heroes: Map<number, { name: string; image?: string }>;
  items: Map<number, { name: string; image: string }>;
}

/**
 * A post-game report: the result, then each of our heroes, then the parts that need a parsed
 * replay (lanes, turning points, what hurt, the draft). A part the facts don't have is left out.
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
  const turning = [...(facts.swings ?? []).map(swingLine), ...(facts.fights ?? []).map((f) => fightLine(f, name))];
  const hurt = [...(facts.damageTaken ?? []).map(damageLine), ...(facts.enemyBest ? [enemyBestLine(facts.enemyBest, name)] : [])];

  return (
    <div className="flex flex-col gap-8">
      <header className={`flex flex-col gap-2 border-t-2 pt-5 ${facts.won ? "border-t-radiant" : "border-t-dire"}`}>
        <span className={`text-sm font-medium ${facts.won ? "text-radiant" : "text-dire"}`}>{facts.won ? "Won" : "Lost"}</span>
        <p className="text-3xl font-semibold leading-9 tracking-[-0.02em] text-fg">{headline(facts)}</p>
        <p className="text-sm text-muted">
          You played {facts.side === "radiant" ? "Radiant" : "Dire"}.{" "}
          <a href={`https://www.opendota.com/matches/${facts.matchId}`} target="_blank" rel="noopener noreferrer" className="link">
            Match <span className="num">{facts.matchId}</span> on OpenDota
          </a>
        </p>
        {feedbackHref && (
          <Link href={feedbackHref} className="btn btn-secondary btn-sm self-start">
            Your Feedback
            <Icon name="chevronRight" />
          </Link>
        )}
      </header>

      <section aria-labelledby="report-heroes" className="flex flex-col gap-3">
        <h2 id="report-heroes" className="section-title">
          Your Team
        </h2>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {facts.heroes.map((hero) => (
            <HeroRow key={hero.heroId} hero={hero} art={art} isMine={hero.heroId === myHeroId} />
          ))}
        </ul>
      </section>

      {facts.lanes && (
        <LineSection id="report-lanes" title="Lanes at 10 Minutes" lines={facts.lanes.map((l) => laneLine(l, name))} />
      )}
      {turning.length > 0 && <LineSection id="report-turning" title="Turning Points" lines={turning} />}
      {hurt.length > 0 && <LineSection id="report-hurt" title="What Hurt You" lines={hurt} />}
      {facts.draft && facts.draft.length > 0 && (
        <LineSection id="report-draft" title="Draft" lines={facts.draft.map((d) => draftLine(d, name))} />
      )}
    </div>
  );
}

function LineSection({ id, title, lines }: { id: string; title: string; lines: string[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 border-t border-line pt-5">
      <h2 id={id} className="section-title">
        {title}
      </h2>
      <ul className="flex max-w-3xl flex-col gap-1.5 text-sm">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
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
    <li className="flex items-start gap-4 py-3">
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
          <span className="num text-sm">
            <span className="sr-only">Kills, deaths, assists: </span>
            {hero.kills}/{hero.deaths}/{hero.assists}
          </span>
          <span className="num text-sm text-muted">{hero.goldPerMin} GPM</span>
          <span className="num text-sm text-muted">{hero.lastHits} LH</span>
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
