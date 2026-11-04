import Image from "next/image";
import Link from "next/link";
import { FindingIcon } from "./finding-icon";
import { filterQuery, type GameFilters, gameLength, type GameRow, GAMES_PER_PAGE } from "@/lib/player-games";

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"];
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const STATUS_NOTES: Record<GameRow["status"], string | null> = {
  waiting_parse: "Waiting for OpenDota to parse this game",
  basic: "Basic numbers only: OpenDota didn't parse this game",
  parsed: null,
};

export interface HeroArt {
  name: string;
  icon?: string;
}

/**
 * The player's previous games, newest first, with filters for hero, position and result and
 * pages of GAMES_PER_PAGE. The filters are a plain GET form, so they work without JavaScript.
 */
export function PreviousGames({
  rows,
  total,
  filters,
  heroes,
  heroOptions,
}: {
  rows: GameRow[];
  total: number;
  filters: GameFilters;
  heroes: Map<number, HeroArt>;
  /** The heroes the player has games on, for the filter. */
  heroOptions: number[];
}) {
  const name = (id: number) => heroes.get(id)?.name ?? `Hero ${id}`;
  const pages = Math.max(1, Math.ceil(total / GAMES_PER_PAGE));
  const filtered = Boolean(filters.heroId || filters.position || filters.result);

  return (
    <section aria-labelledby="previous-games" className="flex flex-col gap-4 border-t border-line pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="previous-games" className="section-title">
          Previous Games <span className="num text-base font-medium text-subtle">{total}</span>
        </h2>
        <form method="get" className="flex flex-wrap items-center gap-2" aria-label="Filter games">
          <select name="hero" defaultValue={filters.heroId ?? ""} aria-label="Hero" className="field text-sm">
            <option value="">All Heroes</option>
            {heroOptions
              .map((id) => ({ id, name: name(id) }))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
          </select>
          <select name="pos" defaultValue={filters.position ?? ""} aria-label="Position" className="field text-sm">
            <option value="">All Positions</option>
            {POSITION_NAMES.map((p, i) => (
              <option key={p} value={i + 1}>
                {i + 1} {p}
              </option>
            ))}
          </select>
          <select name="result" defaultValue={filters.result ?? ""} aria-label="Result" className="field text-sm">
            <option value="">Won and Lost</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <button type="submit" className="btn btn-secondary btn-sm">
            Filter
          </button>
          {filtered && (
            <Link href="/my-heroes/games" className="link text-sm">
              Clear
            </Link>
          )}
        </form>
      </div>

      {rows.length === 0 ? (
        <p role="status" className="notice">
          {filtered ? "No games match these filters." : "No games read yet. We read new games every 30 minutes."}
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-line border-y border-line">
          {rows.map((g) => (
            <GameItem key={g.matchId} game={g} hero={heroes.get(g.heroId)} heroName={name(g.heroId)} />
          ))}
        </ol>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          {filters.page > 1 ? (
            <Link href={`/my-heroes/games${filterQuery(filters, filters.page - 1)}`} className="link">
              Newer Games
            </Link>
          ) : (
            <span />
          )}
          <span className="num text-subtle">
            Page {filters.page} of {pages}
          </span>
          {filters.page < pages ? (
            <Link href={`/my-heroes/games${filterQuery(filters, filters.page + 1)}`} className="link">
              Older Games
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}

function GameItem({ game, hero, heroName }: { game: GameRow; hero: HeroArt | undefined; heroName: string }) {
  const status = STATUS_NOTES[game.status];
  const kda =
    game.kills !== null && game.deaths !== null && game.assists !== null ? `${game.kills}/${game.deaths}/${game.assists}` : null;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
      <span aria-hidden className={`h-8 w-0.5 rounded-full ${game.isWin ? "bg-radiant" : "bg-dire"}`} />
      {hero?.icon && <Image src={hero.icon} alt="" width={32} height={32} unoptimized className="rounded-xs" />}
      <div className="flex min-w-36 flex-col">
        <Link
          href={`/my-heroes/games/${game.matchId}`}
          aria-label={`${heroName} ${game.isWin ? "won" : "lost"} on ${dateFormat.format(new Date(game.startedAt))}`}
          className="text-sm font-medium text-fg hover:underline"
        >
          {heroName}
        </Link>
        <span className="text-xs text-subtle">
          {game.position ? `Pos ${game.position} ${POSITION_NAMES[game.position - 1]}` : "Position unknown"}
        </span>
      </div>
      <span className={`w-10 text-sm font-medium ${game.isWin ? "text-radiant" : "text-dire"}`}>
        {game.isWin ? "Won" : "Lost"}
      </span>
      <span className="num w-28 text-sm text-muted">
        {dateFormat.format(new Date(game.startedAt))} · {gameLength(game.durationS)}
      </span>
      <span className="num w-20 text-sm text-fg" title="Kills / deaths / assists">
        {kda ?? "?"}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        {game.note ? (
          <span className={`flex items-center gap-2 ${game.note.tone === "problem" ? "text-dire" : "text-radiant"}`}>
            <FindingIcon kind={game.note.kind} tone={game.note.tone} />
            {game.note.text}
          </span>
        ) : status ? (
          <span className="text-subtle">{status}</span>
        ) : (
          <span className="text-subtle">Nothing stood out</span>
        )}
      </span>
      <a
        href={`https://www.opendota.com/matches/${game.matchId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="link text-xs"
        aria-label={`Match ${game.matchId} on OpenDota`}
      >
        OpenDota
      </a>
    </li>
  );
}
