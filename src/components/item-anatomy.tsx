import Image from "next/image";
import type { ItemAbility, ItemInfo } from "@/lib/engine/types";
import { RECIPE_IMG, recipeOf, type RecipePart } from "@/lib/item-recipe";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

/*
 * The parts of the Build Path's item tooltip (Can 2026-11-15: "Dota like", option D on the item panel mockup), laid
 * out the way the game's own tooltip is: the parts the item is built from with their gold, the bonuses as "+5 Strength"
 * lines, and each spell in a box with its cooldown and mana cost, its text and its number lines.
 */

/** Dota's own gold icon, the coin stack the game and dota2.com show next to a price (Can 2026-11-27). */
export const GOLD_ICON = `${ITEM_CDN}/apps/dota2/images/dota_react/icons/gold.png`;

/** The gold coin next to a price. */
export function Coin({ size = "md" }: { size?: "sm" | "md" }) {
  const px = size === "sm" ? 16 : 22;
  return <Image src={GOLD_ICON} alt="" aria-hidden width={px} height={px} className="shrink-0" />;
}

/** The item's bonuses, side by side: the amount large and bright, what it adds to after it in muted. */
export function ItemStatLines({ item }: { item: Pick<ItemInfo, "name" | "stats"> }) {
  if (!item.stats?.length) return null;
  return (
    <ul aria-label={`What ${item.name} gives`} className="flex flex-wrap gap-x-7 gap-y-2">
      {item.stats.map((s) => (
        <li key={s.label} className="flex items-baseline gap-1.5">
          <span className="num text-lg leading-[1.375rem] font-semibold text-fg">{s.value}</span> <span className="text-sm text-muted">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Clock() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}

function Drop() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M8 2s4.5 5 4.5 8a4.5 4.5 0 0 1-9 0C3.5 7 8 2 8 2z" />
    </svg>
  );
}

/**
 * One spell: a copper "Active" tag (a quiet "Passive" one) before its name, the cooldown and mana on the right, then
 * its text and its number lines as a label over each value. No box of its own: a hairline above sets it apart.
 */
function SpellBox({ spell, cooldown, manaCost }: { spell: ItemAbility; cooldown?: number; manaCost?: number }) {
  const used = spell.kind === "active";
  return (
    <li className="flex flex-col gap-2.5 border-t border-line pt-[1.125rem]">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className={`rounded-md px-2 text-xs leading-[1.125rem] font-medium ${used ? "bg-accent-tint text-accent" : "bg-raised text-muted"}`}>
          {used ? "Active" : "Passive"}
        </span>
        <span className="sr-only">: </span>
        <span className="mr-auto text-base leading-[1.375rem] font-semibold tracking-[-0.01em] text-fg">{spell.name}</span>
        <span className="flex items-center gap-3.5">
          {cooldown !== undefined && (
            <span className="num flex items-center gap-1.5 text-sm font-medium text-muted">
              <span className="text-subtle">
                <Clock />
              </span>
              {cooldown}
              <span className="sr-only"> seconds cooldown</span>
            </span>
          )}
          {used && manaCost !== undefined && (
            <span className="num flex items-center gap-1.5 text-sm font-medium text-muted">
              <span className="text-attr-int">
                <Drop />
              </span>
              {manaCost}
              <span className="sr-only"> mana</span>
            </span>
          )}
        </span>
      </div>
      {spell.text && <p className="text-sm leading-[1.375rem] text-muted">{spell.text}</p>}
      {spell.facts && spell.facts.length > 0 && (
        <dl className="mt-1 flex flex-wrap gap-x-7 gap-y-2">
          {spell.facts.map((f) => (
            <div key={f.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-subtle">{f.label}</dt>
              <dd className="text-sm font-medium text-fg">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

/**
 * The item's spells, each in its box. Only the first used spell carries the item's cooldown and mana cost; with
 * `passiveCooldown` (neutral items, like Imp Claw's crit every 7 seconds) the first spell carries it whatever its kind.
 */
export function ItemSpells({ item, passiveCooldown = false }: { item: Pick<ItemInfo, "name" | "abilities" | "cooldown" | "manaCost">; passiveCooldown?: boolean }) {
  if (!item.abilities?.length) return null;
  const first = passiveCooldown ? 0 : item.abilities.findIndex((a) => a.kind === "active");
  return (
    // With no bonuses above it, the first spell needs no hairline of its own.
    <ul aria-label={`${item.name} spells`} className="flex flex-col gap-[1.125rem] first:[&>li:first-child]:border-t-0 first:[&>li:first-child]:pt-0">
      {item.abilities.map((a, i) => (
        <SpellBox key={a.name} spell={a} cooldown={i === first ? item.cooldown : undefined} manaCost={i === first ? item.manaCost : undefined} />
      ))}
    </ul>
  );
}

/**
 * The parts the item is built from, the recipe scroll last, each with its art and gold on one thin line across the card
 * (Can 2026-11-27: components give a "start first with this" feel; option B3, Forge Line, of the item pop-up parts
 * canvas). The finished item is not repeated at the end, as the header above shows it. Nothing for a basic item. With
 * `onPick`, each part (not the scroll) is a button that opens that part's own card.
 */
export function ItemParts({ itemId, items, onPick }: { itemId: number; items: Record<string, ItemInfo>; onPick?: (part: RecipePart) => void }) {
  const item = items[itemId];
  const recipe = recipeOf(itemId, items);
  if (!item || !recipe) return null;
  const parts = [...recipe.parts, ...(recipe.scroll > 0 ? [{ itemId: 0, name: "Recipe", img: RECIPE_IMG, cost: recipe.scroll, count: 1 }] : [])];
  return (
    <section aria-label={`How to build ${item.name}`} className="relative">
      {/* The finished item is already in the header, so the row is only the parts (Can 2026-11-27): each takes an even
          share of the width, and the line joins the middles of the first and the last art. */}
      <span aria-hidden className="absolute top-7 h-px bg-line-hover" style={{ left: `${50 / parts.length}%`, right: `${50 / parts.length}%` }} />
      <ol className="relative grid gap-x-3" style={{ gridTemplateColumns: `repeat(${parts.length}, minmax(0, 1fr))` }}>
        {parts.map((part) => (
          <li key={`${part.itemId}-${part.name}`} className="flex flex-col items-center gap-2.5 text-center">
            <PartArt part={part} onPick={onPick && part.itemId ? () => onPick(part) : undefined} />
            {/* Like the in-game shop: the art and its gold, the name read out and shown on hover (Can 2026-11-27). */}
            <span className="sr-only">
              {part.count > 1 && `${part.count} `}
              {part.name}
            </span>
            <span className="num flex items-center gap-1.5 text-sm font-semibold text-accent-bright">
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

/** A part's art with its copy count; a button to the part's own card when the card can open one. */
function PartArt({ part, onPick }: { part: RecipePart; onPick?: () => void }) {
  const art = (
    <>
      {/* The ring of card colour around the art hides the line behind it. */}
      <Image
        src={ITEM_CDN + part.img}
        alt=""
        width={78}
        height={56}
        className="block aspect-[78/56] w-[4.875rem] max-w-full rounded-lg object-cover shadow-[0_0_0_1px_var(--line-hover),0_0_0_4px_var(--surface)]"
      />
      {part.count > 1 && (
        <span className="num absolute -bottom-1 -right-2 rounded-xs bg-bg px-1 text-xs font-semibold leading-4 text-fg shadow-[0_0_0_1px_var(--line-hover)]">
          x{part.count}
        </span>
      )}
    </>
  );
  if (!onPick) return <span className="relative block max-w-full" title={part.name}>{art}</span>;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Open ${part.name}`}
      title={part.name}
      className="relative block max-w-full cursor-pointer rounded-lg transition-[filter] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {art}
    </button>
  );
}
