// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { nameRects } from "./geometry";
import type { Pixels } from "./match";
import { findMe, glowSlot, nameInk, nameShapes, nameSlot, NAME_TEXT_PX, type Ink } from "./name";

// A real strategy time screenshot (21:9, 1720 x 720). The player is Radiant's first slot, "ct'x"
// with a guild tag; the other names are Alicia, Анастасія, Châu, 小佳 and Teréz, Ilias, Camille,
// Mapíva, Akif.
const FIXTURE = join(__dirname, "../../../e2e/fixtures/draft-strategy-ten-picked.png");
// The same game with the names blanked out and no glow: nothing to find a side by.
const BLANKED = join(__dirname, "../../../e2e/fixtures/draft-nine-picked.png");

async function pixels(file: string | Buffer, height?: number): Promise<Pixels> {
  const { data, info } = await sharp(file)
    .resize(height ? { height } : undefined)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

/** A name drawn white on black in a plain font, as the browser draws it with nameToFind. */
async function drawn(name: string): Promise<Ink[]> {
  const text = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&apos;");
  const w = Math.ceil(NAME_TEXT_PX * (name.length + 2));
  const h = Math.ceil(NAME_TEXT_PX * 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="black"/><text x="4" y="${NAME_TEXT_PX * 1.4}" font-family="DejaVu Sans, sans-serif" font-size="${NAME_TEXT_PX}" fill="white">${text}</text></svg>`;
  return nameShapes(nameInk(await pixels(Buffer.from(svg)))!);
}

/** The frame with the name labels (and the glow under them) of two slots swapped. */
function swapLabels(px: Pixels, a: { side: "radiant" | "dire"; slot: number }, b: { side: "radiant" | "dire"; slot: number }): Pixels {
  const out = { ...px, data: new Uint8ClampedArray(px.data) };
  const ra = nameRects(a.side, px.width, px.height)[a.slot]!;
  const rb = nameRects(b.side, px.width, px.height)[b.slot]!;
  // From the top of the label down past the glow.
  const top = ra.y;
  const rows = Math.round(ra.h * 1.9);
  for (let y = top; y < top + rows; y++)
    for (let x = 0; x < ra.w; x++) {
      const i = (y * px.width + ra.x + x) * 4;
      const j = (y * px.width + rb.x + x) * 4;
      out.data.set(px.data.subarray(j, j + 4), i);
      out.data.set(px.data.subarray(i, i + 4), j);
    }
  return out;
}

describe("findMe", () => {
  let frame: Pixels;
  let me: Ink[];
  beforeAll(async () => {
    frame = await pixels(readFileSync(FIXTURE));
    me = await drawn("ct'x");
  });

  it("finds you by your name and the glow under it", () => {
    expect(findMe(frame, me)).toEqual({ side: "radiant", slot: 0, by: "both" });
  });

  it("finds you on Dire", () => {
    const dire = swapLabels(frame, { side: "radiant", slot: 0 }, { side: "dire", slot: 2 });
    expect(findMe(dire, me)).toEqual({ side: "dire", slot: 2, by: "both" });
  });

  it("finds you at other screen sizes", async () => {
    for (const height of [1080, 1440]) {
      const px = await pixels(readFileSync(FIXTURE), height);
      expect(findMe(px, me), `${height} px high`).toEqual({ side: "radiant", slot: 0, by: "both" });
    }
    // Below 720 px the name is too small to read, but the glow still shows the side.
    expect(findMe(await pixels(readFileSync(FIXTURE), 540), me)).toMatchObject({ side: "radiant", slot: 0 });
  });

  it("tells every player's name apart", async () => {
    const players = [["Alicia", 1], ["Teréz", 5], ["Ilias", 6], ["Camille", 7], ["Akif", 9]] as const;
    for (const [name, slot] of players) expect(nameSlot(frame, await drawn(name)), name).toBe(slot);
  });

  it("finds you by the glow alone without a name (signed out)", () => {
    expect(findMe(frame, null)).toEqual({ side: "radiant", slot: 0, by: "glow" });
  });

  it("finds nobody when the name points at one slot and the glow at another", async () => {
    // A Steam name changed since sign in, or another player with a name like yours.
    expect(glowSlot(frame)).toBe(0);
    expect(findMe(frame, await drawn("Akif"))).toBeNull();
  });

  it("finds nobody when no name or glow shows", async () => {
    expect(findMe(await pixels(readFileSync(BLANKED)), me)).toBeNull();
  });
});
