/**
 * Where each hero's face sits on its Steam render, so every render frame of one kind can put the face on the same
 * spot at the same scale (see HeroArt in src/components/hero-frame.tsx).
 *
 * Coordinates are in a 720 wide space: half the pixels of the Steam render (1440x1440 for most heroes, 2880x1440 for
 * a wide one such as Broodmother). Each point was measured by hand on the render and checked on a contact sheet of every
 * hero in the same frame: `faces` is each face centre, and `size` lists the renders that are not square. When a new
 * hero arrives, measure its render the same way and add it here.
 */

/** A point or a size in the 720 wide render space: `[x, y]` or `[width, height]`. */
export type RenderPoint = readonly [number, number];

/** Width of the render space every face point is measured in. */
export const RENDER_SPACE_WIDTH = 720;

/** A render's size when the table does not list it: most renders are square. */
export const SQUARE_RENDER: RenderPoint = [RENDER_SPACE_WIDTH, RENDER_SPACE_WIDTH];

const HERO_FACE_POINTS: {
  size: Record<number, RenderPoint>;
  faces: Record<number, RenderPoint>;
} = {
  size: {
    61: [720, 360],
    64: [720, 360],
    131: [720, 702],
    137: [720, 457],
  },
  faces: {
    1: [370, 100],
    2: [441, 135],
    3: [336, 112],
    4: [256, 260],
    5: [330, 98],
    6: [343, 104],
    7: [270, 276],
    8: [423, 105],
    9: [396, 92],
    10: [366, 190],
    11: [348, 210],
    12: [446, 104],
    13: [345, 370],
    14: [363, 278],
    15: [380, 102],
    16: [308, 383],
    17: [393, 200],
    18: [517, 168],
    19: [276, 252],
    20: [477, 150],
    21: [327, 124],
    22: [350, 80],
    23: [489, 53],
    25: [365, 100],
    26: [366, 122],
    27: [251, 226],
    28: [207, 150],
    29: [530, 195],
    30: [419, 311],
    31: [397, 138],
    32: [301, 208],
    33: [407, 94],
    34: [330, 345],
    35: [364, 107],
    36: [396, 223],
    37: [453, 382],
    38: [438, 152],
    39: [323, 135],
    40: [338, 352],
    41: [353, 133],
    42: [383, 173],
    43: [347, 153],
    44: [407, 135],
    45: [277, 235],
    46: [330, 207],
    47: [325, 244],
    48: [375, 100],
    49: [414, 60],
    50: [410, 250],
    51: [345, 194],
    52: [320, 175],
    53: [313, 238],
    54: [195, 208],
    55: [422, 325],
    56: [284, 221],
    57: [381, 82],
    58: [305, 132],
    59: [418, 133],
    60: [519, 166],
    61: [330, 187],
    62: [347, 262],
    63: [282, 350],
    64: [340, 119],
    65: [393, 138],
    66: [315, 182],
    67: [390, 243],
    68: [360, 152],
    69: [401, 244],
    70: [310, 232],
    71: [465, 427],
    72: [422, 174],
    73: [400, 76],
    74: [378, 178],
    75: [387, 114],
    76: [349, 127],
    77: [358, 174],
    78: [373, 171],
    79: [356, 134],
    80: [235, 239],
    81: [387, 92],
    82: [345, 372],
    83: [284, 195],
    84: [321, 104],
    85: [331, 99],
    86: [388, 213],
    87: [343, 122],
    88: [174, 292],
    89: [393, 243],
    90: [434, 80],
    91: [362, 360],
    92: [332, 370],
    93: [318, 254],
    94: [435, 158],
    95: [408, 163],
    96: [332, 121],
    97: [385, 170],
    98: [382, 270],
    99: [444, 348],
    100: [402, 169],
    101: [328, 259],
    102: [396, 111],
    103: [383, 189],
    104: [366, 225],
    105: [446, 294],
    106: [497, 95],
    107: [386, 107],
    108: [362, 219],
    109: [356, 248],
    110: [348, 332],
    111: [391, 162],
    112: [305, 239],
    113: [328, 103],
    114: [476, 142],
    119: [334, 277],
    120: [535, 166],
    121: [294, 141],
    123: [250, 184],
    126: [348, 143],
    128: [225, 395],
    129: [405, 175],
    131: [382, 71],
    135: [344, 169],
    136: [342, 89],
    137: [230, 192],
    138: [354, 133],
    145: [354, 311],
    155: [338, 204],
  },
};

/** A hero's render size and face centre, both in the 720 wide render space. */
export interface HeroFacePoint {
  face: RenderPoint;
  size: RenderPoint;
}

/** The hero's measured face point and render size, or undefined when the hero has not been measured yet. */
export function heroFacePoint(heroId: number): HeroFacePoint | undefined {
  const face = HERO_FACE_POINTS.faces[heroId];
  if (!face) return undefined;
  return { face, size: HERO_FACE_POINTS.size[heroId] ?? SQUARE_RENDER };
}
