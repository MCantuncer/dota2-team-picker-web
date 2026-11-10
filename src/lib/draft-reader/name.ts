import { glowRects, nameRects, type Side } from "./geometry";
import type { Pixels } from "./match";

/**
 * Finds your own slot in the top bar, which tells your side, Radiant or Dire. Dota writes each player's
 * Steam name under their slot and lights a soft glow under your own.
 *
 * Your name is drawn in the browser's own font and compared, as light shapes on dark, with the text
 * under each slot. Dota's font is not the same, so both are blurred a little first and compared at a
 * few widths: the shapes and spacing of the letters carry the match, not the exact font.
 */

/** Text is compared at the size it has on a 1080 px high screen, whatever the screen's real size. */
export const NAME_TEXT_PX = 16.5;
/** The size of a name label, at the compare size. */
const LABEL = { w: 136, h: 27 };
/** Dark gaps narrower than this (in compare pixels) are letter strokes; wider ones are background. */
const STROKE_MAX = 5;
/**
 * Dark space (in compare pixels, about half a letter's height) expected after the name. Measured on real
 * frames: without it a short name such as Akif matched the start of a longer one (0.78); with it every
 * name matched its own slot by 0.15 or more.
 */
const NAME_GAP = 8;
/** Widths your name is tried at, since Dota's font runs a little wider or narrower than the browser's. */
const STRETCH = [0.85, 0.92, 1, 1.08, 1.16];

/** A grey image: how much brighter than its surroundings each pixel is. */
export interface Ink {
  data: Float32Array;
  width: number;
  height: number;
}

/** Your slot, and what found it. */
export interface SideRead {
  side: Side;
  /** 0 to 4, left to right. */
  slot: number;
  by: "name" | "glow" | "both";
}

/**
 * Your name must match this well, and this much better than any other slot's name. On real frames (720
 * to 1440 px high, names drawn in five different fonts) every player's name matched its own slot at 0.73
 * or more and beat every other slot by 0.14 or more. A name that is not in the game can still look like
 * one that is (Can and Camille scored 0.78), which is why the glow must agree whenever it shows.
 */
const SURE_NAME = 0.65;
const NAME_MARGIN = 0.12;
/**
 * How much bluer (0 to 255) the strip under your name must be than the strip below it, and than under
 * any other name. On real frames your own name scored 7 to 24 and every other name 0 or less.
 */
const SURE_GLOW = 4;
const GLOW_MARGIN = 4;

/** Brightness (the strongest colour channel) of the pixel at (x, y), read with bilinear sampling. */
function brightness(px: Pixels, x: number, y: number): number {
  const x0 = Math.min(Math.max(Math.floor(x), 0), px.width - 1);
  const y0 = Math.min(Math.max(Math.floor(y), 0), px.height - 1);
  const x1 = Math.min(x0 + 1, px.width - 1);
  const y1 = Math.min(y0 + 1, px.height - 1);
  const fx = Math.min(Math.max(x - x0, 0), 1);
  const fy = Math.min(Math.max(y - y0, 0), 1);
  const at = (xi: number, yi: number) => {
    const i = (yi * px.width + xi) * 4;
    return Math.max(px.data[i], px.data[i + 1], px.data[i + 2]);
  };
  return (
    (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy
  );
}

/** Averages over a box of pixels, which smooths small differences between fonts. */
function blur(img: Ink): Ink {
  const { width: w, height: h, data } = img;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0,
        n = 0;
      for (let d = -1; d <= 1; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < w) {
          s += data[y * w + xx];
          n++;
        }
      }
      tmp[y * w + x] = s / n;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0,
        n = 0;
      for (let d = -1; d <= 1; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < h) {
          s += tmp[yy * w + x];
          n++;
        }
      }
      out[y * w + x] = s / n;
    }
  return { data: out, width: w, height: h };
}

/** The smallest (or largest) value in a square around each pixel. */
function spread(img: Ink, size: number, pick: (a: number, b: number) => number): Ink {
  const { width: w, height: h, data } = img;
  const r = Math.floor(size / 2);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = data[y * w + x];
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < w) v = pick(v, data[y * w + xx]);
      }
      tmp[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = tmp[y * w + x];
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < h) v = pick(v, tmp[yy * w + x]);
      }
      out[y * w + x] = v;
    }
  return { data: out, width: w, height: h };
}

