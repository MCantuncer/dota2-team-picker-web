"use client";

import type { TeamPlan } from "@/lib/engine/plan";
import { Icon } from "@/components/icon";
import type { Position } from "@/lib/engine/types";

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"];

/**
 * The planner's team plan (WCST): the best five heroes for the party, from each player's hero pool,
 * re-planned after every pick. Everyone in the party sees it; only the planner gets the buttons. Picked heroes stay; each open slot shows two backups.
 */
export function PartyPlan({
  plan,
  pooled,
  names,
  portrait,
  onPicked,
  onBanned,
}: {
  plan: TeamPlan;
  /** Positions whose player has heroes saved for it. A hero outside them is labeled there; any other seat plays any hero. */
  pooled: Set<Position>;
  /** Display names by user id. */
  names: Record<string, string>;
  portrait: (heroId: number, name: string) => React.ReactNode;
  /** Left out for players watching the planner's screen: they see the plan without the buttons. */
  onPicked?: (heroId: number, position: Position) => void;
  onBanned?: (heroId: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{plan.gamePlan}</p>
      <ol aria-label="Team Plan" className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
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
                  <span data-hero-name className="text-xl font-semibold leading-6 tracking-[-0.02em] text-fg">{slot.name}</span>
                  {slot.locked ? (
                    <span className="micro text-radiant">Picked</span>
                  ) : !pooled.has(slot.position) ? (
                    <span className="micro text-subtle" title="No heroes saved for this position, so this is the best of every hero">
                      Any Hero
                    </span>
                  ) : (
                    !slot.inPool && (
                      <span className="chip text-xs" title="Every one of this player's heroes for this position is taken">
                        Outside Pool
                      </span>
                    )
                  )}
                </div>
              </div>
              {!slot.locked && (
                <>
                  <ul className="flex flex-col gap-0.5 text-sm">
                    {slot.reasons.slice(0, 2).map((r) => (
                      <li key={`${r.kind}${r.text}`}>
                        <span className="num text-fg">{r.lead}</span> {r.text}
                      </li>
                    ))}
                  </ul>
                  {onPicked && onBanned && (
                    <div className="mt-auto flex gap-2 pt-1">
                      <button onClick={() => onPicked(slot.heroId, slot.position)} className="btn btn-primary btn-sm">
                        <Icon name="check" />
                        Picked
                      </button>
                      <button onClick={() => onBanned(slot.heroId)} className="btn btn-secondary btn-sm">
                        <Icon name="ban" />
                        Banned
                      </button>
                    </div>
                  )}
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
