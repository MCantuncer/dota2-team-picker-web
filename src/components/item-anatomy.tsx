import Image from "next/image";
import type { ItemAbility, ItemInfo } from "@/lib/engine/types";
import { RECIPE_IMG, recipeOf } from "@/lib/item-recipe";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

/*
 * The parts of the Build Path's item tooltip (Can 2026-11-15: "Dota like", option D on the item panel mockup), laid
 * out the way the game's own tooltip is: the bonuses as "+5 Strength" lines, each spell in a box with its cooldown and
 * mana cost, its text and its number lines, then the parts the item is built from with their gold.
 */

/** The gold coin next to a price. */
export function Coin({ size = "md" }: { size?: "sm" | "md" }) {
  return <span aria-hidden className={`shrink-0 rounded-full bg-accent shadow-[inset_0_-1px_0_var(--accent-deep)] ${size === "sm" ? "size-2" : "size-3"}`} />;
}

/** The item's bonuses, one "+5 Strength" line each: the amount bright, what it adds to muted. */
export function ItemStatLines({ item }: { item: ItemInfo }) {
  if (!item.stats?.length) return null;
  return (
    <ul aria-label={`What ${item.name} gives`} className="flex flex-col gap-1 text-[0.9375rem] leading-normal">
      {item.stats.map((s) => (
        <li key={s.label}>
          <span className="num font-semibold text-fg">{s.value}</span> <span className="text-muted">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Clock() {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}

function Drop() {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M8 2s4.5 5 4.5 8a4.5 4.5 0 0 1-9 0C3.5 7 8 2 8 2z" />
    </svg>
  );
}

/** One spell box: "Active: Avatar" with the cooldown and mana on the right, then its text and number lines. */
function SpellBox({ spell, cooldown, manaCost }: { spell: ItemAbility; cooldown?: number; manaCost?: number }) {
  const used = spell.kind === "active";
  return (
    <li className="flex flex-col gap-2.5 rounded-lg bg-raised px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--line-strong)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="mr-auto text-base font-semibold text-fg">
          <span className={used ? "text-accent" : "text-muted"}>{used ? "Active" : "Passive"}:</span> {spell.name}
        </span>
        {used && cooldown !== undefined && (
          <span className="num flex items-center gap-1.5 text-sm font-semibold text-muted">
            <Clock />
            {cooldown}
            <span className="sr-only"> seconds cooldown</span>
          </span>
        )}
        {used && manaCost !== undefined && (
          <span className="num flex items-center gap-1.5 text-sm font-semibold text-muted">
            <Drop />
            {manaCost}
            <span className="sr-only"> mana</span>
          </span>
        )}
      </div>
      {spell.text && <p className="text-sm leading-relaxed text-muted">{spell.text}</p>}
      {spell.facts && spell.facts.length > 0 && (
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem]">
          {spell.facts.map((f) => (
            <div key={f.label} className="flex gap-1.5">
              <dt className="text-subtle">{f.label}</dt>
              <dd className="font-semibold text-fg">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

/** The item's spells, each in its box. Only the first used spell carries the item's cooldown and mana cost. */
export function ItemSpells({ item }: { item: ItemInfo }) {
  if (!item.abilities?.length) return null;
  const first = item.abilities.findIndex((a) => a.kind === "active");
  return (
    <ul aria-label={`${item.name} spells`} className="flex flex-col gap-2">
      {item.abilities.map((a, i) => (
        <SpellBox key={a.name} spell={a} cooldown={i === first ? item.cooldown : undefined} manaCost={i === first ? item.manaCost : undefined} />
      ))}
    </ul>
  );
}

/** The parts the item is built from, the recipe scroll last, each with its name and gold. Nothing for a basic item. */
export function ItemParts({ itemId, items }: { itemId: number; items: Record<string, ItemInfo> }) {
  const item = items[itemId];
  const recipe = recipeOf(itemId, items);
  if (!item || !recipe) return null;
  const parts = [...recipe.parts, ...(recipe.scroll > 0 ? [{ itemId: 0, name: "Recipe", img: RECIPE_IMG, cost: recipe.scroll, count: 1 }] : [])];
  return (
    <section aria-label={`How to build ${item.name}`} className="flex flex-col gap-3">
      <h5 className="text-[0.8125rem] font-medium text-subtle">Built From</h5>
      <ol className="flex flex-wrap gap-2.5">
        {parts.map((part) => (
          <li key={`${part.itemId}-${part.name}`} className="flex w-[4.75rem] flex-col items-center gap-1.5 text-center">
            <span className="relative">
              <Image src={ITEM_CDN + part.img} alt="" width={60} height={44} className="block h-11 w-[3.75rem] rounded-md object-cover shadow-[0_0_0_1px_var(--line-hover)]" />
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
            <span className="num flex items-center gap-1.5 text-[0.8125rem] font-semibold text-accent-bright">
              <Coin size="sm" />
              {part.cost.toLocaleString("en-US")}
              <span className="sr-only"> gold</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
