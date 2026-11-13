"use client";

import { useCallback, useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { type Box, grow, markTourSeen, placeTip, RING_GAP, scrollFor, seenTours } from "@/lib/page-tour";
import { Icon } from "./icon";
import { TOURS, type TourId, type TourStep } from "./tours";

/**
 * Page Tour (Can's go, 2026-11-13): the ? button at the end of a page's own buttons. It lights up one control at a
 * time, dims the rest, and shows a one line tip with Back and Next; a bottom sheet on a phone. It never starts on its
 * own: a copper dot on the button marks a page whose tour this browser has not opened yet. See docs/design-system.md.
 */
export function PageTour({ tour }: { tour: TourId }) {
  const seen = useSyncExternalStore(subscribeSeen, () => seenTours(storage()).has(tour), () => true);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const start = () => {
    markTourSeen(storage(), tour);
    seenChanged();
    setOpen(true);
  };
  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : start())}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Page Tour"
        title="Page Tour"
        className="btn btn-secondary btn-sm btn-icon tour-button"
      >
        <span aria-hidden>?</span>
        {!seen && <span aria-hidden className="tour-dot" />}
      </button>
      {open && createPortal(<TourOverlay steps={TOURS[tour]} onClose={close} />, document.body)}
    </>
  );
}

type Layout = { box: Box; tipHeight: number; topInset: number; screen: { width: number; height: number } };

function TourOverlay({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  // The steps whose control is on screen now; the count the player sees is these.
  const [list] = useState(() => steps.filter((s) => findTarget(s.target)));
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const sheet = useMedia("(max-width: 639px)");
  const touch = useMedia("(pointer: coarse)");
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const step = list[index];
  const last = index === list.length - 1;
  // Between steps the last box stays up for the one frame until the new control is measured, so nothing flickers.
  const shown = step ? layout : null;

  const next = () => (last ? onClose() : setIndex(index + 1));
  const back = () => setIndex(Math.max(0, index - 1));
  const onLitClick = useEffectEvent(() => {
    if (step?.movesOn) next();
  });
  const onGone = useEffectEvent(() => next());

  // Each step: bring its control into view, then follow its box every frame, so the ring stays on it while the page
  // scrolls or changes under it. The lit control stays usable; a click on it can move the tour on.
  useEffect(() => {
    if (!step) {
      const frame = requestAnimationFrame(onClose);
      return () => cancelAnimationFrame(frame);
    }
    let el = findTarget(step.target);
    if (!el) {
      const frame = requestAnimationFrame(() => onGone());
      return () => cancelAnimationFrame(frame);
    }
    const topInset = headerBottom();
    const bottomRoom = sheet ? (tipRef.current?.offsetHeight ?? 220) + 16 : 240;
    const y = scrollFor(toBox(el.getBoundingClientRect()), { height: window.innerHeight, topInset, bottomRoom, scrollY: window.scrollY });
    if (y !== null) window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });

    let frame = 0;
    let seenKey = "";
    const tick = () => {
      if (!el?.isConnected) el = findTarget(step.target);
      // The control went away (the page changed under the tour): go on to the next step.
      if (!el) return onGone();
      const box = toBox(el.getBoundingClientRect());
      const tipHeight = tipRef.current?.offsetHeight ?? 0;
      const key = `${box.top}|${box.left}|${box.width}|${box.height}|${tipHeight}|${window.innerWidth}|${window.innerHeight}`;
      if (key !== seenKey) {
        seenKey = key;
        setLayout({ box, tipHeight, topInset, screen: { width: window.innerWidth, height: window.innerHeight } });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const lit = el;
    const click = () => setTimeout(onLitClick, 0);
    lit.addEventListener("click", click);
    return () => {
      cancelAnimationFrame(frame);
      lit.removeEventListener("click", click);
    };
  }, [step, sheet, onClose]);

  const ready = shown !== null;
  useEffect(() => {
    if (ready) nextRef.current?.focus({ preventScroll: true });
  }, [index, ready]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (isTyping(e.target)) return;
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      back();
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!step) return null;
  const ring = shown ? grow(shown.box, RING_GAP) : null;
  const place = shown && !sheet ? placeTip(shown.box, { width: 320, height: shown.tipHeight || 200 }, shown.screen, shown.topInset) : null;
  const verb = touch ? "Tap" : "Click";

  return (
    <>
      {ring && (
        <>
          <div aria-hidden className="tour-ring" style={{ top: ring.top, left: ring.left, width: ring.width, height: ring.height }} />
          {/* The dim catches clicks, so only the lit control can be used while the tour is open. */}
          <div aria-hidden className="tour-block" style={{ top: 0, left: 0, right: 0, height: Math.max(0, ring.top) }} />
          <div aria-hidden className="tour-block" style={{ top: ring.top + ring.height, left: 0, right: 0, bottom: 0 }} />
          <div aria-hidden className="tour-block" style={{ top: ring.top, left: 0, width: Math.max(0, ring.left), height: ring.height }} />
          <div aria-hidden className="tour-block" style={{ top: ring.top, left: ring.left + ring.width, right: 0, height: ring.height }} />
        </>
      )}
      <div
        ref={tipRef}
        role="dialog"
        aria-labelledby={titleId}
        className={`tour-tip ${sheet ? "tour-sheet" : ""}`}
        style={sheet ? undefined : place ? { top: place.top, left: place.left } : { top: 0, left: 0, visibility: "hidden" }}
      >
        {sheet ? (
          <span aria-hidden className="tour-grab" />
        ) : (
          place?.arrowLeft != null && <span aria-hidden className={`tour-arrow tour-arrow-${place.side}`} style={{ left: place.arrowLeft }} />
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm whitespace-nowrap text-subtle tabular-nums">
            {index + 1} of {list.length}
          </span>
          <span aria-hidden className="tour-progress">
            {list.map((s, i) => (
              <span key={s.target} data-done={i <= index ? "" : undefined} />
            ))}
          </span>
          <button type="button" onClick={onClose} aria-label="Close Tour" title="Close Tour" className="btn btn-ghost btn-sm btn-icon -my-1 -mr-2">
            <Icon name="x" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <h2 id={titleId} className="text-[1.0625rem] leading-6 font-semibold text-fg">
            {step.title}
          </h2>
          <p className="text-[0.9375rem] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-fg">{step.tip(verb)}</p>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <button type="button" onClick={back} disabled={index === 0} className={`btn btn-secondary ${sheet ? "flex-1" : "btn-sm"}`}>
            <Icon name="chevronLeft" />
            Back
          </button>
          <button ref={nextRef} type="button" onClick={next} className={`btn btn-primary ${sheet ? "flex-1" : "btn-sm"}`}>
            {last ? "Done" : "Next"}
            <Icon name={last ? "check" : "chevronRight"} />
          </button>
        </div>
      </div>
    </>
  );
}

/** The first element marked for this step that is on screen now (a phone hides some, such as the keyboard keys). */
export function findTarget(target: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function toBox(r: DOMRect): Box {
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** The sticky site header covers the top of the screen, so nothing is lit or placed under it. */
function headerBottom() {
  return Math.max(0, document.querySelector("header")?.getBoundingClientRect().bottom ?? 0);
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener("change", onChange);
      return () => list?.removeEventListener("change", onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Every ? button on the page reads the same seen list, so opening a tour clears its dot at once.
const seenListeners = new Set<() => void>();
function subscribeSeen(onChange: () => void) {
  seenListeners.add(onChange);
  return () => void seenListeners.delete(onChange);
}
function seenChanged() {
  for (const fn of seenListeners) fn();
}
