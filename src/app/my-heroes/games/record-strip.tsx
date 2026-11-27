import { type PlayerRecord, RECORD_DAYS, winPercent } from "@/lib/player-record";

/** The player's record over the feedback window: games, won, fully read. The most played hero is on the Stage above. */
export function RecordStrip({ record }: { record: PlayerRecord }) {
  const won = winPercent(record) ?? 0;
  return (
    <dl data-tour="your-games-numbers" className="grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
      <Tile label="Games">
        <dd className="num text-xl font-semibold text-fg">{record.games}</dd>
        <dd className="text-xs text-balance text-muted">Last {RECORD_DAYS} days</dd>
      </Tile>
      <Tile label="Won">
        <dd className={`num text-xl font-semibold ${won >= 50 ? "text-radiant" : "text-dire"}`}>{won}%</dd>
        <dd className="h-1 overflow-hidden rounded-full bg-line-strong">
          <div className={`h-1 ${won >= 50 ? "bg-radiant" : "bg-dire"}`} style={{ width: `${won}%` }} />
        </dd>
      </Tile>
      <Tile label="Fully Read">
        <dd className="num text-xl font-semibold text-fg">{record.parsed}</dd>
        {/* The total sits in the small line: beside the number it wrapped under it in a phone's narrow tile. */}
        <dd className="text-xs text-balance text-muted">of {record.games}, parsed by OpenDota</dd>
      </Tile>
    </dl>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-surface px-4 py-3.5 max-sm:px-3">
      <dt className="text-sm text-muted">{label}</dt>
      {children}
    </div>
  );
}
