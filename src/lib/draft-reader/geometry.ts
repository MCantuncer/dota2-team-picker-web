/**
 * Where Dota's hero select screen draws things, measured on a 3440 x 1440 (21:9) screenshot.
 * Dota scales its interface with the window height and centres it, so every number is in pixels
 * at 1439 px high and x counts from the middle of the screen.
 */
const BASE_HEIGHT = 1439;
const BASE_CENTER_X = 1719.5;

/** A rectangle in screenshot pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Left edges of the 5 Radiant and 5 Dire top bar slots; the inside of the portrait frame only. */
const SLOT_LEFT = {
  radiant: [722, 886, 1050, 1215, 1380],
  dire: [1905, 2073, 2238, 2403, 2568],
};
const SLOT = { insetX: 8, w: 134, y: 16, h: 72 };

/** The hero grid: four attribute blocks, heroes in name order, row by row. */
const GRID_LEFT = { str: 618, agi: 1045, int: 1473, all: 1900 };
export const GRID_COLUMNS = { str: 6, agi: 6, int: 6, all: 4 };
const CELL = { top: 280, pitchX: 68, pitchY: 111, w: 56, h: 98 };

export type Attribute = keyof typeof GRID_COLUMNS;
export type Side = "radiant" | "dire";

function scaler(width: number, height: number) {
  const k = height / BASE_HEIGHT;
  const cx = width / 2;
  return (x: number, y: number, w: number, h: number): Rect => ({
    x: Math.round(cx + (x - BASE_CENTER_X) * k),
    y: Math.round(y * k),
    w: Math.round(w * k),
    h: Math.round(h * k),
  });
}

/** The 5 portrait rectangles of one team in the top bar, first player first. */
export function slotRects(side: Side, width: number, height: number): Rect[] {
  const at = scaler(width, height);
  return SLOT_LEFT[side].map((left) => at(left + SLOT.insetX, SLOT.y, SLOT.w, SLOT.h));
}

/** The rectangle of the `index`th hero (in name order) of an attribute block in the hero grid. */
export function cellRect(attr: Attribute, index: number, width: number, height: number): Rect {
  const at = scaler(width, height);
  const row = Math.floor(index / GRID_COLUMNS[attr]);
  const col = index % GRID_COLUMNS[attr];
  return at(GRID_LEFT[attr] + col * CELL.pitchX, CELL.top + row * CELL.pitchY, CELL.w, CELL.h);
}

/** The Steam name under each slot: centred on the slot, as wide as the gap to the next slot's name. */
const NAME = { centre: 75, halfW: 90, y: 104, h: 36 };

/** The 5 name label rectangles of one team, under the top bar, first player first. */
export function nameRects(side: Side, width: number, height: number): Rect[] {
  const at = scaler(width, height);
  return SLOT_LEFT[side].map((left) => at(left + NAME.centre - NAME.halfW, NAME.y, 2 * NAME.halfW, NAME.h));
}

/** The strip just under a name, where Dota lights a glow for your own name, and a strip further down to compare. */
const GLOW = { halfW: 60, y: 133, h: 9, belowY: 150, belowH: 15 };

/** Under each of one team's 5 names: the glow strip and the plain strip below it. */
export function glowRects(side: Side, width: number, height: number): { glow: Rect; below: Rect }[] {
  const at = scaler(width, height);
  return SLOT_LEFT[side].map((left) => {
    const x = left + NAME.centre - GLOW.halfW;
    return { glow: at(x, GLOW.y, 2 * GLOW.halfW, GLOW.h), below: at(x, GLOW.belowY, 2 * GLOW.halfW, GLOW.belowH) };
  });
}
