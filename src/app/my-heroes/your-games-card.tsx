import Link from "next/link";
import { Icon } from "@/components/icon";
import { type PlayerRecord, winPercent } from "@/lib/player-record";

/**
 * The way into Your Games from My Heroes: what the feedback found, the record and the latest
 * results as small green and red squares, newest on the left.
 */
export function YourGamesCard({
  record,
  strengths,
  problems,
}: {
  record: PlayerRecord | null;
  strengths: number;
  problems: number;
}) {
  const won = record ? winPercent(record) : null;
  let line = "Strengths and problems from your recent matches. New games show within 30 minutes.";
  if (record && record.games > 0) {
    const found =
      strengths + problems > 0
        ? `${count(strengths, "strength")} and ${count(problems, "problem")} from your last ${record.games} games`
        : `Your last ${record.games} games`;
    line = `${found}. Won ${won}%.`;
  }
  const latest = record?.latest ?? [];
  return (
    <Link href="/my-heroes/games" data-tour="my-heroes-games" className="card flex items-center gap-4 p-4 hover:border-line-hover">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-accent-tint text-accent">
        <Icon name="chart" large />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-base font-semibold text-fg">Your Games</span>
        <span className="text-sm text-muted">{line}</span>
      </span>
      {latest.length > 0 && (
        <span className="hidden items-center gap-1 sm:flex" title={`Last ${latest.length} games, newest first`}>
          <span className="sr-only">
            Last {latest.length} games, newest first: {latest.map((w) => (w ? "won" : "lost")).join(", ")}
          </span>
          {latest.map((w, i) => (
            <span key={i} aria-hidden className={`size-3 rounded-xs ${w ? "bg-radiant" : "bg-dire"}`} />
          ))}
        </span>
      )}
      <span className="text-subtle">
        <Icon name="chevronRight" />
      </span>
    </Link>
  );
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