/**
 * Keeps only the text: each pixel's brightness above the background around it. The background is
 * what is left after wiping out anything thinner than a letter stroke, so a soft glow or a gradient
 * behind the name drops out and the letters stay.
 */
function textOnly(img: Ink): Ink {
  const background = spread(spread(img, STROKE_MAX, Math.min), STROKE_MAX, Math.max);
  const data = new Float32Array(img.data.length);
  for (let i = 0; i < data.length; i++) data[i] = Math.max(0, img.data[i] - background.data[i]);
  return blur({ data, width: img.width, height: img.height });
}

/** The name label under one slot, resized to the compare size and reduced to its text. */
export function labelInk(px: Pixels, r: { x: number; y: number; w: number; h: number }): Ink {
  const data = new Float32Array(LABEL.w * LABEL.h);
  for (let y = 0; y < LABEL.h; y++)
    for (let x = 0; x < LABEL.w; x++)
      data[y * LABEL.w + x] = brightness(px, r.x + ((x + 0.5) * r.w) / LABEL.w - 0.5, r.y + ((y + 0.5) * r.h) / LABEL.h - 0.5);
  return textOnly({ data, width: LABEL.w, height: LABEL.h });
}

/**
 * Your name, drawn light on dark at NAME_TEXT_PX by the browser, cut to its letters and reduced to
 * text the same way as the labels. Null when nothing was drawn (an empty name).
 */
export function nameInk(drawn: Pixels): Ink | null {
  const grey: Ink = { data: new Float32Array(drawn.width * drawn.height), width: drawn.width, height: drawn.height };
  let left = drawn.width,
    right = -1,
    top = drawn.height,
    bottom = -1;
  for (let y = 0; y < drawn.height; y++)
    for (let x = 0; x < drawn.width; x++) {
      const i = (y * drawn.width + x) * 4;
      const v = Math.max(drawn.data[i], drawn.data[i + 1], drawn.data[i + 2]);
      grey.data[y * drawn.width + x] = v;
      if (v > 60) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  if (right < 0) return null;
  // A little dark border, so the blur keeps the letters' edges, and a wider one after the name: the
  // name must end there, so a short name does not match the start of a longer one.
  const pad = 2;
  const w = right - left + 1 + pad + NAME_GAP;
  const h = bottom - top + 1 + 2 * pad;
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = left + x - pad,
        sy = top + y - pad;
      if (sx >= 0 && sx < drawn.width && sy >= 0 && sy < drawn.height) data[y * w + x] = grey.data[sy * drawn.width + sx];
    }
  return blur({ data, width: w, height: h });
}

/** The name stretched sideways by `k`, for fonts that run wider or narrower. */
function stretch(img: Ink, k: number): Ink {
  const w = Math.max(1, Math.round(img.width * k));
  const data = new Float32Array(w * img.height);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < w; x++) {
      const sx = Math.min(Math.max((x + 0.5) / k - 0.5, 0), img.width - 1);
      const x0 = Math.floor(sx),
        x1 = Math.min(x0 + 1, img.width - 1),
        f = sx - x0;
      data[y * w + x] = img.data[y * img.width + x0] * (1 - f) + img.data[y * img.width + x1] * f;
    }
  return { data, width: w, height: img.height };
}

/** The name's widths to try, each cut to fit a label (a long name's start is what Dota shows). */
export function nameShapes(name: Ink): Ink[] {
  return STRETCH.map((k) => {
    const s = stretch(name, k);
    if (s.width <= LABEL.w - 4 && s.height <= LABEL.h) return s;
    const w = Math.min(s.width, LABEL.w - 4);
    const h = Math.min(s.height, LABEL.h);
    const data = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = s.data[y * s.width + x];
    return { data, width: w, height: h };
  });
}

/**
 * How well the name fits anywhere in the label: the best normalised correlation over every place it
 * could sit. 1 is the same shape; text with other letters scores far lower; an empty label scores 0.
 */
