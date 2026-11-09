import { describe, expect, it } from "vitest";
import { cellRect, slotRects, type Rect } from "./geometry";
import type { Pixels } from "./match";
import { DraftReader, slashShare } from "./reader";

const W = 3440;
const H = 1440;

/** A 256 x 144 portrait of smooth, hero-specific colour waves, so each hero looks different. */
function portrait(seed: number): Pixels {
  const data = new Uint8ClampedArray(256 * 144 * 4);
  for (let y = 0; y < 144; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      data[i] = 128 + 100 * Math.sin(x / (9 + seed) + seed);
      data[i + 1] = 128 + 100 * Math.cos(y / (7 + (seed % 5)) + seed * 2);
      data[i + 2] = 128 + 100 * Math.sin((x + y) / (11 + (seed % 3)));
      data[i + 3] = 255;
    }
  return { data, width: 256, height: 144 };
}

function screen(): Pixels {
  const data = new Uint8ClampedArray(W * H * 4).fill(40);
  return { data, width: W, height: H };
}

/** Draws the part of a portrait the top bar shows (zoomed 1.18, shifted a little) into a slot. */
function drawSlot(px: Pixels, r: Rect, art: Pixels) {
  const zoom = 1.18,
    srcW = (144 * 40) / 22 / zoom,
    srcH = 144 / zoom,
    dx = 16,
    dy = 11;
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      const sx = Math.floor(dx + (x / r.w) * srcW),
        sy = Math.floor(dy + (y / r.h) * srcH);
      const s = (sy * art.width + sx) * 4,
        d = ((r.y + y) * px.width + r.x + x) * 4;
      px.data.set(art.data.subarray(s, s + 4), d);
    }
}

/**
 * Draws a ban the way Dota does: the cell tinted red (`left` and `right` of the slash) and a lighter red
 * slash, about 5 px wide at 1440 px high, from 14% of the width at the bottom to 90% at the top.
 */
function drawBan(
  px: Pixels,
  r: Rect,
  colours: { left: number[]; right: number[]; slash: number[] } = {
    left: [60, 46, 49],
    right: [60, 46, 49],
    slash: [96, 62, 66],
  },
) {
  const half = (2.5 * r.h) / 98;
  for (let y = r.y; y < r.y + r.h; y++) {
    const centre = r.x + r.w * (0.9 - 0.76 * ((y - r.y) / r.h));
    for (let x = r.x; x < r.x + r.w; x++) {
      const colour = Math.abs(x - centre) <= half ? colours.slash : x < centre ? colours.left : colours.right;
      px.data.set([...colour, 255], (y * px.width + x) * 4);
    }
  }
}

const heroes = [
  { id: 1, name: "Anti-Mage", primaryAttr: "agi" },
  { id: 2, name: "Axe", primaryAttr: "str" },
  { id: 5, name: "Crystal Maiden", primaryAttr: "int" },
  { id: 14, name: "Pudge", primaryAttr: "str" },
  { id: 26, name: "Lion", primaryAttr: "int" },
].map((h) => ({ ...h, portrait: portrait(h.id) }));

describe("DraftReader", () => {
  const reader = new DraftReader(heroes);

  it("reads the heroes in the top bar and leaves empty slots empty", () => {
    const px = screen();
    drawSlot(px, slotRects("radiant", W, H)[1], heroes[2].portrait);
    drawSlot(px, slotRects("dire", W, H)[0], heroes[4].portrait);
    const read = reader.read(px);
    expect(read.radiant.map((s) => s.heroId)).toEqual([null, 5, null, null, null]);
    expect(read.dire.map((s) => s.heroId)).toEqual([26, null, null, null, null]);
    expect([...read.radiant, ...read.dire].some((s) => s.unsure)).toBe(false);
  });

  it("reads your own slot with the level badge over the right of the portrait", () => {
    const px = screen();
    const r = slotRects("radiant", W, H)[0];
    drawSlot(px, r, heroes[1].portrait);
    // A bright gold and red badge over the right of the slot.
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x + Math.round(r.w * 0.62); x < r.x + r.w; x++)
        px.data.set(Math.floor((x + y) / 6) % 2 ? [255, 210, 40] : [120, 0, 20], (y * W + x) * 4);
    expect(reader.read(px).radiant[0]).toMatchObject({ heroId: 2, unsure: false });
  });

  it("ignores a grey preview of a hero that is not locked in yet", () => {
    const px = screen();
    const r = slotRects("radiant", W, H)[2];
    drawSlot(px, r, heroes[3].portrait);
    expect(reader.read(px).radiant[2].heroId).toBe(14);
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const i = (y * W + x) * 4;
        const grey = 0.3 * px.data[i] + 0.59 * px.data[i + 1] + 0.11 * px.data[i + 2];
        px.data.set([grey, grey, grey], i);
      }
    expect(reader.read(px).radiant[2]).toMatchObject({ heroId: null, unsure: false });
  });

  it("finds banned heroes by the slash on their grid cell, in name order per attribute", () => {
    const px = screen();
    // Strength block in name order: Axe, Pudge. Pudge is the second cell.
    drawBan(px, cellRect("str", 1, W, H));
    expect(reader.read(px).bans).toEqual([14]);
  });

  it("finds a ban on bright art, where one side of the slash is almost as red as the slash", () => {
    // Measured on a real banned Dawnbreaker cell: light art left of the slash, dark art right of it.
    const colours = { left: [90, 60, 62], right: [60, 46, 49], slash: [96, 62, 66] };
    for (const [width, height] of [
      [3440, 1440],
      [1920, 1080],
      [1280, 720],
    ]) {
      const px = { data: new Uint8ClampedArray(width * height * 4).fill(40), width, height };
      drawBan(px, cellRect("int", 1, width, height), colours);
      expect(reader.read(px).bans).toEqual([26]);
    }
  });

  it("scales the layout with the screen height", () => {
    const px = {
      data: new Uint8ClampedArray(1920 * 1080 * 4).fill(40),
      width: 1920,
      height: 1080,
    };
    drawSlot(px, slotRects("radiant", 1920, 1080)[0], heroes[0].portrait);
    expect(reader.read(px).radiant[0].heroId).toBe(1);
  });
});

describe("slashShare", () => {
  it("is high on a slashed cell and low on a plain one", () => {
    const px = screen();
    const r = cellRect("int", 0, W, H);
    expect(slashShare(px, r)).toBeLessThan(0.1);
    drawBan(px, r);
    expect(slashShare(px, r)).toBeGreaterThan(0.9);
  });

  it("is low on a red cell with no slash, such as a hero picked earlier", () => {
    const px = screen();
    const r = cellRect("int", 0, W, H);
    drawBan(px, r, { left: [70, 46, 49], right: [70, 46, 49], slash: [70, 46, 49] });
    expect(slashShare(px, r)).toBeLessThan(0.1);
  });
});
