import { RankMedal } from "./rank-medal";

/** One choice in a RankRow: a rank (or group of ranks) with its medal, or the choice for no rank at all. */
export interface RankChoice<T> {
  value: T;
  /** The full name, such as "Legend" or "All Ranks". Read to screen readers and shown as the tooltip. */
  name: string;
  /** The medal, 1 (Herald) to 8 (Immortal). Left out, the choice is written as text. */
  medal?: number;
  /** The text of a choice without a medal on a phone, where the row is only as wide as the screen. */
  short?: string;
}

interface RankRowProps<T> {
  choices: RankChoice<T>[];
  value: T;
  onChange: (value: T) => void;
  /** The id of the row's visible label ("Rank"). */
  labelledBy: string;
  /** Why the row is locked, as its tooltip. Set, nothing can be chosen. */
  lockedWhy?: string;
}

/** Medal size in px: fits the compact segmented control. */
const MEDAL_PX = 22;

/**
 * The site's one Rank control: a segmented row of medals, the chosen one with its name. On a phone the medals share
 * the row's width evenly and the names are left out, so nine choices fit beside the label.
 */
export function RankRow<T extends string | number | null>({ choices, value, onChange, labelledBy, lockedWhy }: RankRowProps<T>) {
  const medals = choices.filter((c) => c.medal !== undefined).length;
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="lane-seg lane-seg-sm max-sm:grid max-sm:min-w-0 max-sm:flex-1"
      // Only a grid on a phone (max-sm:grid): text choices take the room they need, the medals share the rest.
      style={{ gridTemplateColumns: `repeat(${choices.length - medals}, auto) repeat(${medals}, minmax(0, 1fr))` }}
    >
      {choices.map((c) => {
        const isChosen = c.value === value;
        return (
          <button
            key={String(c.value)}
            type="button"
            aria-pressed={isChosen}
            aria-label={c.name}
            title={lockedWhy ?? c.name}
            disabled={lockedWhy !== undefined}
            onClick={() => onChange(c.value)}
            className={`inline-flex items-center justify-center gap-1.5 disabled:cursor-default ${isChosen ? "" : "disabled:opacity-50"} ${
              c.medal === undefined ? "max-sm:px-2.5" : "px-1.5 max-sm:px-0"
            }`}
          >
            {c.medal === undefined ? (
              <>
                <span className="sm:hidden">{c.short ?? c.name}</span>
                <span className="max-sm:hidden">{c.name}</span>
              </>
            ) : (
              <>
                <RankMedal rankTier={c.medal * 10} size={MEDAL_PX} />
                {isChosen && <span className="max-sm:hidden">{c.name}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