export function fit(label: Ink, name: Ink): number {
  const n = name.width * name.height;
  let mean = 0;
  for (const v of name.data) mean += v;
  mean /= n;
  const t = new Float32Array(n);
  let tNorm = 0;
  for (let i = 0; i < n; i++) {
    t[i] = name.data[i] - mean;
    tNorm += t[i] * t[i];
  }
  tNorm = Math.sqrt(tNorm);
  if (!tNorm) return 0;
  // A name starts where the label's text starts: the name comes first and anything after it (a guild
  // tag) follows. So the name is only tried there, a pixel or two either way, never in the middle of a
  // longer name that happens to contain it.
  const start = textStart(label);
  if (start === null) return 0;
  let best = 0;
  for (let y = 0; y + name.height <= label.height; y++)
    for (let x = Math.max(0, start - ANCHOR_SLACK); x <= Math.min(start + ANCHOR_SLACK, label.width - name.width); x++) {
      let sum = 0,
        sq = 0,
        dot = 0;
      for (let ty = 0; ty < name.height; ty++) {
        const row = (y + ty) * label.width + x;
        for (let tx = 0; tx < name.width; tx++) {
          const v = label.data[row + tx];
          sum += v;
          sq += v * v;
          dot += v * t[ty * name.width + tx];
        }
      }
      const variance = sq - (sum * sum) / n;
      // A flat patch (no text) is skipped: it would only divide noise by almost nothing.
      if (variance < n * 4) continue;
      best = Math.max(best, dot / (Math.sqrt(variance) * tNorm));
    }
  return best;
}

/** How far (in compare pixels) the name may sit from where the label's text starts. */
const ANCHOR_SLACK = 3;
/** A column is part of the text when its brightest pixel stands this far above the background. */
const INK_MIN = 40;

/** The first column of the label's text, or null when the label is empty. */
function textStart(label: Ink): number | null {
  for (let x = 0; x < label.width; x++)
    for (let y = 0; y < label.height; y++) if (label.data[y * label.width + x] >= INK_MIN) return x;
  return null;
}

/** How well your name fits under each slot, Radiant's five then Dire's five. */
export function nameScores(px: Pixels, shapes: Ink[]): number[] {
  return (["radiant", "dire"] as const).flatMap((side) =>
    nameRects(side, px.width, px.height).map((r) => {
      const label = labelInk(px, r);
      return Math.max(...shapes.map((s) => fit(label, s)));
    }),
  );
}

/** The slot (0 to 9, Radiant's five then Dire's five) that clearly beats every other, or null. */
function clearBest(scores: number[], min: number, margin: number): number | null {
  const order = scores.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]);
  const [best, second] = order;
  if (!best || !second || best[0] < min || best[0] - second[0] < margin) return null;
  return best[1];
}

/** The slot whose name clearly matches yours, or null. */
export function nameSlot(px: Pixels, shapes: Ink[]): number | null {
  return clearBest(nameScores(px, shapes), SURE_NAME, NAME_MARGIN);
}

/**
 * Dota lights a soft blue glow under your own name. How much bluer the strip just under each name is
 * than the strip below it, Radiant's five then Dire's five.
 */
export function glowScores(px: Pixels): number[] {
  const blue = (r: { x: number; y: number; w: number; h: number }) => {
    let sum = 0,
      n = 0;
    const x1 = Math.min(Math.round(r.x + r.w), px.width),
      y1 = Math.min(Math.round(r.y + r.h), px.height);
    for (let y = Math.max(Math.round(r.y), 0); y < y1; y++)
      for (let x = Math.max(Math.round(r.x), 0); x < x1; x++) {
        sum += px.data[(y * px.width + x) * 4 + 2];
        n++;
      }
    return n ? sum / n : 0;
  };
  return (["radiant", "dire"] as const).flatMap((side) => glowRects(side, px.width, px.height).map((g) => blue(g.glow) - blue(g.below)));
}

/** The slot with the glow under it, or null when no slot clearly has it. */
export function glowSlot(px: Pixels): number | null {
  return clearBest(glowScores(px), SURE_GLOW, GLOW_MARGIN);
}

/**
 * Your side and slot. Two signs are read: your Steam name, and the glow Dota draws under your own name.
 * When both are found they must agree; when only one is found it decides. So a name that only looks like
 * yours (your Steam name changed, or a player with a similar name) is overruled by the glow, and a draft
 * read without your name (signed out) still finds your side from the glow.
 */
export function findMe(px: Pixels, name: Ink[] | null): SideRead | null {
  const byName = name ? nameSlot(px, name) : null;
  const byGlow = glowSlot(px);
  if (byName !== null && byGlow !== null && byName !== byGlow) return null;
  const slot = byName ?? byGlow;
  if (slot === null) return null;
  return {
    side: slot < 5 ? "radiant" : "dire",
    slot: slot % 5,
    by: byName !== null && byGlow !== null ? "both" : byName !== null ? "name" : "glow",
  };
}
