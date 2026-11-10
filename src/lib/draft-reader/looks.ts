import { PATCH_H, PATCH_W } from "./match";

const PATCH_SIZE = PATCH_W * PATCH_H * 3;

/**
 * How a hero looks on one player's screen when that differs from its store portrait: a persona, an
 * arcana or other cosmetic art, or art Dota changed. The reader learns a look when the player adds a
 * hero by hand that it could not read, and reads that hero by it from then on. Looks stay in this
 * browser.
 */
export interface Look {
  heroId: number;
  /** The whole slot and its left part, as compared by the reader (match.ts patch). */
  patch: Float32Array;
  left: Float32Array;
  /** How colourful the slot was, for telling a locked pick from a grey preview. */
  colour: number;
}

/** Looks kept per hero (newest first): a hero can wear a few different cosmetics. */
export const LOOKS_PER_HERO = 3;
/** Looks kept in all, about 15 KB each once stored. */
export const MAX_LOOKS = 40;

/** Adds a look, newest first, keeping LOOKS_PER_HERO per hero and MAX_LOOKS in all. */
export function addLook(looks: Look[], look: Look): Look[] {
  const same = looks.filter((l) => l.heroId === look.heroId).slice(0, LOOKS_PER_HERO - 1);
  return [look, ...looks.filter((l) => l.heroId !== look.heroId || same.includes(l))].slice(0, MAX_LOOKS);
}

/** Drops every look of a hero, after a read by one of them turned out wrong. */
export const forgetHero = (looks: Look[], heroId: number): Look[] => looks.filter((l) => l.heroId !== heroId);

interface StoredLook {
  heroId: number;
  colour: number;
  patch: StoredPatch;
  left: StoredPatch;
}
/** A patch as whole numbers: each value over `scale`, as 16-bit integers in base64. */
interface StoredPatch {
  scale: number;
  data: string;
}

/** Looks as text for storage. Patches are stored at 16-bit precision, plenty for comparing art. */
export function encodeLooks(looks: Look[]): string {
  return JSON.stringify(
    looks.map((l): StoredLook => ({ heroId: l.heroId, colour: l.colour, patch: encodePatch(l.patch), left: encodePatch(l.left) })),
  );
}

/** Looks back from storage. Anything malformed is skipped, so a bad entry never breaks reading. */
export function decodeLooks(text: string | null): Look[] {
  if (!text) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((s: Partial<StoredLook> | null) => {
    if (!s || !Number.isInteger(s.heroId) || typeof s.colour !== "number" || !Number.isFinite(s.colour)) return [];
    const patch = decodePatch(s.patch);
    const left = decodePatch(s.left);
    if (patch?.length !== PATCH_SIZE || left?.length !== PATCH_SIZE) return [];
    return [{ heroId: s.heroId!, colour: s.colour, patch, left }];
  });
}

function encodePatch(p: Float32Array): StoredPatch {
  let scale = 0;
  for (const v of p) scale = Math.max(scale, Math.abs(v));
  scale ||= 1;
  const ints = new Int16Array(p.length);
  for (let i = 0; i < p.length; i++) ints[i] = Math.round((p[i]! / scale) * 32767);
  const bytes = new Uint8Array(ints.buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return { scale, data: btoa(binary) };
}

function decodePatch(s: Partial<StoredPatch> | undefined): Float32Array | null {
  if (!s || typeof s.scale !== "number" || !(s.scale > 0) || typeof s.data !== "string") return null;
  let binary: string;
  try {
    binary = atob(s.data);
  } catch {
    return null;
  }
  if (binary.length === 0 || binary.length % 2) return null;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ints = new Int16Array(bytes.buffer);
  const out = new Float32Array(ints.length);
  for (let i = 0; i < ints.length; i++) out[i] = (ints[i]! / 32767) * s.scale;
  return out;
}
