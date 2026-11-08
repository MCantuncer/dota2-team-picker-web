import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/party";
import { POSITION_WORDS } from "@/lib/pool-cards";
import type { PositionsLately } from "@/lib/recent-form";

interface PositionsCardProps {
  /** Most played first, plus the games with no known position; null when the games could not be read. */
  played: PositionsLately | null;
  /** How many of the latest games were counted. */
  games: number;
  /** Positions that have at least one hero in the player's pool on My Heroes; null when unknown. */
  poolPositions: ReadonlySet<number> | null;
}

/**
 * The positions the player actually played in their latest games, with games and win rate for each, so the rank
 * reads together with where it was earned. Flags the most played position when the pool has no heroes for it,
 * since suggestions lean on that pool.
 */
export function PositionsCard({ played, games, poolPositions }: PositionsCardProps) {
  const positions = played?.positions ?? null;
  const unknown = played?.unknown;
  const top = positions?.[0];
  return (
    <section aria-labelledby="positions-played" className="card flex flex-col gap-3 p-4">
      <span className="flex items-baseline justify-between gap-3">
        <h3 id="positions-played" className="text-base font-semibold text-fg">
          Positions Played
        </h3>
        {top && <span className="text-sm text-muted">Last {games} Games</span>}
      </span>
      {positions && top ? (
        <ul className="flex flex-col gap-2.5">
          {positions.map((p) => (
            <PositionRow
              key={p.position}
              icon={<PositionIcon position={p.position} size={24} className={p === top ? "text-fg" : "text-muted"} />}
              name={POSITION_NAMES[p.position]}
              strong={p === top}
              games={p.games}
              wins={p.wins}
              total={games}
            />
          ))}
          {unknown && unknown.games > 0 && (
            <PositionRow
              icon={<UnknownIcon />}
              name="Unknown"
              strong={false}
              games={unknown.games}
              wins={unknown.wins}
              total={games}
            />
          )}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          {positions
            ? "Your positions show here once OpenDota has lane data for your latest games."
            : "Could not load your positions, refresh the page to try again."}
        </p>
      )}
      {top && poolPositions && !poolPositions.has(top.position) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 basis-60 text-sm text-muted">
            You play {POSITION_WORDS[top.position]} most, but your pool has no {POSITION_WORDS[top.position]} heroes.
          </p>
          <Link href="/my-heroes" className="btn btn-secondary btn-sm">
            <Icon name="plus" />
            Add {POSITION_NAMES[top.position]} Heroes
          </Link>
        </div>
      )}
    </section>
  );
}

interface PositionRowProps {
  icon: ReactNode;
  name: string;
  /** The most played position reads brighter. */
  strong: boolean;
  games: number;
  wins: number;
  /** All games counted, for the bar. */
  total: number;
}

function PositionRow({ icon, name, strong, games, wins, total }: PositionRowProps) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 sm:grid-cols-[auto_6.5rem_minmax(0,1fr)_auto]">
      {icon}
      <span className={`text-sm ${strong ? "font-medium text-fg" : "text-muted"}`}>{name}</span>
      <span className="flex items-center gap-2">
        <span aria-hidden className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-raised sm:block">
          <span className="block h-full rounded-full bg-muted" style={{ width: `${(100 * games) / total}%` }} />
        </span>
        <span className="num w-16 whitespace-nowrap text-right text-sm text-muted">
          {games} {games === 1 ? "game" : "games"}
        </span>
      </span>
      <span className="num w-20 whitespace-nowrap text-right text-sm text-fg">Won {Math.round((100 * wins) / games)}%</span>
    </li>
  );
}

/** A dashed tile the size of a position tile, for games whose position isn't known. Decorative. */
function UnknownIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" aria-hidden className="text-muted">
      <rect x="1" y="1" width="22" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.9" r="1.1" fill="currentColor" />
    </svg>
  );
}
