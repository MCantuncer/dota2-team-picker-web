import Image from "next/image";
import type { ReactNode } from "react";
import { CutOutline, HeroFace, LaneMark, laneCutStyle } from "@/components/hero-frame";
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
}

/** One rail of the Lane Board: My Team or Enemy, with its search box and five equal slots, like Dota's top bar. */
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
}: RailProps) {
  // One row, in reading and Tab order: the mark and title, the side switch or hint, then the search box, which takes
  // the rest of the row. On a phone the box takes its own row. With no box, the switch or hint goes to the far end.
  const head = (
    <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex items-center gap-2.5">
        <LaneMark className={side ? SIDE_TEXT[side] : "text-subtle"} />
        <h2 id={headingId} className="text-base font-semibold whitespace-nowrap text-fg">
          {title} <span className="num ml-1 font-normal text-muted">{count}</span>
          {side && isSideKnown && <span className="sr-only"> {side === "radiant" ? "Radiant" : "Dire"}</span>}
        </h2>
      </div>
      {aside && <span className={`flex items-center ${input ? "max-sm:ml-auto" : "ml-auto"}`}>{aside}</span>}
      {input && (
        <div className="relative min-w-0 flex-1 basis-44 max-sm:basis-full">
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
      className={`grid min-w-0 content-start gap-4 p-5 ${className}`}
    >
      {head}
      {/* Three to a row on a phone, so every name fits whole; five from sm up. */}
      <ul className={SLOT_GRID}>{children}</ul>
    </section>
  );
}

/** A hero's 16:9 portrait in a rail's Lane Cut frame, or a slate tile with the name when the art is missing. */
function SlotArt({ name, portrait }: { name: string; portrait?: string }) {
  return (
    <span className="lane-cut aspect-video w-full" style={SLOT_CUT}>
      {portrait ? (
        <Image src={portrait} alt="" width={128} height={72} className="size-full object-cover" />
      ) : (
        <span className="micro flex size-full items-center justify-center p-1 text-center text-muted">{name}</span>
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

/**
 * Bans as one line under the two teams: the title and count, the box, then every ban as a small greyed face with the
 * ban stroke. The line stays one row tall however many bans a game has, so the bans never push the picks down.
 */
export function BanLine({
  count,
  headingId,
  input,
  children,
}: {
  count: number;
  headingId: string;
  /** The ban search box; left out when the player can't change the draft. */
  input?: ReactNode;
  /** The bans, as BanFace list items. */
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 border-t border-line px-5 py-3 lg:col-span-2"
    >
      <div className="flex items-center gap-2.5">
        <LaneMark className="text-subtle" />
        <h2 id={headingId} className="text-base font-semibold whitespace-nowrap text-fg">
          Bans <span className="num ml-1 font-normal text-muted">{count}</span>
        </h2>
      </div>
      {input && (
        <div className="relative w-full sm:w-60">
          {input}
          <span aria-hidden className="kbd pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 max-md:hidden">
            Enter
          </span>
        </div>
      )}
      <ul className="flex min-w-0 flex-1 basis-64 flex-wrap items-center gap-1">{children}</ul>
    </section>
  );
}

/** A banned hero on the Bans line: a small greyed face with the ban stroke. A click takes the ban back. */
export function BanFace({ name, portrait, onUnban }: { name: string; portrait?: string; onUnban?: () => void }) {
  const face = (
    <span className="relative flex">
      {portrait ? (
        <HeroFace portrait={portrait} name={name} size={26} isDim isDecorative />
      ) : (
        <span className="micro flex h-[1.625rem] items-center rounded-md bg-raised px-1.5 text-muted">{name}</span>
      )}
      {portrait && (
        <svg viewBox="0 0 26 26" className="pointer-events-none absolute inset-0 z-2 size-full text-ban" aria-hidden>
          <path d="M4 22 22 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
  return (
    <li className="flex" title={name}>
      {onUnban ? (
        <button onClick={onUnban} aria-label={`Unban ${name}`} className="flex rounded-md">
          {face}
        </button>
      ) : (
        <span className="flex">
          <span className="sr-only">{name}</span>
          {face}
        </span>
      )}
    </li>
  );
}
