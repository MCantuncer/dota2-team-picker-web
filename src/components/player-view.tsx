"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { LanePlan, LaneVerdict, PlayerPlan } from "@/lib/engine/game-plan";
import type { Snapshot } from "@/lib/engine/types";
import { PlayerItems } from "./player-items";
import { SkillPlanCard } from "./skill-plan-card";

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"];
const VERDICT_LABELS: Record<LaneVerdict, string> = { win: "Won lane", even: "Even lane", hard: "Hard lane" };
const VERDICT_STYLES: Record<LaneVerdict, string> = { win: "text-radiant", even: "text-muted", hard: "text-warn" };
const LANE_NOTES: Record<LaneVerdict, string> = {
  win: "You win this lane: buy for trades",
  even: "An even lane: the usual start",
  hard: "A hard lane: buy to survive it",
};

const VIEWS = ["Item Build", "Game Story", "Skills and Talents"] as const;
type View = (typeof VIEWS)[number];

export interface PlayerViewProps {
  players: PlayerPlan[];
  heroName: (id: number) => string;
  icons: Record<number, string>;
  playerNames: (string | null)[];
  myPosition?: number;
  laneOf: (heroId: number) => LanePlan | undefined;
  abilities?: Snapshot["heroAbilities"];
}

/**
 * Each of our players as a tab (accepted C board), the viewer's own hero first and open, so the page
 * starts with their items (Can 2026-11-03: "show the user's hero items first"). Under the player, three
 * views: Item Build (first), Game Story for their lane and job, and Skills and Talents.
 */
export function PlayerView({ players, heroName, icons, playerNames, myPosition, laneOf, abilities }: PlayerViewProps) {
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
  return (
    <section aria-label="Your Hero" className="flex flex-col">
      <Tabs
        label="Players"
        items={ordered.map((p) => ({ key: String(p.position), id: playerTab(p.position), controls: `${id}-player-panel` }))}
        selected={String(player.position)}
        onSelect={(key) => setPicked({ for: myPosition, position: Number(key) })}
        className="flex gap-7 overflow-x-auto border-b border-line"
        render={(key, selected) => {
          const p = ordered.find((x) => String(x.position) === key);
          if (!p) return null;
          const mine = p.position === myPosition;
          const icon = icons[p.heroId];
          return (
            <span className={`-mb-px flex items-center gap-2.5 whitespace-nowrap border-b-2 pb-3 pt-2.5 text-[0.9375rem] ${selected ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}>
              <span className="relative">
                {icon && <Image src={icon} alt="" width={64} height={36} className="h-9 w-16 rounded-xs object-cover" />}
                {mine && <span className="absolute -right-1.5 -top-1.5 rounded-xs bg-radiant px-1 text-[0.625rem] font-semibold leading-[0.875rem] text-bg">You</span>}
              </span>
              <span className="flex flex-col items-start">
                <span>{heroName(p.heroId)}</span>
                <span className="text-xs text-muted">
                  {playerNames[p.position - 1] ?? POSITION_NAMES[p.position - 1]} · Pos {p.position}
                </span>
              </span>
            </span>
          );
        }}
      />
      <div id={`${id}-player-panel`} role="tabpanel" aria-labelledby={playerTab(player.position)} className="flex flex-col">
        <Tabs
          label={`${heroName(player.heroId)} view`}
          items={VIEWS.map((v) => ({ key: v, id: viewTab(v), controls: `${id}-view-panel` }))}
          selected={view}
          onSelect={(key) => setView(key as View)} // The keys are VIEWS.
          className="mt-5 flex flex-wrap justify-start gap-x-5 gap-y-2 sm:justify-center sm:gap-x-8"
          render={(key, selected) => (
            <span className={`block border-b-2 pb-1.5 pt-1 text-base font-medium ${selected ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"}`}>{key}</span>
          )}
        />
        <div id={`${id}-view-panel`} role="tabpanel" aria-labelledby={viewTab(view)} tabIndex={0} className="pt-7 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          {view === "Item Build" && (
            <PlayerItems player={player} heroName={heroName} icons={icons} laneNote={lane ? LANE_NOTES[lane.verdict] : undefined} />
          )}
          {view === "Game Story" && <PlayerStory player={player} lane={lane} heroName={heroName} icons={icons} />}
          {view === "Skills and Talents" &&
            (player.skills ? (
              <SkillPlanCard key={player.position} plan={player.skills} abilities={abilities?.[player.heroId]} portrait={icons[player.heroId]} />
            ) : (
              <p className="text-sm text-muted">No skill data for this hero yet.</p>
            ))}
        </div>
      </div>
    </section>
  );
}

/** The player's lane, their job and what to do if it goes wrong. */
function PlayerStory({ player, lane, heroName, icons }: { player: PlayerPlan; lane?: LanePlan; heroName: (id: number) => string; icons: Record<number, string> }) {
  const face = (heroId: number) => {
    const icon = icons[heroId];
    return icon ? (
      <Image key={heroId} src={icon} alt={heroName(heroId)} width={64} height={36} className="h-9 w-16 rounded-xs object-cover" />
    ) : (
      <span key={heroId}>{heroName(heroId)}</span>
    );
  };
  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      {lane && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">{lane.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
            {lane.ours.map(face)} vs {lane.theirs.length ? lane.theirs.map(face) : "nobody"}
          </div>
          <span className={`text-sm font-medium ${VERDICT_STYLES[lane.verdict]}`}>{VERDICT_LABELS[lane.verdict]}</span>
        </div>
      )}
      <div className="flex max-w-[62ch] flex-col gap-4">
        {lane && <p className="text-[0.9375rem] text-fg">{lane.text}</p>}
        <p className="text-[0.9375rem] text-fg">{player.job}</p>
        {player.fallbacks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h4 className="text-sm font-medium text-muted">If It Goes Wrong</h4>
            <ul className="flex flex-col gap-1 text-sm text-fg/85">
              {player.fallbacks.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
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
  render,
}: {
  label: string;
  items: { key: string; id: string; controls: string }[];
  selected: string;
  onSelect: (key: string) => void;
  className: string;
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
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(item.key)}
            onKeyDown={(e) => move(e, i)}
            className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            {render(item.key, on)}
          </button>
        );
      })}
    </div>
  );
}
