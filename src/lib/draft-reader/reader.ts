import { cellRect, GRID_COLUMNS, slotRects, type Attribute, type Rect, type Side } from "./geometry";
import type { Look } from "./looks";
import { findMe, type Ink, type SideRead } from "./name";
import {
  brightnessSpread,
  colourfulness,
  leftPart,
  patch,
  portraitLeftPatch,
  portraitPatch,
  portraitRect,
  similarity,
  slotPatches,
  type Pixels,
} from "./match";

/** A hero the reader knows: its id, name, primary attribute, and its store portrait's pixels. */
export interface ReaderHero {
  id: number;
  name: string;
  primaryAttr: string;
  portrait: Pixels;
}

/** One top bar slot: the hero in it, or null when it is empty or the reader is not sure. */
export interface SlotRead {
  heroId: number | null;
  /** True when something is in the slot but no hero matched well enough, such as persona art. */
  unsure: boolean;
  /** The closest hero and how well it matched (1 is identical), for the watch log. */
  best?: { heroId: number; score: number };
  /** True when the hero was read by a look learned from your screen rather than its store portrait. */
  learned?: boolean;
}

export interface DraftRead {
  radiant: SlotRead[];
  dire: SlotRead[];
  bans: number[];
  /** Your own slot, found from your Steam name and the glow under it; null when the reader can't tell. */
  me?: SideRead | null;
}

/** A slot is that hero when it matches this well and clearly better than the next best hero. */
const SURE_MATCH = 0.75;
const SURE_MARGIN = 0.1;
/** Heroes compared closely for each slot. */
const SHORTLIST = 8;
/** Below this, nothing like a hero is in the slot. */
const EMPTY_BELOW = 0.6;
/**
 * While a player is choosing, their slot shows the hero's portrait in grey; it turns to full colour
 * once the pick locks in. Locked portraits keep 0.8 to 1.2 times the store portrait's colour, so a slot
 * below this share is a preview, not a pick.
 */
const LOCKED_COLOUR = 0.5;
/**
 * Share of the slash line that must be clearly redder than the art beside it. Measured on real hero
 * select screenshots at 720 to 1440 px high: banned cells score 0.92 or more, other cells 0.7 or less.
 */
const SLASH_SHARE = 0.8;
/**
 * A slot the reader can learn a look from must show art, not an empty panel: colourful and with
 * light and dark in it. Measured on real top bars: empty slots score 18 colour and 9 to 10 spread
 * (39 with your level badge in it); the dullest hero art (Tusk, Sven) scores 20 colour, and every
 * hero 25 spread or more. Art as dull as Tusk is never learned, but its store portrait reads anyway.
 */
const LOOK_MIN_COLOUR = 25;
const LOOK_MIN_SPREAD = 20;

interface Ref {
  id: number;
  patch: Float32Array;
  left: Float32Array;
  colour: number;
  learned: boolean;
}

/** Compares screenshots with every hero's portrait. Build it once; reading is then fast. */
export class DraftReader {
  private refs: Ref[];
  private grid: Record<Attribute, number[]>;

  /** `looks` are heroes' looks learned from this player's screen, read alongside the store portraits. */
  constructor(heroes: ReaderHero[], looks: Look[] = []) {
    this.refs = heroes.map((h) => ({
      id: h.id,
      patch: portraitPatch(h.portrait),
      left: portraitLeftPatch(h.portrait),
      colour: colourfulness(h.portrait, portraitRect(h.portrait)),
      learned: false,
    }));
    for (const look of looks) this.addLook(look);
    // The grid lists heroes by name within each attribute, by plain character order as Dota does.
    const byName = [...heroes].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    this.grid = { str: [], agi: [], int: [], all: [] };
    for (const h of byName) if (h.primaryAttr in GRID_COLUMNS) this.grid[h.primaryAttr as Attribute].push(h.id);
  }

  /** Reads a hero by a learned look too. Looks of heroes the reader doesn't know are ignored. */
  addLook(look: Look) {
    if (!this.refs.some((r) => r.id === look.heroId)) return;
    this.refs.push({ id: look.heroId, patch: look.patch, left: look.left, colour: look.colour, learned: true });
  }

  /** Stops reading a hero by its learned looks. */
  forget(heroId: number) {
    this.refs = this.refs.filter((r) => !(r.learned && r.id === heroId));
  }

  /**
   * Learns how `heroId` looks on this screen, after the player added it by hand to the team on `side`.
   * It learns from the one slot on that side that shows art the reader could not name (or named as a
   * hero the player has since removed, listed in `removed`), and only when there is exactly one such
   * slot, so it never guesses between two. Returns the look, or null when nothing was learned.
   */
  learn(px: Pixels, side: Side, heroId: number, removed: ReadonlySet<number> = new Set()): Look | null {
    const portrait = this.refs.find((r) => r.id === heroId && !r.learned);
    if (!portrait) return null;
    const slots = slotRects(side, px.width, px.height).map((r) => ({ r, read: this.readRect(px, r) }));
    // The hero already reads on its own: nothing to learn.
    if (slots.some((s) => s.read.heroId === heroId)) return null;
    const open = slots.filter(({ r, read }) => {
      if (read.heroId !== null && !removed.has(read.heroId)) return false;
      const colour = colourfulness(px, r);
      // Art, not an empty panel, and locked in rather than a grey preview.
      return colour >= LOOK_MIN_COLOUR && colour >= LOCKED_COLOUR * portrait.colour && brightnessSpread(px, r) >= LOOK_MIN_SPREAD;
    });
    if (open.length !== 1) return null;
    const { r } = open[0]!;
    const look = { heroId, patch: patch(px, r), left: patch(px, leftPart(r)), colour: colourfulness(px, r) };
    this.addLook(look);
    return look;
  }

