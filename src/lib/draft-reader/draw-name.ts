import { NAME_TEXT_PX, nameInk, nameShapes, type Ink } from "./name";

/** Fonts close to Dota's: plain, slightly rounded sans serifs that most computers have. */
const FONT = `"Segoe UI", "Noto Sans", Roboto, "Helvetica Neue", Arial, sans-serif`;

/**
 * Your Steam name drawn by the browser, ready to look for under the top bar. Works in a page and in a
 * worker. Null for an empty name or a browser that can't draw off screen.
 */
export function nameToFind(name: string | null | undefined): Ink[] | null {
  const text = name?.trim();
  if (!text || typeof OffscreenCanvas === "undefined") return null;
  const canvas = new OffscreenCanvas(Math.ceil(NAME_TEXT_PX * (text.length + 2)), Math.ceil(NAME_TEXT_PX * 2));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = `${NAME_TEXT_PX}px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 4, canvas.height / 2);
  const ink = nameInk(ctx.getImageData(0, 0, canvas.width, canvas.height));
  return ink ? nameShapes(ink) : null;
}
