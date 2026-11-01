import { cellRect, GRID_COLUMNS, slotRects, type Attribute, type Side } from "./geometry";
import { portraitPatch, similarity, slotPatches, type Pixels } from "./match";

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
}

export interface DraftRead {
  radiant: SlotRead[];
  dire: SlotRead[];
  bans: number[];
}

/** A slot is that hero when it matches this well and clearly better than the next best hero. */
const SURE_MATCH = 0.75;
const SURE_MARGIN = 0.1;
/** Below this, nothing like a hero is in the slot. */
const EMPTY_BELOW = 0.6;
/** Share of the diagonal that must be the red ban slash. */
const SLASH_SHARE = 0.6;

/** Compares screenshots with every hero's portrait. Build it once; reading is then fast. */
export class DraftReader {
  private refs: { id: number; patch: Float32Array }[];
  private grid: Record<Attribute, number[]>;

  constructor(heroes: ReaderHero[]) {
    this.refs = heroes.map((h) => ({ id: h.id, patch: portraitPatch(h.portrait) }));
    // The grid lists heroes by name within each attribute, by plain character order as Dota does.
    const byName = [...heroes].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    this.grid = { str: [], agi: [], int: [], all: [] };
    for (const h of byName) if (h.primaryAttr in GRID_COLUMNS) this.grid[h.primaryAttr as Attribute].push(h.id);
  }

  read(px: Pixels): DraftRead {
    const side = (s: Side) => slotRects(s, px.width, px.height).map((r) => this.readSlot(slotPatches(px, r)));
    const picked = new Set<number>();
    const radiant = side("radiant");
    const dire = side("dire");
    for (const s of [...radiant, ...dire]) if (s.heroId !== null) picked.add(s.heroId);
    return {
      radiant,
      dire,
      bans: this.readBans(px).filter((id) => !picked.has(id)),
    };
  }

  private readSlot(slot: Float32Array[]): SlotRead {
    let best = -1,
      second = -1,
      bestId = 0;
    for (const ref of this.refs) {
      let score = -1;
      for (const p of slot) score = Math.max(score, similarity(p, ref.patch));
      if (score > best) [second, best, bestId] = [best, score, ref.id];
      else if (score > second) second = score;
    }
    if (best >= SURE_MATCH && best - second >= SURE_MARGIN) return { heroId: bestId, unsure: false };
    return { heroId: null, unsure: best >= EMPTY_BELOW };
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
 * How much of a grid cell's rising diagonal is clearly redder than the pixels beside it. Banned
 * heroes carry a thin red slash from bottom left to top right; portrait art rarely lines up that way.
 */
export function slashShare(px: Pixels, r: { x: number; y: number; w: number; h: number }): number {
  const redness = (x: number, y: number) => {
    const xi = Math.min(Math.max(Math.round(x), 0), px.width - 1);
    const yi = Math.min(Math.max(Math.round(y), 0), px.height - 1);
    const i = (yi * px.width + xi) * 4;
    return px.data[i] - (px.data[i + 1] + px.data[i + 2]) / 2;
  };
  const k = r.h / 98;
  let best = 0;
  for (let shift = -4; shift <= 4; shift++) {
    let red = 0,
      total = 0;
    for (let s = 0; s < 50; s++) {
      const t = s / 49;
      const x = r.x + r.w * (0.15 + 0.7 * t) + shift * k;
      const y = r.y + r.h * (0.88 - 0.76 * t);
      if (x < r.x || x >= r.x + r.w) continue;
      total++;
      if (redness(x, y) - Math.max(redness(x - 6 * k, y), redness(x + 6 * k, y)) > 6) red++;
    }
    if (total) best = Math.max(best, red / total);
  }
  return best;
}
