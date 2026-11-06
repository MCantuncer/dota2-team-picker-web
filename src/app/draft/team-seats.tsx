"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { SteamButton } from "@/components/steam-button";
import { PositionIcon } from "@/components/position-icon";
import { POSITIONS, type Position } from "@/lib/engine/types";
import type { HeroPool } from "@/lib/party-plan";
import { POSITION_NAMES } from "@/lib/party";
import { SOLO_ME } from "@/lib/solo-queue";
import { LINEUP_MAX, type Seat, type TeamPerson } from "@/lib/team-lineup";
import { AddPlayer } from "./add-player";
import type { PlannableStack } from "./use-team-lineup";

/** A hero's name and 16:9 portrait; the portrait is missing when the hero list couldn't be loaded. */
interface HeroArt {
  name: string;
  image?: string;
}

/** Their first hero for the seat's position, else for any position they saved. */
function topHero(pool: Record<number, number[]> | undefined, position: Position): number | null {
  if (!pool) return null;
  return pool[position]?.[0] ?? pool[0]?.[0] ?? Object.values(pool).find((ids) => ids.length)?.[0] ?? null;
}

/** Focuses the shown one of the elements matching the selector, after the next render. */
const focusSoon = (selector: string) =>
  requestAnimationFrame(() => {
    const shown = [...document.querySelectorAll<HTMLElement>(selector)].find((el) => el.offsetParent !== null);
    shown?.focus();
  });

/**
 * Plan For: Just Me, or Team. Team is five equal seats by position, each filled with the player, a
 * Stack mate or a friend (mixed, online or not), or left open for a teammate who can play any hero.
 */
