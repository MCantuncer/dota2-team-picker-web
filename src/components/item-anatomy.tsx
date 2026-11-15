import Image from "next/image";
import type { ItemInfo } from "@/lib/engine/types";
import { RECIPE_IMG, recipeOf } from "@/lib/item-recipe";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

/**
 * What an item is, under its name in the Build Path detail (Can 2026-11-15, on Bracer): what it gives the hero, as
 * the shop's bonus lines with the amount first, its own spells, and the parts it is built from as icons joined by plus
 * signs, each with its price, the recipe scroll last. Nothing shows for an item the hero data does not know yet.
 */
export function ItemAnatomy({ itemId, items }: { itemId: number; items?: Record<string, ItemInfo> }) {
  const item = items?.[itemId];
  if (!item) return null;
  const stats = item.stats ?? [];
  const spells = item.abilities ?? [];
  const recipe = recipeOf(itemId, items);
  if (!stats.length && !spells.length && !recipe) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      {(stats.length > 0 || spells.length > 0) && (
        <section aria-label={`What ${item.name} gives`} className="flex flex-col gap-3">
          <h5 className="text-xs font-medium text-subtle">Gives</h5>
          {stats.length > 0 && (
            <ul className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2">
              {stats.map((s) => (
                <li key={s.label} className="col-span-2 grid grid-cols-subgrid">
                  <span className="num text-right text-[0.9375rem] font-semibold text-fg">{s.value}</span>
                  <span className="text-sm text-muted">{s.label}</span>
                </li>
              ))}
            </ul>
          )}
          {spells.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {spells.map((a) => (
                <li key={a.name} className="inline-flex items-center gap-2 rounded-md bg-raised py-1 pl-1 pr-2.5 text-sm text-fg shadow-[inset_0_0_0_1px_var(--line-strong)]">
                  <span className={`chip h-5 shadow-none ${a.kind === "active" ? "chip-accent" : ""}`}>{a.kind === "active" ? "Active" : "Passive"}</span>
                  {a.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {recipe && (
        <section aria-label={`How to build ${item.name}`} className="flex flex-col gap-3">
          <h5 className="text-xs font-medium text-subtle">Built From</h5>
          <ol className="flex flex-wrap items-start gap-x-2 gap-y-4">
            {[...recipe.parts, ...(recipe.scroll > 0 ? [{ itemId: 0, name: "Recipe", img: RECIPE_IMG, cost: recipe.scroll, count: 1 }] : [])].map((part, i) => (
              <li key={`${part.itemId}-${part.name}`} className="flex items-start gap-2">
                {i > 0 && (
                  <span aria-hidden className="flex h-8 items-center text-base font-medium text-subtle">
                    +
                  </span>
                )}
                <span className="flex w-16 flex-col items-center gap-1 text-center">
                  <span className="relative">
                    <Image src={ITEM_CDN + part.img} alt="" width={44} height={32} className="block h-8 w-11 rounded-md object-cover shadow-[inset_0_0_0_1px_var(--line-strong)]" />
                    {part.count > 1 && (
                      <span className="num absolute -bottom-1 -right-2 rounded-xs bg-bg px-1 text-[0.6875rem] font-semibold leading-4 text-fg shadow-[0_0_0_1px_var(--line-hover)]">
                        x{part.count}
                      </span>
                    )}
                  </span>
                  <span className="text-xs leading-tight text-muted">
                    {part.count > 1 && <span className="sr-only">{part.count} </span>}
                    {part.name}
                  </span>
                  <span className="num text-xs text-subtle">
                    {part.cost.toLocaleString("en-US")}
                    <span className="sr-only"> gold</span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
