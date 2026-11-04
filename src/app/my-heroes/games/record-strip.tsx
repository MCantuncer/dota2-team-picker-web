import Image from "next/image";
import { type PlayerRecord, RECORD_DAYS, winPercent } from "@/lib/player-record";
import type { HeroArt } from "./previous-games";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const day = (iso: string) => dateFormat.format(new Date(iso));

/** The player's record over the feedback window: games, won, fully read, most played. */
export function RecordStrip({ record, hero }: { record: PlayerRecord; hero: HeroArt | undefined }) {
  const won = winPercent(record) ?? 0;
  const top = record.topHero;
  const range = record.firstAt && record.lastAt ? `${day(record.firstAt)} to ${day(record.lastAt)}` : `Last ${RECORD_DAYS} days`;
  return (
    <dl className="grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
      <Tile label="Games">
        <dd className="num text-2xl font-semibold text-fg">{record.games}</dd>
        <dd className="text-xs text-subtle">{range}</dd>
      </Tile>
      <Tile label="Won">
        <dd className={`num text-2xl font-semibold ${won >= 50 ? "text-radiant" : "text-dire"}`}>{won}%</dd>
        <dd className="h-1 overflow-hidden rounded-full bg-line-strong">
          <div className={`h-1 ${won >= 50 ? "bg-radiant" : "bg-dire"}`} style={{ width: `${won}%` }} />
        </dd>
      </Tile>
      <Tile label="Fully Read">
        <dd className="num text-2xl font-semibold text-fg">
          {record.parsed} <span className="text-base font-medium text-subtle">of {record.games}</span>
        </dd>
        <dd className="text-xs text-subtle">Parsed by OpenDota</dd>
      </Tile>
      <Tile label="Most Played">
        {top ? (
          <>
            <dd className="flex min-w-0 items-center gap-2.5">
              {hero?.image && <Image src={hero.image} alt="" width={48} height={27} className="rounded-xs object-cover" />}
              <span className="truncate text-base font-semibold text-fg">{hero?.name ?? `Hero ${top.id}`}</span>
            </dd>
            <dd className="num text-xs text-subtle">
              {top.games} {top.games === 1 ? "game" : "games"}, won {winPercent(top)}%
            </dd>
          </>
        ) : (
          <dd className="text-sm text-subtle">No games yet</dd>
        )}
      </Tile>
    </dl>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-surface px-4 py-3.5">
      <dt className="text-sm text-subtle">{label}</dt>
      {children}
    </div>
  );
}
