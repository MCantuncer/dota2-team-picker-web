"use client";

import type { TeamPlan } from "@/lib/engine/plan";
import type { Position } from "@/lib/engine/types";

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"];

/**
 * The leader's team plan (WCST): the best five heroes for the party, from each player's hero pool,
 * re-planned after every pick. Picked heroes stay; each open slot shows two backups.
 */
export function PartyPlan({
  plan,
  names,
  portrait,
  onPicked,
  onBanned,
}: {
  plan: TeamPlan;
  /** Display names by user id. */
  names: Record<string, string>;
  portrait: (heroId: number, name: string) => React.ReactNode;
  onPicked: (heroId: number, position: Position) => void;
  onBanned: (heroId: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{plan.gamePlan}</p>
      <ol aria-label="Team plan" className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
        {plan.slots.map((slot) => {
          const player = slot.playerId ? (names[slot.playerId] ?? "Left the party") : "No player";
          return (
            <li key={slot.position} className={`card flex flex-col gap-2 p-3 ${slot.locked ? "border-t-3 border-t-radiant-strong" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="chip micro">Pos {slot.position}</span>
                <span className="micro text-subtle">{POSITION_NAMES[slot.position - 1]}</span>
                <span className={`ml-auto text-sm font-semibold ${slot.playerId ? "" : "text-subtle"}`}>{player}</span>
              </div>
              <div className="flex items-center gap-3">
                {portrait(slot.heroId, slot.name)}
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-heading text-xl font-bold leading-6">{slot.name}</span>
                  {slot.locked ? (
                    <span className="micro text-radiant">Picked</span>
                  ) : (
                    slot.playerId &&
                    !slot.inPool && (
                      <span className="micro text-subtle" title="Not one of this player's heroes for this position">
                        Outside pool
                      </span>
                    )
                  )}
                </div>
              </div>
              {!slot.locked && (
                <>
                  <ul className="flex flex-col gap-0.5 text-sm">
                    {slot.reasons.slice(0, 2).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  {slot.alternatives.length > 0 && (
                    <p className="text-xs text-muted">
                      Backups:{" "}
                      {slot.alternatives.map((a, i) => (
                        <span key={a.heroId}>
                          {i > 0 && ", "}
                          <span className="text-fg">{a.name}</span> <span className="num">{a.scoreDelta.toFixed(1).replace("-", "−")}</span>
                        </span>
                      ))}
                    </p>
                  )}
                  <div className="mt-auto flex gap-2 pt-1">
                    <button onClick={() => onPicked(slot.heroId, slot.position)} className="btn btn-primary btn-sm">
                      Picked
                    </button>
                    <button onClick={() => onBanned(slot.heroId)} className="btn btn-secondary btn-sm">
                      Banned
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {plan.missing.length > 0 && (
        <p className="text-sm text-muted">
          Team still lacks: <span className="text-fg">{plan.missing.join(", ")}</span>
        </p>
      )}
    </div>
  );
}