export function TeamSeats({
  mode,
  seats,
  people,
  pool,
  myHeroes,
  stacks,
  signedIn,
  notice,
  hero,
  onJustMe,
  onTeam,
  onPlace,
  onRemove,
  onFill,
}: {
  mode: "me" | "team";
  seats: Seat[];
  /** Who can be seated; null before the first load or signed out. */
  people: TeamPerson[] | null;
  pool: HeroPool;
  myHeroes: Record<number, number[]>;
  stacks: PlannableStack[];
  signedIn: boolean;
  notice: string | null;
  hero: (id: number) => HeroArt;
  onJustMe: () => void;
  onTeam: () => void;
  onPlace: (id: string, position: Position) => void;
  onRemove: (id: string) => void;
  onFill: (stackId: string) => void;
}) {
  const [adding, setAdding] = useState<Position | null>(null);
  const meSeated = seats.some((s) => s.id === SOLO_ME);
  const nameOf = (id: string) => (id === SOLO_ME ? "You" : (people?.find((p) => p.id === id)?.name ?? "Loading…"));

  const pick = (id: string, position: Position) => {
    onPlace(id, position);
    setAdding(null);
    focusSoon(`#seat-remove-${position}`);
  };
  const remove = (seat: Seat) => {
    onRemove(seat.id);
    focusSoon(`[data-seat-add="${seat.position}"]`);
  };

  return (
    <section aria-label="Plan For" className="flex flex-col gap-3 border-b border-line pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="label-caps">Plan For</span>
        <div className="seg" role="group" aria-label="Plan For">
          <button type="button" aria-pressed={mode === "me"} onClick={onJustMe} className="seg-item">
            Just Me
          </button>
          <button type="button" aria-pressed={mode === "team"} onClick={onTeam} className="seg-item">
            Team
          </button>
        </div>
        {mode === "team" && stacks.length > 0 && people && (
          <select
            aria-label="Fill From Stack"
            value=""
            onChange={(e) => e.target.value && onFill(e.target.value)}
            className="field btn-sm w-auto"
          >
            <option value="">Fill From Stack</option>
            {stacks.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {mode === "team" && (
          <span className="text-sm text-muted">
            <span className="num">{seats.length}</span> of {LINEUP_MAX} seats filled. Open seats get picks for any hero.
          </span>
        )}
      </div>
      {notice && (
        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      )}
      {mode === "team" && (
        <ul aria-label="Team Seats" className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-2.5">
          {POSITIONS.map((position) => {
            const seat = seats.find((s) => s.position === position);
            const heroes = seat ? (seat.id === SOLO_ME ? myHeroes : pool[seat.id]) : undefined;
            const top = seat ? topHero(heroes, position) : null;
            const art = top ? hero(top) : null;
            const person = seat && seat.id !== SOLO_ME ? people?.find((p) => p.id === seat.id) : undefined;
            const name = seat ? nameOf(seat.id) : "Open Seat";
            const canAdd = signedIn || !meSeated;
            return (
              <li
                key={position}
                className={`grid min-w-0 grid-cols-[7rem_1fr] overflow-hidden rounded-md bg-surface ring-1 ring-inset sm:grid-cols-1 ${adding === position ? "ring-accent" : "ring-line-strong"}`}
              >
                <div className="flex items-center gap-1.5 border-line px-2.5 text-xs text-subtle max-sm:col-start-2 max-sm:row-start-1 max-sm:pt-2 sm:h-8 sm:border-b">
                  <PositionIcon position={position} size={14} className="text-muted" />
                  <span className="font-semibold text-fg">Pos {position}</span> {POSITION_NAMES[position]}
                </div>
                <div className="relative aspect-video overflow-hidden bg-raised max-sm:row-span-2 max-sm:row-start-1 max-sm:h-full max-sm:aspect-auto">
                  {art?.image ? (
                    <Image src={art.image} alt="" fill sizes="(min-width: 640px) 20vw, 7rem" unoptimized className="object-cover" />
                  ) : (
                    !seat && (
                      <span aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,var(--raised)_0_10px,var(--surface)_10px_20px)]" />
                    )
                  )}
                  {seat?.id === SOLO_ME && (
                    <span className="absolute left-0 top-0 rounded-br-xs bg-radiant px-1.5 text-xs font-semibold leading-5 text-bg">You</span>
                  )}
                  {seat && (
                    <button
                      id={`seat-remove-${position}`}
                      type="button"
                      onClick={() => remove(seat)}
                      aria-label={seat.id === SOLO_ME ? `Remove yourself from Pos ${position}` : `Remove ${name} from Pos ${position}`}
                      className="btn btn-icon btn-sm absolute right-1.5 top-1.5 size-6 bg-bg/75"
                    >
                      <Icon name="x" />
                    </button>
                  )}
                  {!seat && canAdd && (
                    <span className="absolute inset-0 flex items-center justify-center max-sm:hidden">
                      <AddButton
                        position={position}
                        open={adding === position}
                        label={signedIn ? "Add Player" : "Add Me"}
                        onClick={() => (signedIn ? setAdding(adding === position ? null : position) : pick(SOLO_ME, position))}
                      />
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-2 px-2.5 pb-2.5 pt-1.5 max-sm:col-start-2 max-sm:pb-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={`truncate font-semibold ${seat ? "text-fg" : "font-medium text-muted"}`}>{name}</span>
                    <span className="flex flex-wrap gap-1">
                      {!seat && <span className="chip text-xs">Any Hero</span>}
                      {person?.stacks
                        .filter((s) => s.role !== "owner")
                        .map((s) => (
                          <span key={s.id} className="chip text-xs text-fg">
                            {s.name}
                          </span>
                        ))}
                      {person?.isFriend && <span className="chip text-xs">Friend</span>}
                      {person && !person.shared && <span className="chip text-xs">Any Hero</span>}
                    </span>
                  </span>
                  {!seat && canAdd && (
                    <span className="sm:hidden">
                      <AddButton
                        position={position}
                        open={adding === position}
                        label={signedIn ? "Add" : "Add Me"}
                        onClick={() => (signedIn ? setAdding(adding === position ? null : position) : pick(SOLO_ME, position))}
                      />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {mode === "team" && adding && people && (
        <div className={`flex ${adding > 2 ? "sm:justify-end" : ""}`}>
          <AddPlayer
            position={adding}
            people={people}
            seats={seats}
            stacks={stacks}
            onPick={(id) => pick(id, adding)}
            onClose={() => {
              const at = adding;
              setAdding(null);
              focusSoon(`[data-seat-add="${at}"]`);
            }}
          />
        </div>
      )}
      {mode === "team" && adding && !people && signedIn && <p className="text-sm text-muted">Loading your Stacks and friends…</p>}
      {mode === "team" && !signedIn && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Sign in to add Stack mates and friends.</p>
          <SteamButton next="/draft" small />
        </div>
      )}
    </section>
  );
}

/** The Add button of an open seat. Two copies render (desktop over the art, phone at the row end); only one shows. */
function AddButton({ position, open, label, onClick }: { position: Position; open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-seat-add={position}
      aria-expanded={label === "Add Me" ? undefined : open}
      aria-label={`${label} to Pos ${position}`}
      onClick={onClick}
      className={`btn btn-sm ${open ? "btn-primary" : "btn-secondary"}`}
    >
      <Icon name="plus" />
      {label}
    </button>
  );
}
