/**
 * Page Tours (Can's go, 2026-11-13): the ? button at the end of a page's own buttons lights up one control at a
 * time with a one line tip. This file holds the parts that need no browser: where a tip goes, how far the page
 * scrolls, and which tours this browser has seen.
 */

export type Box = { top: number; left: number; width: number; height: number };

/** The space the lit ring keeps around a control, in px. */
export const RING_GAP = 6;
/** The gap between the ring and the tip card. */
const TIP_GAP = 14;
/** Nothing sits closer to a screen edge than this. */
const EDGE = 16;

export type TipPlace = {
  top: number;
  left: number;
  /** Which side of the control the card sits on, so its pointer faces the control. */
  side: "below" | "above";
  /** Where the pointer sits along the card's edge; null when the card had to cover the control. */
  arrowLeft: number | null;
};

/**
 * Where the tip card goes on a wide screen: under the control when it fits, else above it, else pinned to the bottom
 * of the screen. It starts at the control's left edge so the eye moves straight down, and stays inside the screen.
 */
export function placeTip(target: Box, tip: { width: number; height: number }, screen: { width: number; height: number }, topInset = 0): TipPlace {
  const ring = grow(target, RING_GAP);
  const left = clamp(ring.left, EDGE, screen.width - tip.width - EDGE);
  const below = ring.top + ring.height + TIP_GAP;
  const above = ring.top - TIP_GAP - tip.height;
  const arrowLeft = clamp(ring.left + Math.min(ring.width / 2, 60) - left - 7, 16, tip.width - 30);
  if (below + tip.height <= screen.height - EDGE) return { top: below, left, side: "below", arrowLeft };
  if (above >= topInset + EDGE) return { top: above, left, side: "above", arrowLeft };
  return { top: Math.max(topInset + EDGE, screen.height - tip.height - EDGE), left, side: "below", arrowLeft: null };
}

/**
 * How far to scroll so the control sits near the top with room under it for the tip (or above the bottom sheet on a
 * phone). Null when it is already in comfortable view, so the page never jumps for nothing.
 */
export function scrollFor(target: Box, view: { height: number; topInset: number; bottomRoom: number; scrollY: number }): number | null {
  const ring = grow(target, RING_GAP);
  const top = view.topInset + EDGE;
  const fits = ring.top >= top && ring.top + ring.height + view.bottomRoom <= view.height;
  if (fits) return null;
  return Math.max(0, Math.round(view.scrollY + ring.top - top - 24));
}

export function grow(box: Box, by: number): Box {
  return { top: box.top - by, left: box.left - by, width: box.width + by * 2, height: box.height + by * 2 };
}

const KEY = "page-tour-seen";

/** The tours this browser has opened or closed once. Anything unreadable counts as none seen. */
export function seenTours(storage: Pick<Storage, "getItem"> | null): Set<string> {
  try {
    const raw = storage?.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function markTourSeen(storage: Pick<Storage, "getItem" | "setItem"> | null, id: string): void {
  try {
    const seen = seenTours(storage);
    if (seen.has(id)) return;
    seen.add(id);
    storage?.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // Private windows and blocked storage: the dot just shows again next visit.
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), Math.max(min, max));
}
