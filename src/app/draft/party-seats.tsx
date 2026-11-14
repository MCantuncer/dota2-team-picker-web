import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CutOutline, HeroFace } from "@/components/hero-frame";
import { Icon } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import { POSITIONS, type Position } from "@/lib/engine/types";
import { POSITION_NAMES } from "@/lib/party";
import { seatCount, type PartySeat } from "@/lib/party-seats";
import { AddButton } from "./team-seats";

/** What the player may do on the seats; each is left out when they may not. */
export interface SeatControls {
  /** The seat the picker is open for. */
  adding: Position | null;
  /** Opens the picker on an open seat: invite someone (leader) or move someone there (planner). */
  add?: (position: Position) => void;
  /** Opens the picker on someone else's seat, to swap another player in (planner). */
  swap?: (position: Position) => void;
  /** Removes a member or frees a seated player's seat (leader). */
  remove?: (seat: PartySeat) => void;
  /** Sends a Not on Site player's invite again (leader). */
  reinvite?: (seat: PartySeat) => void;
}

/**
 * One quiet corner button on someone else's seat, opening what the player may do with it: Invite
 * Again, Swap Someone In, Remove or Free Seat. One button keeps the seat's labels clear.
 */
function SeatMenu({ seat, controls }: { seat: PartySeat; controls: SeatControls }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const items = [
    ...(seat.status === "away" && controls.reinvite ? [{ label: "Invite Again", run: () => controls.reinvite?.(seat), danger: false }] : []),
    ...(controls.swap ? [{ label: "Swap Someone In", run: () => controls.swap?.(seat.position), danger: false }] : []),
    ...(controls.remove
      ? [{ label: seat.status === "in" ? "Remove from Party" : "Free Seat", run: () => controls.remove?.(seat), danger: true }]
      : []),
  ];
  if (!items.length) return null;

  const onMenuKey = (e: React.KeyboardEvent) => {
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      // Closing the menu must not also clear the draft.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      buttons.at((at + (e.key === "ArrowDown" ? 1 : -1)) % buttons.length)?.focus();
    } else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`More for ${seat.name}`}
        title={`More for ${seat.name}`}
        onClick={() => setOpen((o) => !o)}
        className={`flex size-6 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg [&_svg]:size-3.5 ${open ? "bg-raised text-fg" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"}`}
      >
        <Icon name="more" />
      </button>
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={`Actions for ${seat.name}`}
        hidden={!open}
        onKeyDown={onMenuKey}
        className="absolute top-full right-0 z-20 mt-1 w-56 rounded-xl bg-surface p-1 shadow-xl ring-1 shadow-black/40 ring-line-strong ring-inset"
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              item.run();
            }}
            className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm outline-none hover:bg-hover focus-visible:bg-hover ${item.danger ? "text-dire" : "text-fg"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A hero's name and 16:9 portrait; the portrait is missing when the hero list couldn't be loaded. */
interface HeroArt {
  name: string;
  image?: string;
}

type Status = PartySeat["status"] | "captain";

/** How a player holds their seat, in words: In Party, Invited, Not on Site, or Draft Captain. */
function StatusLine({ status }: { status: Status }) {
  if (status === "in")
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <span aria-hidden className="live-dot text-radiant" />
        In Party
      </span>
    );
  if (status === "captain")
    return (
      <span className="flex items-center gap-1.5 text-xs text-accent [&_svg]:size-3">
        <Icon name="crown" />
        Draft Captain
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted [&_svg]:size-3">
      <span className={status === "invited" ? "text-warn" : "text-subtle"}>
        <Icon name={status === "invited" ? "clock" : "monitor"} />
      </span>
      {status === "invited" ? "Invited" : "Not on Site"}
    </span>
  );
}

/**
 * The Team Seats in a party: each position holds a member (In Party), a player seated who hasn't
 * joined (Invited while their pop-up shows, then Not on Site), or nobody. Seated players are planned
 * with their own heroes, the same as members. One row per seat on a phone, with the state on the right.
 */
export function PartySeats({
  title,
  seats,
  userId,
  captainId,
  hero,
  heroAt,
  actions,
  footer,
  controls,
}: {
  /** The party's name: "Can's Party". */
  title: string;
  seats: PartySeat[];
  userId: string;
  captainId: string | null;
  hero: (id: number) => HeroArt;
  /** The hero picked or planned for a position, shown as a face in its seat. */
  heroAt: (position: Position) => number | null;
  /** The party's buttons, in their own column at the right of the head. */
  actions?: ReactNode;
  /** Notes and errors under the seats. */
  footer?: ReactNode;
  controls?: SeatControls;
}) {
  return (
    <section aria-label="Team Seats" className="flex flex-col gap-3">
      {/* The buttons get their own column, so the name wraps beside them and never runs under them. */}
      <div className="grid items-center gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <p className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <span className="micro text-subtle">Team Seats</span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="live-dot text-radiant" />
            <span className="font-semibold text-fg">{title}</span>
            <span className="text-subtle">{seatCount(seats)}</span>
          </span>
        </p>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
      <ul
        aria-label="Seats"
        data-tour="draft-seats"
        className="grid min-w-0 divide-line rounded-xl bg-surface ring-1 ring-line ring-inset max-sm:divide-y sm:grid-cols-5 sm:divide-x"
      >
        {POSITIONS.map((position) => {
          const seat = seats.find((s) => s.position === position);
          const status: Status | null = seat ? (seat.id === captainId ? "captain" : seat.status) : null;
          const heroId = heroAt(position);
          const art = heroId ? hero(heroId) : null;
          return (
            <li
              key={position}
              data-seat={position}
              className={`group relative flex min-h-18 min-w-0 items-center gap-3 px-5 py-4 max-sm:min-h-16 max-sm:px-4 max-sm:py-3 ${controls?.adding === position ? "bg-accent-tint" : ""}`}
            >
              {art?.image ? (
                <HeroFace portrait={art.image} name={art.name} size={40} />
              ) : (
                <span className="relative size-10 shrink-0" aria-hidden>
                  <CutOutline width={40} height={40} />
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-1.5 max-sm:gap-1">
                <span className="micro flex items-start gap-1.5 text-subtle">
                  <PositionIcon position={position} size={12} className="mt-0.5 shrink-0" />
                  {POSITION_NAMES[position]}
                </span>
                {seat?.id === userId ? (
                  <span className="micro w-fit rounded-full bg-radiant px-2 leading-5 font-semibold text-bg">You</span>
                ) : seat ? (
                  <span className="text-sm font-semibold break-words text-fg">{seat.name}</span>
                ) : controls?.add ? (
                  <AddButton
                    position={position}
                    open={controls.adding === position}
                    label="Add Player"
                    onClick={() => controls.add?.(position)}
                  />
                ) : (
                  <span className="text-sm text-subtle">Open</span>
                )}
                {status && (
                  <span className="max-sm:hidden">
                    <StatusLine status={status} />
                  </span>
                )}
              </span>
              {status && (
                <span className="ml-auto sm:hidden">
                  <StatusLine status={status} />
                </span>
              )}
              {seat && seat.id !== userId && controls && (
                <span className="absolute top-1 right-1">
                  <SeatMenu seat={seat} controls={controls} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {footer}
    </section>
  );
}
