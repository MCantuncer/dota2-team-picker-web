import type { ItemInfo } from "./engine/types";

/** The recipe scroll's art on the Steam CDN, as OpenDota lists it for every recipe. */
export const RECIPE_IMG = "/apps/dota2/images/dota_react/items/recipe.png";

/** One part an item is built from, with the copies it takes (Magic Wand takes two Iron Branches). */
export interface RecipePart {
  itemId: number;
  name: string;
  img: string;
  cost: number;
  count: number;
}

export interface Recipe {
  parts: RecipePart[];
  /** Gold the recipe scroll costs: what the item's price leaves after its parts. 0 when it needs none. */
  scroll: number;
}

/**
 * How an item is built: its parts in the shop's order, a repeated part once with its count, and the recipe scroll's
 * price. Undefined for a basic item, or when a part is missing from `items` (its price, and so the scroll's, is unknown).
 */
export function recipeOf(itemId: number, items: Record<string, ItemInfo> | undefined): Recipe | undefined {
  const item = items?.[itemId];
  if (!items || !item?.components.length) return undefined;
  const parts: RecipePart[] = [];
  for (const id of item.components) {
    const part = items[id];
    if (!part) return undefined;
    const seen = parts.find((p) => p.itemId === id);
    if (seen) seen.count += 1;
    else parts.push({ itemId: id, name: part.name, img: part.img, cost: part.cost, count: 1 });
  }
  const partsCost = parts.reduce((sum, p) => sum + p.cost * p.count, 0);
  return { parts, scroll: Math.max(0, item.cost - partsCost) };
}