  /** Reads a screenshot. `name` is your Steam name as nameToFind drew it, to find your side by. */
  read(px: Pixels, name: Ink[] | null = null): DraftRead {
    const side = (s: Side) => slotRects(s, px.width, px.height).map((r) => this.readRect(px, r));
    const picked = new Set<number>();
    const radiant = side("radiant");
    const dire = side("dire");
    for (const s of [...radiant, ...dire]) if (s.heroId !== null) picked.add(s.heroId);
    return {
      radiant,
      dire,
      bans: this.readBans(px).filter((id) => !picked.has(id)),
      me: findMe(px, name),
    };
  }

  /** One top bar slot. */
  private readRect(px: Pixels, r: Rect): SlotRead {
    const colour = colourfulness(px, r);
    const whole = this.readSlot(slotPatches(px, r), "patch", colour);
    // Not sure on the whole portrait: your own slot's level badge may cover its right side.
    return whole.heroId === null ? this.readSlot(slotPatches(px, r, leftPart), "left", colour) : whole;
  }

  private readSlot(slot: Float32Array[], part: "patch" | "left", colour: number): SlotRead {
    // Shortlist the portraits closest to the slot's middle cut, then try every cut on those only: the
    // same answer as trying every cut on every portrait, several times faster.
    const middle = slot[Math.floor(slot.length / 2)]!;
    const shortlist = this.refs
      .map((ref) => ({ ref, score: similarity(middle, ref[part]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, SHORTLIST)
      .map((c) => c.ref);
    // A hero can have its store portrait and looks learned from your screen: each hero counts once, by
    // its closest one, so the runner-up is always another hero.
    const byHero = new Map<number, { ref: Ref; score: number }>();
    for (const ref of shortlist) {
      let score = -1;
      for (const p of slot) score = Math.max(score, similarity(p, ref[part]));
      const seen = byHero.get(ref.id);
      if (!seen || score > seen.score) byHero.set(ref.id, { ref, score });
    }
    const [first, second] = [...byHero.values()].sort((a, b) => b.score - a.score);
    const { ref, score: best } = first!;
    const closest = { heroId: ref.id, score: best };
    if (best >= SURE_MATCH && best - (second?.score ?? -1) >= SURE_MARGIN) {
      // A grey preview of a hero the player is still choosing: not picked yet.
      if (colour < LOCKED_COLOUR * ref.colour) return { heroId: null, unsure: false, best: closest };
      return ref.learned ? { heroId: ref.id, unsure: false, best: closest, learned: true } : { heroId: ref.id, unsure: false, best: closest };
    }
    return { heroId: null, unsure: best >= EMPTY_BELOW, best: closest };
  }

  private readBans(px: Pixels): number[] {
    const bans: number[] = [];
    for (const attr of Object.keys(this.grid) as Attribute[]) {
      this.grid[attr].forEach((id, i) => {
        if (slashShare(px, cellRect(attr, i, px.width, px.height)) >= SLASH_SHARE) bans.push(id);
      });
    }
    return bans;
  }
}

/**
 * Where the ban slash runs in a grid cell, measured on real screenshots: from 14% of the width at the
 * bottom edge to 90% at the top edge, about 5 px wide at 1440 px high. Every number scales with the
 * cell, so it holds at any resolution.
 */
const SLASH = { bottomX: 0.14, topX: 0.9, sideGap: 5, shifts: 4, shiftStep: 0.75, points: 50, margin: 0.06 };
/** How much redder than the art beside it a point must be to count as slash. */
const SLASH_CONTRAST = 4;

/**
 * How much of a grid cell's ban slash line is clearly redder than the pixels beside it. A banned hero's
 * cell is tinted red and carries a lighter red slash from bottom left to top right. The slash is
 * compared with the average of the art on both sides, not the brighter side only, so a ban still reads
 * on bright art (light hair, gold armour) where one side is almost as red as the slash.
 */
export function slashShare(px: Pixels, r: { x: number; y: number; w: number; h: number }): number {
  const redness = (x: number, y: number) => {
    const xi = Math.min(Math.max(Math.round(x), 0), px.width - 1);
    const yi = Math.min(Math.max(Math.round(y), 0), px.height - 1);
    const i = (yi * px.width + xi) * 4;
    return px.data[i] - (px.data[i + 1] + px.data[i + 2]) / 2;
  };
  const k = r.h / 98;
  const gap = SLASH.sideGap * k;
  let best = 0;
  // Small sideways shifts absorb a cell a pixel or two off from the measured layout.
  for (let shift = -SLASH.shifts; shift <= SLASH.shifts; shift++) {
    let red = 0,
      total = 0;
    for (let s = 0; s < SLASH.points; s++) {
      // From the top of the cell down, keeping off the very top and bottom edges.
      const v = SLASH.margin + (1 - 2 * SLASH.margin) * ((s + 0.5) / SLASH.points);
      const y = r.y + r.h * v;
      const x = r.x + r.w * (SLASH.topX + (SLASH.bottomX - SLASH.topX) * v) + shift * SLASH.shiftStep * k;
      if (x < r.x || x >= r.x + r.w) continue;
      total++;
      const left = redness(x - gap, y),
        right = redness(x + gap, y),
        centre = redness(x, y);
      if (centre - (left + right) / 2 > SLASH_CONTRAST && centre - Math.max(left, right) > -SLASH_CONTRAST) red++;
    }
    if (total) best = Math.max(best, red / total);
  }
  return best;
}
