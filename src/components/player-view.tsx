"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { firstLevels, ItemsPreview, itemsPreviewText, SkillsPreview, skillsPreviewText, StoryPreview, storyPreviewText } from "./answer-previews";
import { HeroFace } from "./hero-frame";
import { LaneBoard } from "./lane-board";
import { PositionLabel } from "./position-label";
import type { LanePlan, LaneVerdict, PlayerPlan } from "@/lib/engine/game-plan";
import type { Snapshot } from "@/lib/engine/types";
import { itemForks } from "@/lib/item-forks";
import type { EnemyItem } from "./build-path";
import { PlayerItems } from "./player-items";
import { SkillPlanCard } from "./skill-plan-card";

const LANE_NOTES: Record<LaneVerdict, string> = {
  win: "You win this lane: buy for trades",
  even: "An even lane: the usual start",
  hard: "A hard lane: buy to survive it",
};

const VIEWS = ["Item Build", "Game Story", "Skills and Talents"] as const;
type View = (typeof VIEWS)[number];
const SHORTCUTS: Record<View, string> = { "Item Build": "I", "Game Story": "G", "Skills and Talents": "S" };

export interface PlayerViewProps {
  players: PlayerPlan[];
  heroName: (id: number) => string;
  icons: Record<number, string>;
  playerNames: (string | null)[];
  myPosition?: number;
  laneOf: (heroId: number) => LanePlan | undefined;
  /** Every lane of the plan, for the Game Story's lane map. */
  lanes?: LanePlan[];
  abilities?: Snapshot["heroAbilities"];
  /** Skill build slices, for the item paths in a core item's detail (If It Is Late). */
  skillBuilds?: Snapshot["skillBuilds"];
  /** Shop items, for the names and art of the items late wins bought. */
  items?: Snapshot["items"];
  /** The game in one line, at the top of the Game Story tab. */
  headline?: string;
  /** The minute our team is ready to fight, shown on the Game Story tab itself. */
  ready?: number;
  /** The team's part of the Game Story (the minute line, game plans, danger and fallbacks), only on that tab. */
  team?: ReactNode;
  /** The enemy's key items, set on each Build Path beside our items. */
  enemyItems?: EnemyItem[];
}

/** The keys that open each view while focus is inside Your Game (so typing anywhere else is never taken). */
const VIEW_KEYS: Record<string, View> = { i: "Item Build", g: "Game Story", s: "Skills and Talents" };

/**
 * Your Game: each of our players as a seat, the viewer's own hero first and open, so the page starts with their items
 * (Can 2026-11-03). Under the seats, three answer tabs that show their answer on the tab itself (Can's go on the
 * Your Game mockup, 2026-11-12): the next items, the lane and the ready minute, the first skills. Each view holds
 * only its own part; the team's story is on Game Story alone, so no tab repeats it.
 */
