"use client";

import { HeroFace } from "@/components/hero-frame";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { SteamButton } from "@/components/steam-button";
import { PositionIcon } from "@/components/position-icon";
import { POSITIONS, type Position } from "@/lib/engine/types";
import { POSITION_NAMES } from "@/lib/party";
import { SOLO_ME } from "@/lib/solo-queue";
import { type Seat, type TeamPerson } from "@/lib/team-lineup";
import { AddPlayer } from "./add-player";
import type { PlannableStack } from "./use-team-lineup";

/** A hero's name and 16:9 portrait; the portrait is missing when the hero list couldn't be loaded. */
interface HeroArt {
  name: string;
  image?: string;
}

/** Focuses the shown one of the elements matching the selector, after the next render. */
const focusSoon = (selector: string) =>
  requestAnimationFrame(() => {
    const shown = [...document.querySelectorAll<HTMLElement>(selector)].find((el) => el.offsetParent !== null);
    shown?.focus();
  });

/** Plan For, in the toolbar: Just Me, or Team. */
export function PlanForSwitch({ mode, onJustMe, onTeam }: { mode: "me" | "team"; onJustMe: () => void; onTeam: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="micro text-subtle">Plan For</span>
      <div className="lane-seg lane-seg-sm" role="group" aria-label="Plan For">
        <button type="button" aria-pressed={mode === "me"} onClick={onJustMe}>
          Just Me
        </button>
        <button type="button" aria-pressed={mode === "team"} onClick={onTeam}>
          Team
        </button>
      </div>
    </div>
  );
}

/**
 * The Team Seats for Plan For Team: five equal seats by position, each filled with the player, a
 * Stack mate or a friend (mixed, online or not), or left open for a teammate who can play any hero.
 */
export function TeamSeats({
  mode,
  seats,
  people,
  stacks,
  signedIn,
  notice,
  hero,
  heroAt,
  onPlace,
  onRemove,
  onFill,
}: {
  mode: "me" | "team";
  seats: Seat[];
  /** Who can be seated; null before the first load or signed out. */
  people: TeamPerson[] | null;
  stacks: PlannableStack[];
  signedIn: boolean;
  notice: string | null;
  hero: (id: number) => HeroArt;
  /** The hero picked or planned for a position, shown as a face in its seat; none when there is no such hero. */
  heroAt?: (position: Position) => number | null;
  onPlace: (id: string, position: Position) => void;
  onRemove: (id: string) => void;
  onFill: (stackId: string) => void;
}) {
  const [adding, setAdding] = useState<Position | null>(null);
  if (mode === "me" && !notice) return null;
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

  const fillFromStack = stacks.length > 0 && people && (
    <select
      aria-label="Fill From Stack"
      value=""
      onChange={(e) => e.target.value && onFill(e.target.value)}
      className="field btn-sm w-auto shrink-0"
    >
      <option value="">Fill From Stack</option>
      {stacks.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );

  return (
    <section aria-label="Plan For" className="flex flex-col gap-3">
      {notice && (
        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      )}
      {mode === "team" && (
        <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
          {/* Five equal cells in one panel. On a phone the cells stack their parts, so all five seats stay in view. */}
          <ul
            aria-label="Team Seats"
            className="grid min-w-0 flex-1 basis-full grid-cols-5 divide-x divide-line rounded-xl bg-surface ring-1 ring-line ring-inset lg:basis-auto"
          >
            {POSITIONS.map((position) => {
              const seat = seats.find((s) => s.position === position);
              const person = seat && seat.id !== SOLO_ME ? people?.find((p) => p.id === seat.id) : undefined;
              const name = seat ? nameOf(seat.id) : "Open Seat";
              const heroId = heroAt?.(position) ?? null;
              const art = heroId ? hero(heroId) : null;
              const canAdd = signedIn || !meSeated;
              // Stacks they play in, Friend, and Any Hero when they don't share their heroes: the cell's tooltip.
              const about = [
                ...(person?.stacks.filter((s) => s.role !== "owner").map((s) => s.name) ?? []),
                ...(person?.isFriend ? ["Friend"] : []),
                ...(!seat || (person && !person.shared) ? ["Any Hero"] : []),
              ];
              return (
                <li
                  key={position}
                  title={[name, ...about].join(", ")}
                  className={`group relative flex min-h-14 min-w-0 items-center gap-2.5 px-3 py-2 max-sm:flex-col max-sm:items-start max-sm:gap-1.5 max-sm:px-2 ${adding === position ? "bg-accent-tint" : ""}`}
                >
                  {art?.image && <HeroFace portrait={art.image} name={art.name} size={32} />}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    {/* Muted, not subtle, on the open seat's copper wash so the label keeps 4.5:1 contrast. */}
                    <span
                      className={`micro flex items-center gap-1.5 ${adding === position ? "text-muted" : "text-subtle"}`}
                      title={POSITION_NAMES[position]}
                    >
                      <PositionIcon position={position} size={12} />
                      Pos {position}
                    </span>
                    {seat?.id === SOLO_ME ? (
                      <span className="micro w-fit rounded-full bg-radiant px-2 leading-5 font-semibold text-bg">You</span>
                    ) : seat ? (
                      <span className="text-sm font-semibold break-words text-fg">{name}</span>
                    ) : canAdd ? (
                      <AddButton
                        position={position}
                        open={adding === position}
                        label={signedIn ? "Add Player" : "Add Me"}
                        onClick={() => (signedIn ? setAdding(adding === position ? null : position) : pick(SOLO_ME, position))}
                      />
                    ) : (
                      <span className="text-sm text-subtle">Open</span>
                    )}
                  </span>
                  {seat && (
                    <button
                      id={`seat-remove-${position}`}
                      type="button"
                      onClick={() => remove(seat)}
                      aria-label={seat.id === SOLO_ME ? `Remove yourself from Pos ${position}` : `Remove ${name} from Pos ${position}`}
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md text-muted opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-fg focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3"
                    >
                      <Icon name="x" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {fillFromStack}
        </div>
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

/** The quiet Add Player control of an open seat; its label hides on a phone, where the cell is narrow. */
function AddButton({ position, open, label, onClick }: { position: Position; open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-seat-add={position}
      aria-expanded={label === "Add Me" ? undefined : open}
      aria-label={`${label} to Pos ${position}`}
      onClick={onClick}
      className={`btn -ml-1.5 h-6 w-fit gap-1.5 px-1.5 text-sm ${open ? "btn-secondary" : "btn-ghost"}`}
    >
      <Icon name="plus" />
      <span className="max-sm:hidden">{label}</span>
    </button>
  );
}
