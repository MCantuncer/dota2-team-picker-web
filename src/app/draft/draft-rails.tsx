import Image from "next/image";
import type { ReactNode } from "react";
import { CutOutline, LaneMark, laneCutStyle } from "@/components/hero-frame";
import { Icon } from "@/components/icon";
import { TEAM_SIZE } from "@/lib/draft";
import type { Side } from "@/lib/draft-reader/geometry";

/** A rail slot's portrait is 16:9; its Lane Cut is sized as for a 54px tall frame, the slot's height on a wide screen. */
const SLOT_CUT = laneCutStyle(54);
const SLOT_GRID = "grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-5";
const SIDE_TEXT = { radiant: "text-radiant", dire: "text-dire" } as const;
const SIDE_BAR = { radiant: "bg-radiant", dire: "bg-dire" } as const;

interface RailProps {
  title: string;
  /** "2/5" for a team, the number of bans for Bans. */
  count: string;
  /** The team's side, which colours its mark and the bars under its heroes. None for Bans. */
  side?: Side;
  /** The player chose their side, so screen readers hear it with the title. */
  isSideKnown?: boolean;
  /** Set on the heading, for a section labelled by it. */
  headingId?: string;
  /** Shown at the right end of the head: the side switch, or a hint. */
  aside?: ReactNode;
  /** The hero search box; left out when the player can't change the draft or the team is full. */
  input?: ReactNode;
  /** The slots, as list items. */
  children: ReactNode;
  className?: string;
  /** Bans: the head and box on one half of a wide screen, the slots on the other, under the Enemy slots. */
  isWide?: boolean;
  /** For a wide rail: the slots go on the left half (on Dire, where the Enemy is). */
  isSlotsLeft?: boolean;
}

/** One rail of the Lane Board: My Team, Enemy or Bans, with its search box and five equal slots, like Dota's top bar. */
export function Rail({
  title,
  count,
  side,
  isSideKnown = false,
  headingId,
  aside,
  input,
  children,
  className = "",
  isWide = false,
  isSlotsLeft = false,
}: RailProps) {
  const head = (
    <div
      className={`flex min-w-0 flex-col gap-4 ${isWide ? (isSlotsLeft ? "lg:col-start-2 lg:row-start-1" : "") : "contents"}`}
    >
      <div className="flex min-h-8 flex-wrap items-center gap-2.5">
        <LaneMark className={side ? SIDE_TEXT[side] : "text-subtle"} />
        <h2 id={headingId} className="text-base font-semibold whitespace-nowrap text-fg">
          {title} <span className="num ml-1 font-normal text-muted">{count}</span>
          {side && isSideKnown && <span className="sr-only"> {side === "radiant" ? "Radiant" : "Dire"}</span>}
        </h2>
        {aside && <span className="ml-auto flex items-center">{aside}</span>}
      </div>
      {input && (
        <div className="relative">
          {input}
          <span aria-hidden className="kbd pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 max-md:hidden">
            Enter
          </span>
        </div>
      )}
    </div>
  );
  return (
    <section
      aria-label={headingId ? undefined : title}
      aria-labelledby={headingId}
      className={`grid min-w-0 content-start gap-4 p-5 ${isWide ? "lg:col-span-2 lg:grid-cols-2 lg:gap-x-10" : ""} ${className}`}
    >
      {head}
      {/* Three to a row on a phone, so every name fits whole; five from sm up. */}
      <ul className={`${SLOT_GRID} ${isWide && isSlotsLeft ? "lg:col-start-1 lg:row-start-1" : ""}`}>{children}</ul>
    </section>
  );
}

/** A hero's 16:9 portrait in a rail's Lane Cut frame, or a slate tile with the name when the art is missing. */
function SlotArt({ name, portrait, isBanned = false }: { name: string; portrait?: string; isBanned?: boolean }) {
  return (
    <span className="lane-cut aspect-video w-full" style={SLOT_CUT}>
      {portrait ? (
        <Image
          src={portrait}
          alt=""
          width={128}
          height={72}
          className={`size-full object-cover ${isBanned ? "opacity-50 grayscale" : ""}`}
        />
      ) : (
        <span className="micro flex size-full items-center justify-center p-1 text-center text-muted">{name}</span>
      )}
      {isBanned && (
        <svg
          viewBox="0 0 16 9"
          preserveAspectRatio="none"
          className="absolute inset-0 z-2 size-full text-ban"
          aria-hidden
        >
          <path d="M0 9 16 0" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </span>
  );
}

interface RailSlotProps {
  name: string;
  portrait?: string;
  side: Side;
  /** Who entered the hero, in a party draft. */
  by?: string;
  /** Left out when the player can't change the draft. */
  onRemove?: () => void;
  /** The hero's position picker, under the name. */
  children?: ReactNode;
}

/** One picked hero on a team rail: the portrait, a bar in the team's colour, the full name and its position. */
export function RailSlot({ name, portrait, side, by, onRemove, children }: RailSlotProps) {
  return (
    <li className="group flex min-w-0 flex-col gap-2" title={name}>
      <span className="relative block">
        <SlotArt name={name} portrait={portrait} />
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="absolute top-1 right-1 z-4 flex size-5 items-center justify-center rounded-md bg-bg/80 text-muted opacity-0 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3"
          >
            <Icon name="x" />
          </button>
        )}
      </span>
      <span aria-hidden className={`h-0.5 rounded-xs ${SIDE_BAR[side]}`} />
      <span className="micro font-semibold text-fg">{name}</span>
      {children}
      {by && <span className="micro text-subtle">Entered by {by}</span>}
    </li>
  );
}

/** The open slots after a team's picks, so every team shows five: a Lane Cut outline each. */
export function EmptySlots({ filled }: { filled: number }) {
  return Array.from({ length: Math.max(0, TEAM_SIZE - filled) }, (_, i) => (
    <li key={`empty-${i}`} aria-hidden className="flex min-w-0 flex-col">
      <span className="relative block aspect-video w-full">
        <CutOutline width={96} height={54} />
      </span>
    </li>
  ));
}

/** A banned hero: the portrait greyed with the ban stroke, its name under it. A click takes the ban back. */
export function BanSlot({ name, portrait, onUnban }: { name: string; portrait?: string; onUnban?: () => void }) {
  const art = (
    <>
      <SlotArt name={name} portrait={portrait} isBanned />
      <span className="micro text-subtle">{name}</span>
    </>
  );
  return (
    <li className="min-w-0" title={name}>
      {onUnban ? (
        <button onClick={onUnban} aria-label={`Unban ${name}`} className="flex w-full flex-col gap-2 text-left">
          {art}
        </button>
      ) : (
        <span className="flex flex-col gap-2">{art}</span>
      )}
    </li>
  );
}
