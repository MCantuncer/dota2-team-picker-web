import type { HeroInfo } from "@/lib/engine/types";
import { DraftReader, type ReaderHero } from "./reader";
import type { Pixels } from "./match";

/** The pixels of an image, drawn once on a canvas. */
export async function pixelsOf(source: Blob): Promise<Pixels> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser can't read images");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Builds the reader from every hero's portrait. Portraits come through the site's own image route,
 * because Steam's image server doesn't let other sites read its pixels.
 */
export async function loadReader(heroes: HeroInfo[], portraits: Record<number, string>): Promise<DraftReader> {
  const withArt = heroes.filter((h) => portraits[h.id]);
  const loaded: ReaderHero[] = await Promise.all(
    withArt.map(async (h) => {
      const res = await fetch(`/_next/image?url=${encodeURIComponent(portraits[h.id])}&w=256&q=75`);
      if (!res.ok) throw new Error(`Hero art download failed (${res.status})`);
      return {
        id: h.id,
        name: h.name,
        primaryAttr: h.primaryAttr,
        portrait: await pixelsOf(await res.blob()),
      };
    }),
  );
  return new DraftReader(loaded);
}
