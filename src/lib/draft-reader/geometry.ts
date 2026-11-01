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
const SLOT = { insetX: 12, w: 126, y: 12, h: 80 };

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
