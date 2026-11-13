"use client";

import { CutOutline, HeroFace } from "@/components/hero-frame";
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

/** Plan For, in the toolbar: Just Me, or Team. In a party it stays on Team, and `lockedWhy` says why. */
export function PlanForSwitch({
  mode,
  onJustMe,
  onTeam,
  lockedWhy,
}: {
  mode: "me" | "team";
  onJustMe: () => void;
  onTeam: () => void;
  lockedWhy?: string;
}) {
  return (
    <div className="flex items-center gap-2" data-tour="draft-plan">
      <span className="micro text-subtle">Plan For</span>
      <div className="lane-seg lane-seg-sm" role="group" aria-label="Plan For">
        <button type="button" aria-pressed={mode === "me"} onClick={onJustMe} disabled={Boolean(lockedWhy)} title={lockedWhy}>
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
        <div className="flex flex-col gap-3">
          {/* Fill From Stack sits in its own row, so it never fights the seats' height. */}
          {fillFromStack && (
            <div className="flex items-center justify-between gap-3">
              <span className="micro text-subtle">Team Seats</span>
              {fillFromStack}
            </div>
          )}
          {/* Five equal cells in one panel. On a phone the cells stack their parts, so all five seats stay in view. */}
          <ul
            aria-label="Team Seats"
            className="grid min-w-0 grid-cols-5 divide-x divide-line rounded-xl bg-surface ring-1 ring-line ring-inset"
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
                  className={`group relative flex min-h-18 min-w-0 items-center gap-3 px-5 py-4 max-sm:flex-col max-sm:items-start max-sm:gap-2 max-sm:px-2.5 max-sm:py-3 ${adding === position ? "bg-accent-tint" : ""}`}
                >
                  {/* The seat's hero slot: the hero picked or planned for it, or a quiet outline. */}
                  {art?.image ? (
                    <HeroFace portrait={art.image} name={art.name} size={40} />
                  ) : (
                    <span className="relative size-10 shrink-0" aria-hidden>
                      <CutOutline width={40} height={40} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col gap-1.5">
                    {/* Muted, not subtle, on the open seat's copper wash so the label keeps 4.5:1 contrast. */}
                    <span
                      className={`micro flex items-start gap-1.5 max-sm:min-h-8 ${adding === position ? "text-muted" : "text-subtle"}`}
                    >
                      {/* Two lines on a phone, so "Soft Support" can wrap and every seat's next line still lines up. */}
                      <PositionIcon position={position} size={12} className="mt-0.5 shrink-0" />
                      {POSITION_NAMES[position]}
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
