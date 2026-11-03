import type { Suggestion } from "@/lib/engine/types";

/** Why a hero is suggested: its lines with their points, its tags, and where the score comes from. */
export function PickWhy({ suggestion, className = "" }: { suggestion: Pick<Suggestion, "reasons" | "tags" | "summary">; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <ul className="flex flex-col gap-0.5">
        {suggestion.reasons.map((r) => (
          <li key={r} className={r.startsWith("Watch out") ? "text-warn" : ""}>
            {r}
          </li>
        ))}
      </ul>
      {suggestion.tags.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {suggestion.tags.map((t) => (
            <span key={t} className="chip text-xs">
              {t}
            </span>
          ))}
        </span>
      )}
      <span className="text-xs text-subtle">{suggestion.summary}</span>
    </div>
  );
}

/** "New" or "Up 2" beside a hero that changed place since the last pick or ban. */
export function MoveMark({ move }: { move: string | undefined }) {
  if (!move) return null;
  return (
    <span className="chip chip-accent text-xs" title="Since the last pick or ban">
      {move}
    </span>
  );
}

/** Beside a suggested hero that is not one of the player's heroes for the position. */
export function OutsidePool({ title = "Not one of your heroes for this position" }: { title?: string }) {
  return (
    <span className="chip text-xs" title={title}>
      Outside Pool
    </span>
  );
}

/** Beside a pool hero that dropped back because it is weak in this draft. */
export function WeakHere() {
  return (
    <span className="chip text-xs text-warn" title="One of your heroes, but weak into this draft: a score below 0, a hard counter on the enemy team, or a matchup of -1.5 or worse">
      Weak Here
    </span>
  );
}
