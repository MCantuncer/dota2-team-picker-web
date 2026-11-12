import type { ReactNode } from "react";
import type { GamePlan } from "@/lib/engine/game-plan";
import type { Snapshot } from "@/lib/engine/types";
import { PlayerView } from "./player-view";
import { StoryTimeline } from "./story-timeline";
import { ThreatPlanPanel } from "./threat-plan-panel";
import type { DraftThreat } from "@/lib/engine/threat-plan";

export interface GameStoryPanelProps {
  plan: GamePlan;
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id; heroes without one show their name only. */
  icons: Record<number, string>;
  /** Who plays each position (index 0 = pos 1), when known. */
  playerNames: (string | null)[];
  /** The viewer's position: their hero's tab comes first and starts open. */
  myPosition?: number;
  /** Shown beside the heading, such as a button to send the plan. */
  action?: ReactNode;
  /** Each hero's abilities, for the skill order icons. */
  abilities?: Snapshot["heroAbilities"];
  /** Shop items, for the item art on the Story timeline. */
  items?: Snapshot["items"];
  /** The game plan against their most dangerous core, which takes his line in Danger Heroes. */
  threat?: DraftThreat;
}

/**
 * The Game Story for a finished draft: how we win, then the viewer's own hero first (items, lane, skills;
 * Can 2026-11-03), then the team: the game as a minute line with both teams' key items and one thing to do
 * per chapter, the enemies who decide it, and what the team does if it goes wrong.
 */
export function GameStoryPanel({ plan, heroName, icons, playerNames, myPosition, action, abilities, items, threat }: GameStoryPanelProps) {
  // The Story names heroes, so its art is found by name among this draft's heroes (names are unique in Dota).
  const heroIds = [...plan.players.map((p) => p.heroId), ...plan.lanes.flatMap((l) => [...l.ours, ...l.theirs])];
  const heroIcons = Object.fromEntries(heroIds.flatMap((id) => (icons[id] ? [[heroName(id), icons[id]]] : [])));
  const laneOf = (heroId: number) => plan.lanes.find((l) => l.ours.includes(heroId));
  // Each danger line starts with its hero's name ("Faceless Void: ..."); the plan replaces his.
  const danger = threat ? plan.danger.filter((line) => !line.startsWith(`${heroName(threat.hero)}:`)) : plan.danger;
  return (
    <section aria-label="Game Story" className="flex flex-col gap-8 border-t border-line pt-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Game Story</h2>
          {action}
        </div>
        <p className="max-w-3xl text-2xl font-semibold leading-8 tracking-[-0.02em] text-fg">{plan.story.headline}</p>
      </div>

      <PlayerView
        players={plan.players}
        heroName={heroName}
        icons={icons}
        playerNames={playerNames}
        myPosition={myPosition}
        laneOf={laneOf}
        abilities={abilities}
      />

      <div className="flex flex-col gap-3">
        <h3 className="label-caps">The Team</h3>
        <StoryTimeline story={plan.story} heroIcons={heroIcons} items={items} />
      </div>

      {threat && <ThreatPlanPanel threat={threat} hero={(id) => ({ name: heroName(id), portrait: icons[id] })} items={items} />}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* With a game plan above and no other danger hero, the section has nothing to add. */}
        {(danger.length > 0 || !threat) && (
          <div className="flex flex-col gap-2">
            <h3 className="label-caps">Danger Heroes</h3>
            {danger.length ? (
              danger.map((line) => (
                <p key={line} className="notice notice-warn">
                  {line}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted">No enemy stands out.</p>
            )}
          </div>
        )}
        {plan.teamFallbacks.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="label-caps">If the Game Goes Wrong</h3>
            <ul className="flex flex-col gap-1.5 text-fg/85">
              {plan.teamFallbacks.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