export function PlayerView({ players, heroName, icons, playerNames, myPosition, laneOf, lanes, abilities, skillBuilds, items, headline, ready, team, enemyItems }: PlayerViewProps) {
  const ordered = [...players].sort((a, b) => Number(b.position === myPosition) - Number(a.position === myPosition));
  // The viewer's hero is open until they pick another tab. The viewer's position can arrive after the
  // first render (the draft screen reads it from storage), so a pick is kept per viewer position.
  const [picked, setPicked] = useState<{ for?: number; position: number }>();
  const [view, setView] = useState<View>("Item Build");
  const id = useId();
  const chosen = picked && picked.for === myPosition ? picked.position : undefined;
  const player = ordered.find((p) => p.position === chosen) ?? ordered[0];
  if (!player) return null;
  const lane = laneOf(player.heroId);
  const playerTab = (position: number) => `${id}-player-${position}`;
  const viewTab = (v: View) => `${id}-view-${v.replace(/ /g, "")}`;
  const levels = firstLevels(player, abilities?.[player.heroId]);
  const previews: Record<View, { node: ReactNode; text: string }> = {
    "Item Build": { node: <ItemsPreview player={player} />, text: itemsPreviewText(player) },
    "Game Story": { node: <StoryPreview lane={lane} ready={ready} icons={icons} heroName={heroName} />, text: storyPreviewText(lane, ready, heroName) },
    "Skills and Talents": { node: <SkillsPreview levels={levels} />, text: skillsPreviewText(levels) },
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const el = e.target as HTMLElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.isContentEditable) return;
    const to = VIEW_KEYS[e.key.toLowerCase()];
    if (!to) return;
    e.preventDefault();
    setView(to);
    document.getElementById(viewTab(to))?.focus();
  };
  return (
    <div className="flex flex-col gap-6" onKeyDown={onKeyDown}>
      <Tabs
        label="Players"
        items={ordered.map((p) => ({ key: String(p.position), id: playerTab(p.position), controls: `${id}-player-panel` }))}
        selected={String(player.position)}
        onSelect={(key) => setPicked({ for: myPosition, position: Number(key) })}
        className="-mx-1 flex gap-2 overflow-x-auto overflow-y-hidden px-1 py-1"
        buttonClassName="rounded-lg"
        render={(key, selected) => {
          const p = ordered.find((x) => String(x.position) === key);
          if (!p) return null;
          const mine = p.position === myPosition;
          const icon = icons[p.heroId];
          const who = playerNames[p.position - 1];
          return (
            <span
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg border py-2 pl-2 pr-4 text-left transition-colors ${
                selected ? "border-line-hover bg-raised text-fg" : "border-transparent text-muted hover:bg-raised hover:text-fg"
              }`}
            >
              {icon ? <HeroFace portrait={icon} name={heroName(p.heroId)} size={40} isDecorative /> : null}
              <span className="flex flex-col items-start gap-0.5">
                <span className="flex items-center gap-2 text-[0.9375rem] font-medium">
                  {heroName(p.heroId)}
                  {mine && <span className="rounded-full bg-radiant px-1.5 text-xs font-semibold leading-4 text-bg">You</span>}
                </span>
                <span className="flex items-center gap-1.5 text-[0.8125rem] text-muted">
                  <PositionLabel position={p.position} size={14} iconClassName="text-subtle" />
                  {who && who !== "You" ? <span>· {who}</span> : null}
                </span>
              </span>
            </span>
          );
        }}
      />
      <div id={`${id}-player-panel`} role="tabpanel" aria-labelledby={playerTab(player.position)} className="flex flex-col gap-6">
        <Tabs
          label={`${heroName(player.heroId)} view`}
          items={VIEWS.map((v) => ({ key: v, id: viewTab(v), controls: `${id}-view-panel`, label: v, describedBy: `${viewTab(v)}-preview`, shortcut: SHORTCUTS[v] }))}
          selected={view}
          onSelect={(key) => setView(key as View)} // The keys are VIEWS.
          className="grid grid-cols-3 gap-2 sm:gap-3"
          buttonClassName="rounded-xl"
          render={(key, selected) => {
            const v = key as View; // The keys are VIEWS.
            return (
              <span
                className={`relative flex h-full flex-col gap-4 rounded-xl border p-3 text-left transition-colors sm:px-5 sm:pb-5 sm:pt-4 ${
                  selected
                    ? "border-line-hover bg-raised after:absolute after:inset-x-5 after:-bottom-px after:h-0.5 after:rounded-xs after:bg-accent"
                    : "border-line-strong bg-bg hover:border-line-hover hover:bg-raised"
                }`}
              >
                <span className={`flex items-center justify-center gap-2 text-sm font-semibold sm:justify-between sm:text-base ${selected ? "text-fg" : "text-muted"}`}>
                  {v}
                  <kbd aria-hidden className="kbd hidden sm:inline-flex">
                    {SHORTCUTS[v]}
                  </kbd>
                </span>
                <span aria-hidden className="hidden min-h-13 items-end sm:flex">
                  {previews[v].node}
                </span>
                <span id={`${viewTab(v)}-preview`} className="sr-only">
                  {previews[v].text}
                </span>
              </span>
            );
          }}
        />
        <div id={`${id}-view-panel`} role="tabpanel" aria-labelledby={viewTab(view)} tabIndex={0} className="pt-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          {view === "Item Build" && (
            <PlayerItems
              player={player}
              heroName={heroName}
              icons={icons}
              laneNote={lane ? LANE_NOTES[lane.verdict] : undefined}
              forks={player.build ? itemForks(player.build, skillBuilds?.[player.heroId]?.[player.position]?.itemPaths, items) : []}
              enemyItems={enemyItems}
            />
          )}
          {view === "Game Story" && (
            <div className="flex flex-col gap-10">
              {headline && <p className="max-w-3xl text-2xl font-semibold leading-8 tracking-[-0.02em] text-fg">{headline}</p>}
              {lanes && <LaneBoard lanes={lanes} player={player} heroName={heroName} icons={icons} onClock={player.position === myPosition} />}
              {team}
            </div>
          )}
          {view === "Skills and Talents" &&
            (player.skills ? (
              <SkillPlanCard key={player.position} plan={player.skills} abilities={abilities?.[player.heroId]} portrait={icons[player.heroId]} />
            ) : (
              <p className="text-sm text-muted">No skill data for this hero yet.</p>
            ))}
        </div>
      </div>
    </div>
  );
}

/** A row of tabs with arrow key, Home and End movement, as the ARIA tabs pattern asks. */
function Tabs({
  label,
  items,
  selected,
  onSelect,
  className,
  buttonClassName = "",
  render,
}: {
  label: string;
  items: { key: string; id: string; controls: string; label?: string; describedBy?: string; shortcut?: string }[];
  selected: string;
  onSelect: (key: string) => void;
  className: string;
  /** Classes for each tab button, such as its corner radius so the focus ring follows it. */
  buttonClassName?: string;
  render: (key: string, selected: boolean) => ReactNode;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (e: KeyboardEvent, i: number) => {
    const last = items.length - 1;
    const to = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    const item = items[to];
    if (!item) return;
    e.preventDefault();
    onSelect(item.key);
    refs.current[to]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={className}>
      {items.map((item, i) => {
        const on = item.key === selected;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={item.id}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={item.controls}
            aria-label={item.label}
            aria-describedby={item.describedBy}
            aria-keyshortcuts={item.shortcut}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(item.key)}
            onKeyDown={(e) => move(e, i)}
            className={`cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${buttonClassName}`}
          >
            {render(item.key, on)}
          </button>
        );
      })}
    </div>
  );
}
