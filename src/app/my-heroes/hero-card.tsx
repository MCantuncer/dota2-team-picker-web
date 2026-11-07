"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useRef } from "react";
import { renderOf } from "@/components/hero-render";
import { Icon } from "@/components/icon";
import { daysAgo, type FillNumbers } from "@/lib/top-heroes";

interface CardHero {
  id: number;
  name: string;
  image: string;
}

/** Closes on Escape, and only closes this. */
function useEscape(onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);
}

/** Closes when the player presses anywhere outside `ref`. */
function useOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close.current();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [ref]);
}

/**
 * The Top 3 star: small and sharp, a little shorter than the text beside it. Filled marks a Top 3 hero;
 * the outline is for Remove from Top 3.
 */
export function TopStar({ outline = false }: { outline?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-2.5 shrink-0"
      fill={outline ? "none" : "currentColor"}
      stroke={outline ? "currentColor" : "none"}
      strokeWidth={2.4}
      strokeLinejoin="round"
    >
      <path d="M12 2.5l2.94 6.24 6.81.82-5.02 4.68 1.3 6.74L12 17.6l-6.03 3.38 1.3-6.74-5.02-4.68 6.81-.82z" />
    </svg>
  );
}

/** The swap arrows on a Replace button. */
function SwapIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
    </svg>
  );
}

/**
 * A hero's card on My Heroes, opened from its chip: the numbers from the player's games when the fill
 * added it, then Add to Top 3 or Remove from Top 3, and Remove from the position. A popover under the
 * chip on wider screens, a sheet from the bottom on phones.
 */
export function HeroCard({
  hero,
  positionName,
  source,
  numbers,
  isTop,
  busy,
  onTop,
  onRemove,
  onClose,
}: {
  hero: CardHero;
  positionName: string;
  /** Where the hero came from, shown under its name. */
  source: { kind: "games" } | { kind: "copied"; from: number } | { kind: "own" };
  numbers: FillNumbers | null;
  isTop: boolean;
  busy: boolean;
  onTop: (on: boolean) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  useEscape(onClose);
  useEffect(() => first.current?.focus(), []);
  useOutside(card, onClose);

  const won = numbers ? Math.round((numbers.wins / numbers.games) * 100) : 0;
  const subtitle =
    source.kind === "games" ? (
      <span className="text-xs text-accent sm:text-xs">From Your Games · {positionName}</span>
    ) : source.kind === "copied" ? (
      <span className="text-xs text-muted">
        Copied from Pos {source.from} · {positionName}
      </span>
    ) : (
      <span className="text-xs text-muted">{positionName}</span>
    );

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-30 bg-black/55 sm:hidden" />
      <div
        ref={card}
        role="dialog"
        aria-label={hero.name}
        className="z-40 flex flex-col overflow-hidden bg-raised shadow-lg ring-1 ring-inset ring-line-hover max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-t-xl sm:absolute sm:left-0 sm:top-[calc(100%+8px)] sm:w-[22rem] sm:rounded-md"
        onBlur={(e) => {
          // Clicking elsewhere on the page closes it, like any popover.
          if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) onClose();
        }}
      >
        <div className="relative h-36 bg-surface sm:hidden">
          <Image
            src={renderOf(hero.image) ?? hero.image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[center_25%]"
          />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-3.5">
          <div className="flex items-center gap-3">
            <Image src={hero.image} alt="" width={96} height={54} unoptimized className="rounded-xs max-sm:hidden" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-lg font-semibold text-fg sm:text-[0.9375rem]">{hero.name}</span>
              {subtitle}
            </span>
            <button type="button" onClick={onClose} aria-label="Close" className="btn btn-icon -mr-2 -mt-2 self-start sm:hidden">
              <Icon name="x" large />
            </button>
          </div>
          {numbers && (
            <div className="grid grid-cols-3 gap-1.5">
              <Tile value={numbers.games} label="Games" />
              <Tile value={`${won}%`} label={`Won ${numbers.wins}`} good={won >= 50} />
              <Tile value={daysAgo(new Date(numbers.lastPlayed), new Date())} label="Last Played" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {isTop ? (
              <button ref={first} type="button" disabled={busy} onClick={() => onTop(false)} className="btn btn-secondary pill">
                <TopStar outline />
                Remove from Top 3
              </button>
            ) : (
              <button ref={first} type="button" disabled={busy} onClick={() => onTop(true)} className="btn btn-primary pill">
                <TopStar />
                Add to Top 3
              </button>
            )}
            <button type="button" disabled={busy} onClick={onRemove} className="btn btn-secondary pill">
              <Icon name="trash" />
              Remove from {positionName}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Tile({ value, label, good = false }: { value: ReactNode; label: string; good?: boolean }) {
  return (
    <span className="flex flex-col rounded-xs bg-surface px-2.5 py-1.5">
      <span className={`num text-lg ${good ? "text-radiant" : "text-fg"}`}>{value}</span>
      <span className="text-xs text-subtle">{label}</span>
    </span>
  );
}

/**
 * Add to Top 3 with 3 already chosen: the 3 heroes as large tiles, each with a Replace button, and Cancel.
 * Replace swaps in one step.
 */
export function ReplaceTopCard({
  hero,
  top,
  busy,
  onReplace,
  onCancel,
}: {
  hero: CardHero;
  top: CardHero[];
  busy: boolean;
  onReplace: (heroId: number) => void;
  onCancel: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEscape(onCancel);
  useEffect(() => cancel.current?.focus(), []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-title"
        aria-describedby="replace-line"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-xl flex-col gap-4 overflow-hidden rounded-xl bg-raised shadow-lg ring-1 ring-inset ring-line-hover max-sm:p-0 sm:p-5"
      >
        <div className="relative h-28 bg-surface sm:hidden">
          <Image src={renderOf(hero.image) ?? hero.image} alt="" fill sizes="100vw" className="object-cover object-[center_25%]" />
        </div>
        <div className="flex items-center gap-3.5 max-sm:px-4">
          <Image src={hero.image} alt="" width={112} height={63} unoptimized className="rounded-md max-sm:hidden" />
          <div className="flex flex-col gap-1">
            <h2 id="replace-title" className="text-lg font-semibold text-fg">
              Add {hero.name} to Your Top 3
            </h2>
            <p id="replace-line" className="text-sm text-muted">
              Your Top 3 is full. Pick the hero {hero.name} replaces.
            </p>
          </div>
        </div>
        <ul className="grid gap-2 max-sm:px-4 sm:grid-cols-3 sm:gap-2.5">
          {top.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReplace(h.id)}
                aria-label={`Replace ${h.name} with ${hero.name}`}
                className="group flex w-full items-center gap-3 overflow-hidden rounded-xl bg-surface text-left ring-1 ring-inset ring-line-hover transition-shadow hover:ring-accent disabled:opacity-55 sm:flex-col sm:items-stretch sm:gap-0"
              >
                <Image src={h.image} alt="" width={256} height={144} unoptimized className="aspect-video w-26 object-cover sm:w-full" />
                <span className="flex flex-1 items-center justify-between gap-2 pr-3 sm:flex-col sm:items-stretch sm:p-2.5">
                  <span className="text-sm font-semibold text-fg">{h.name}</span>
                  <span className="flex h-8 items-center justify-center gap-1.5 rounded-[10px] bg-accent-tint px-3 text-[0.8125rem] font-semibold text-accent-bright ring-1 ring-inset ring-accent-deep">
                    <SwapIcon />
                    Replace
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end max-sm:px-4 max-sm:pb-4">
          <button ref={cancel} type="button" onClick={onCancel} className="btn btn-secondary pill max-sm:w-full">
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
