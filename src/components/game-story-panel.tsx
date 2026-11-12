import type { ReactNode } from "react";
import type { GamePlan } from "@/lib/engine/game-plan";
import type { Snapshot } from "@/lib/engine/types";
import { keyItemLateLine } from "./lane-board";
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
  /** Skill build slices, for each player's item paths (If a Key Item Is Late). */
  skillBuilds?: Snapshot["skillBuilds"];
  /** Game plans against the dangerous enemy cores, most dangerous first; each takes his line in Danger Heroes. */
  threats?: DraftThreat[];
}

/**
 * Your Game, for a finished draft: the viewer's own hero first (Can 2026-11-03), and three answer tabs (Can's go
 * on the Your Game mockup, 2026-11-12). Game Story holds how we win and the team's part: the game as a minute
 * line with both teams' key items, the game plans against the enemies who decide it, and what the team does if
 * it goes wrong. It is on that tab alone, so the other tabs do not repeat it.
 */
export function GameStoryPanel({ plan, heroName, icons, playerNames, myPosition, action, abilities, items, skillBuilds, threats = [] }: GameStoryPanelProps) {
  // The Story names heroes, so its art is found by name among this draft's heroes (names are unique in Dota).
  const heroIds = [...plan.players.map((p) => p.heroId), ...plan.lanes.flatMap((l) => [...l.ours, ...l.theirs])];
  const heroIcons = Object.fromEntries(heroIds.flatMap((id) => (icons[id] ? [[heroName(id), icons[id]]] : [])));
  const laneOf = (heroId: number) => plan.lanes.find((l) => l.ours.includes(heroId));
  // Each danger line starts with its hero's name ("Faceless Void: ..."); the plan replaces his.
  const danger = plan.danger.filter((line) => !threats.some((t) => line.startsWith(`${heroName(t.hero)}:`)));
  // The viewer's checkpoint on the clock: their key item's late minute and their "No X by N min?" line.
  const me = plan.players.find((p) => p.position === myPosition);
  const lateLine = me && keyItemLateLine(me);
  const checkpoint = me?.keyItem?.lateMinute !== undefined && lateLine ? { minute: me.keyItem.lateMinute, ...askAndAnswer(lateLine) } : undefined;
  const fork = (plan.teamFallbackSituations ?? []).flatMap((situation, i) => {
    const line = plan.teamFallbacks[i];
    return line && (situation === "aheadAt20" || situation === "behindAt20") ? [{ ahead: situation === "aheadAt20", ...askAndAnswer(line) }] : [];
  }).sort((a, b) => Number(b.ahead) - Number(a.ahead));
  const team = (
    <>
      <div className="flex flex-col gap-3">
        <h3 className="label-caps">The Team</h3>
        <StoryTimeline story={plan.story} heroIcons={heroIcons} items={items} checkpoint={checkpoint} />
      </div>

      {threats.length > 0 && <ThreatPlanPanel threats={threats} hero={(id) => ({ name: heroName(id), portrait: icons[id] })} items={items} />}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* With a game plan above and no other danger hero, the section has nothing to add. */}
        {(danger.length > 0 || threats.length === 0) && (
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
        {fork.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="label-caps">At 20 Min</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {fork.map((f) => (
                <li key={f.question} className={`flex flex-col gap-1.5 rounded-xl border border-line-strong border-l-4 bg-surface p-4 ${f.ahead ? "border-l-radiant" : "border-l-dire"}`}>
                  <b className={`text-[0.9375rem] font-semibold ${f.ahead ? "text-radiant" : "text-dire"}`}>{f.question}</b>
                  <span className="text-sm text-fg/85">{f.answer}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          plan.teamFallbacks.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="label-caps">If the Game Goes Wrong</h3>
              <ul className="flex flex-col gap-1.5 text-fg/85">
                {plan.teamFallbacks.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </>
  );
  return (
    <section aria-label="Your Game" className="flex flex-col gap-6 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Your Game</h2>
        {action}
      </div>

      <PlayerView
        players={plan.players}
        heroName={heroName}
        icons={icons}
        playerNames={playerNames}
        myPosition={myPosition}
        laneOf={laneOf}
        lanes={plan.lanes}
        abilities={abilities}
        skillBuilds={skillBuilds}
        items={items}
        headline={plan.story.headline}
        ready={plan.story.ready}
        team={team}
      />
    </section>
  );
}

/** "Behind at 20? Defend towers." as its question and its answer. A line without a question is all answer. */
export function askAndAnswer(line: string): { question: string; answer: string } {
  const at = line.indexOf("?");
  return at < 0 ? { question: "", answer: line } : { question: line.slice(0, at + 1), answer: line.slice(at + 1).trim() };
}
