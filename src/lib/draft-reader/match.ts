import type { Rect } from "./geometry";

/** RGBA pixels, row by row, as a canvas returns them. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Portraits are compared at this size: small enough to be fast, big enough to tell heroes apart. */
export const PATCH_W = 40;
export const PATCH_H = 22;

/**
 * Averages a rectangle of pixels down to a PATCH_W x PATCH_H colour patch, then centres each colour
 * channel and scales to unit length, so comparing two patches ignores brightness and contrast.
 */
export function patch(px: Pixels, r: Rect): Float32Array {
  const out = new Float32Array(PATCH_W * PATCH_H * 3);
  for (let py = 0; py < PATCH_H; py++) {
    const y0 = Math.floor(r.y + (py * r.h) / PATCH_H);
    const y1 = Math.max(y0 + 1, Math.floor(r.y + ((py + 1) * r.h) / PATCH_H));
    for (let pxi = 0; pxi < PATCH_W; pxi++) {
      const x0 = Math.floor(r.x + (pxi * r.w) / PATCH_W);
      const x1 = Math.max(x0 + 1, Math.floor(r.x + ((pxi + 1) * r.w) / PATCH_W));
      let red = 0,
        green = 0,
        blue = 0,
        n = 0;
      for (let y = Math.max(y0, 0); y < Math.min(y1, px.height); y++) {
        for (let x = Math.max(x0, 0); x < Math.min(x1, px.width); x++) {
          const i = (y * px.width + x) * 4;
          red += px.data[i];
          green += px.data[i + 1];
          blue += px.data[i + 2];
          n++;
        }
      }
      const o = (py * PATCH_W + pxi) * 3;
      out[o] = n ? red / n : 0;
      out[o + 1] = n ? green / n : 0;
      out[o + 2] = n ? blue / n : 0;
    }
  }
  return normalize(out);
}

function normalize(p: Float32Array): Float32Array {
  for (let c = 0; c < 3; c++) {
    let mean = 0;
    for (let i = c; i < p.length; i += 3) mean += p[i];
    mean /= p.length / 3;
    for (let i = c; i < p.length; i += 3) p[i] -= mean;
  }
  let norm = 0;
  for (const v of p) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < p.length; i++) p[i] /= norm;
  return p;
}

/** How alike two patches are: 1 is identical, 0 unrelated. */
export function similarity(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * The part of a hero's 256 x 144 store portrait that the top bar shows: it zooms in about 1.2 times
 * and cuts a little off the left and top.
 */
export function portraitRect(px: Pixels): Rect {
  const unit = px.width / 256;
  const zoom = 1.2;
  return { x: 22 * unit, y: 12 * unit, w: ((144 * PATCH_W) / PATCH_H / zoom) * unit, h: (144 / zoom) * unit };
}

export function portraitPatch(px: Pixels): Float32Array {
  return patch(px, portraitRect(px));
}

/**
 * Your own slot carries a hero level badge over the right of the portrait, so portraits are also
 * compared on their left part alone, which the badge never covers.
 */
const LEFT_SHARE = 0.6;
export const leftPart = (r: Rect): Rect => ({ ...r, w: r.w * LEFT_SHARE });

export function portraitLeftPatch(px: Pixels): Float32Array {
  return patch(px, leftPart(portraitRect(px)));
}

/**
 * How colourful a rectangle is: the average gap between each pixel's strongest and weakest colour
 * channel. Grey pixels score 0.
 */
export function colourfulness(px: Pixels, r: Rect): number {
  let sum = 0,
    n = 0;
  const x1 = Math.min(Math.round(r.x + r.w), px.width),
    y1 = Math.min(Math.round(r.y + r.h), px.height);
  for (let y = Math.max(Math.round(r.y), 0); y < y1; y += 2)
    for (let x = Math.max(Math.round(r.x), 0); x < x1; x += 2) {
      const i = (y * px.width + x) * 4;
      const red = px.data[i],
        green = px.data[i + 1],
        blue = px.data[i + 2];
      sum += Math.max(red, green, blue) - Math.min(red, green, blue);
      n++;
    }
  return n ? sum / n : 0;
}

/**
 * The slot cut a few ways (slightly bigger or smaller, shifted a little), because the top bar's crop
 * differs a few pixels between heroes and screen sizes. The best of these is compared.
 */
export function slotPatches(px: Pixels, r: Rect, part: (r: Rect) => Rect = (x) => x): Float32Array[] {
  const out: Float32Array[] = [];
  for (const scale of [0.95, 1, 1.05])
    for (const sx of [-0.04, -0.02, 0, 0.02, 0.04])
      for (const sy of [-0.04, 0, 0.04]) {
        const w = r.w * scale;
        const h = r.h * scale;
        out.push(patch(px, part({ x: r.x + (r.w - w) / 2 + sx * r.w, y: r.y + (r.h - h) / 2 + sy * r.h, w, h })));
      }
  return out;
}

/**
 * How much the brightness varies across a rectangle: the standard deviation of each pixel's
 * brightness. An empty top bar slot is a flat panel (about 10); hero art is 25 or more.
 */
export function brightnessSpread(px: Pixels, r: Rect): number {
  let sum = 0,
    squares = 0,
    n = 0;
  const x1 = Math.min(Math.round(r.x + r.w), px.width),
    y1 = Math.min(Math.round(r.y + r.h), px.height);
  for (let y = Math.max(Math.round(r.y), 0); y < y1; y += 2)
    for (let x = Math.max(Math.round(r.x), 0); x < x1; x += 2) {
      const i = (y * px.width + x) * 4;
      const v = 0.3 * px.data[i] + 0.59 * px.data[i + 1] + 0.11 * px.data[i + 2];
      sum += v;
      squares += v * v;
      n++;
    }
  return n ? Math.sqrt(Math.max(0, squares / n - (sum / n) ** 2)) : 0;
}
