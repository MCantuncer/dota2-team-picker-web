import Link from "next/link";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/party";
import { POSITION_WORDS } from "@/lib/pool-cards";
import type { PositionShare } from "@/lib/recent-form";

interface PositionsCardProps {
  /** Most played first; null when the games could not be read. */
  positions: PositionShare[] | null;
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
export function PositionsCard({ positions, games, poolPositions }: PositionsCardProps) {
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
            <li key={p.position} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 sm:grid-cols-[auto_6.5rem_minmax(0,1fr)_auto]">
              <PositionIcon position={p.position} size={24} className={p === top ? "text-fg" : "text-muted"} />
              <span className={`text-sm ${p === top ? "font-medium text-fg" : "text-muted"}`}>{POSITION_NAMES[p.position]}</span>
              <span className="flex items-center gap-2">
                <span aria-hidden className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-raised sm:block">
                  <span className="block h-full rounded-full bg-muted" style={{ width: `${(100 * p.games) / games}%` }} />
                </span>
                <span className="num w-16 whitespace-nowrap text-right text-sm text-muted">
                  {p.games} {p.games === 1 ? "game" : "games"}
                </span>
              </span>
              <span className="num w-20 whitespace-nowrap text-right text-sm text-fg">
                Won {Math.round((100 * p.wins) / p.games)}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          {positions
            ? "Your positions show here once OpenDota has lane data for your latest games."
            : "Could not load your positions, refresh the page to try again."}
        </p>
      )}
      {top && poolPositions && !poolPositions.has(top.position) && (
        <p className="text-sm text-muted">
          You play {POSITION_WORDS[top.position]} most, but your pool has no {POSITION_WORDS[top.position]} heroes.{" "}
          <Link href="/my-heroes" className="link">
            Add them on My Heroes
          </Link>
          .
        </p>
      )}
    </section>
  );
}
