"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { ItemInfo, NeutralItem } from "@/lib/engine/types";
import { recipeOf } from "@/lib/item-recipe";
import { HeroFace } from "./hero-frame";
import { Icon } from "./icon";
import { Coin, ItemParts, ItemSpells, ItemStatLines } from "./item-anatomy";
import { NeutralKind } from "./neutral-kind";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

/*
 * The item pop-up card (Can 2026-11-15: "pop up a card when user clicks any item", "for each item details I need to
 * go same place, confusing"). Any item icon on the Draft page's game plan is a button that opens the Dota-style
 * tooltip right next to itself: its gold, the parts it is built from, what it gives and its spells, with this game's
 * numbers on top where the place it was clicked has them (the Build Path's minutes, the enemies it is for, why).
 * On a phone the card is a sheet from the bottom. Neutral items never come from the shop: their card shows the tier
 * (or an enchantment's level), the spell and bonuses, and no gold.
 */

/** What one card shows. The shop data comes from `itemId`, or from `name` when the place only knows the name. */
export interface ItemCardContent {
  itemId?: number;
  /** The name to show when the shop data has none (or to find it by, without `itemId`). */
  name?: string;
  /** The picture's path on the Steam CDN, or a full address. */
  img?: string;
  /** An enchantment's level where the card was opened (its tier's level). */
  level?: number;
  /** This game's numbers for the item, under the header. */
  band?: ReactNode;
  /** Last, under the parts, such as the Build Path's on time or late split. */
  footer?: ReactNode;
}

interface Open {
  id: string;
  anchor: HTMLElement;
  /** The cards opened from inside the card (a part, a later item), the last one shown, so Back goes one up. */
  stack: ItemCardContent[];
}

/** Shop items and neutral items by id, for the cards. */
interface Lookup {
  items?: Record<string, ItemInfo>;
  neutrals?: Record<string, NeutralItem>;
}

interface CardApi extends Lookup {
  openId?: string;
  show: (id: string, anchor: HTMLElement, card: ItemCardContent) => void;
  /** Set inside the card: an item there opens over the card instead of moving it. */
  push?: (card: ItemCardContent) => void;
}

const CardContext = createContext<CardApi | null>(null);

/** Gives every item button under it one shared card, so only one is open at a time. */
export function ItemCardProvider({ items, neutrals, children }: Lookup & { children: ReactNode }) {
  const [open, setOpen] = useState<Open>();
  const show = useCallback(
    (id: string, anchor: HTMLElement, card: ItemCardContent) => setOpen((now) => (now?.id === id ? undefined : { id, anchor, stack: [card] })),
    [],
  );
  const anchorRef = useRef<HTMLElement>(undefined);
  useEffect(() => {
    anchorRef.current = open?.anchor;
  }, [open?.anchor]);
  const close = useCallback((refocus: boolean) => {
    if (refocus) anchorRef.current?.focus({ preventScroll: true });
    setOpen(undefined);
  }, []);
  const api = useMemo(() => ({ items, neutrals, openId: open?.id, show }), [items, neutrals, open?.id, show]);
  return (
    <CardContext.Provider value={api}>
      {children}
      {open &&
        createPortal(
          <Popup
            anchor={open.anchor}
            stack={open.stack}
            items={items}
            neutrals={neutrals}
            onPush={(card) => setOpen((now) => now && { ...now, stack: [...now.stack, card] })}
            onBack={() => setOpen((now) => now && { ...now, stack: now.stack.slice(0, -1) })}
            onClose={close}
          />,
          document.body,
        )}
    </CardContext.Provider>
  );
}

/**
 * An item icon that opens its card. Without a card around it (or with no data for the item) it is the icon alone.
 * `children` gets whether its card is open, so the icon can show it is the one picked.
 */
export function ItemButton({
  card,
  label,
  className = "",
  children,
}: {
  card: ItemCardContent;
  /** What the button says; the item's name when left out. */
  label?: string;
  className?: string;
  children: ReactNode | ((open: boolean) => ReactNode);
}) {
  const api = useContext(CardContext);
  const id = useId();
  const open = api?.openId === id && !api.push;
  const art = typeof children === "function" ? children(open) : children;
  if (!api) return <span className={className}>{art}</span>;
  const said = label ?? findItem(api.items, card)?.info.name ?? findNeutral(api.neutrals, card)?.name ?? card.name ?? "Item";
  return (
    <button
      type="button"
      aria-label={said}
      title={said}
      aria-haspopup="dialog"
      aria-expanded={api.push ? undefined : open}
      onClick={(e) => (api.push ? api.push(card) : api.show(id, e.currentTarget, card))}
      className={`relative cursor-pointer rounded-md transition-[filter] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      {art}
    </button>
  );
}

/** Finds the shop item a card is for: by id, else by its name (recipes share their item's name, so they are skipped). */
export function findItem(items: Record<string, ItemInfo> | undefined, card: Pick<ItemCardContent, "itemId" | "name">): { id: number; info: ItemInfo } | undefined {
  if (!items) return undefined;
  if (card.itemId !== undefined && items[card.itemId]) return { id: card.itemId, info: items[card.itemId]! };
  if (!card.name) return undefined;
  for (const [id, info] of Object.entries(items)) {
    if (info.name === card.name && !info.key.startsWith("recipe_")) return { id: Number(id), info };
  }
  return undefined;
}

/** The neutral item a card is for, by id; neutral items are never found by name (a shop item may share it). */
export function findNeutral(neutrals: Record<string, NeutralItem> | undefined, card: Pick<ItemCardContent, "itemId">): NeutralItem | undefined {
  return card.itemId === undefined ? undefined : neutrals?.[card.itemId];
}

/** A picture path from the Steam CDN, or an address as it is. */
export const itemSrc = (img: string) => (/^https?:\/\//.test(img) ? img : ITEM_CDN + img);

const SHEET = "(max-width: 639px)";

function Popup({
  anchor,
  stack,
  items,
  neutrals,
  onPush,
  onBack,
  onClose,
}: Lookup & {
  anchor: HTMLElement;
  stack: ItemCardContent[];
  onPush: (card: ItemCardContent) => void;
  onBack: () => void;
  onClose: (refocus: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sheet = useMedia(SHEET);
  const [place, setPlace] = useState<Place>();
  const card = stack.at(-1)!; // The stack is never empty while the card is open.
  const titleId = useId();

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || sheet) return;
    const a = anchor.getBoundingClientRect();
    if (a.bottom < headerBottom() || a.top > window.innerHeight) return onClose(false);
    setPlace(placeCard(a, { width: el.offsetWidth, height: el.offsetHeight }, { width: window.innerWidth, height: window.innerHeight, top: headerBottom() }));
  }, [anchor, sheet, onClose]);

  useLayoutEffect(measure, [measure, card]);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [card]);
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.contains(t)) onClose(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(true);
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [anchor, measure, onClose]);

  const inside = useMemo<CardApi>(() => ({ items, neutrals, show: () => {}, push: onPush }), [items, neutrals, onPush]);
  const prev = stack.length > 1 ? stack.at(-2)! : undefined;
  const back = prev && (findItem(items, prev)?.info.name ?? prev.name ?? "Item");
  return (
    <>
      {sheet && <div aria-hidden className="fixed inset-0 z-50" style={{ background: "var(--scrim)" }} />}
      <div
        ref={ref}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={sheet ? undefined : place ? { top: place.top, left: place.left, maxHeight: place.maxHeight } : { top: 0, left: 0, visibility: "hidden" }}
        className={`fixed z-50 flex flex-col overflow-y-auto overscroll-contain bg-surface outline-none shadow-[inset_0_0_0_1px_var(--line-hover),0_18px_40px_rgb(0_0_0/0.5)] ${
          sheet ? "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl pb-[env(safe-area-inset-bottom,0px)]" : "w-[30rem] rounded-xl"
        }`}
      >
        {sheet && <span aria-hidden className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-xs bg-line-hover" />}
        <CardContext.Provider value={inside}>
          <ItemCard card={card} items={items} neutrals={neutrals} titleId={titleId} back={back} onBack={onBack} onClose={() => onClose(true)} onPart={onPush} />
        </CardContext.Provider>
      </div>
    </>
  );
}

/** The Dota-style tooltip: the header with art, name and gold, the parts to buy, this game's band, the bonuses and spells. */
export function ItemCard({
  card,
  items,
  neutrals,
  titleId,
  back,
  onBack,
  onClose,
  onPart,
}: Lookup & {
  card: ItemCardContent;
  titleId?: string;
  back?: string;
  onBack?: () => void;
  onClose?: () => void;
  onPart?: (card: ItemCardContent) => void;
}) {
  const found = findItem(items, card);
  const info = found?.info;
  const neutral = info ? undefined : findNeutral(neutrals, card);
  const name = info?.name ?? neutral?.name ?? card.name ?? "Item";
  const img = info?.img ?? neutral?.img ?? card.img;
  const level = neutral?.levels && Math.min(card.level ?? 1, neutral.levels.length);
  // An enchantment's bonuses are those of its level; an artifact's are its own.
  const shown = neutral && { name: neutral.name, stats: level ? neutral.levels![level - 1] : neutral.stats, abilities: neutral.abilities, cooldown: neutral.cooldown };
  const body = (info && (info.stats?.length || info.abilities?.length)) || (shown && (shown.stats?.length || shown.abilities?.length));
  const parts = items && found && recipeOf(found.id, items) ? <ItemParts itemId={found.id} items={items} onPick={onPart && ((p) => onPart({ itemId: p.itemId, name: p.name, img: p.img }))} /> : null;
  return (
    <>
      <div className="flex items-center gap-4 border-b border-line py-5 pr-4 pl-5">
        {img ? (
          <Image
            src={itemSrc(img)}
            alt=""
            width={104}
            height={76}
            className="block h-19 w-26 shrink-0 rounded-lg object-cover shadow-[0_0_0_1px_var(--line-hover),0_6px_18px_rgb(0_0_0/0.4)]"
          />
        ) : (
          <span aria-hidden className="block h-19 w-26 shrink-0 rounded-lg bg-raised" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h4 id={titleId} className="text-lg leading-[1.625rem] font-semibold tracking-[-0.02em] text-fg">
            {name}
          </h4>
          {info?.cost ? (
            <span className="num flex items-center gap-2 text-base font-semibold text-accent-bright">
              <Coin />
              {info.cost.toLocaleString("en-US")}
              <span className="sr-only"> gold</span>
            </span>
          ) : null}
          {neutral && <NeutralKind item={neutral} level={level} />}
        </div>
        {(onBack || onClose) && (
          <div className="-mr-2 flex shrink-0 items-center gap-1 self-start">
            {back && onBack && (
              <button type="button" onClick={onBack} aria-label={`Back to ${back}`} title={`Back to ${back}`} className="btn btn-ghost btn-sm btn-icon">
                <Icon name="chevronLeft" />
              </button>
            )}
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Close" title="Close" className="btn btn-ghost btn-sm btn-icon">
                <Icon name="x" />
              </button>
            )}
          </div>
        )}
      </div>
      {parts && <div className="border-b border-line px-5 pt-[1.125rem] pb-4">{parts}</div>}
      {card.band && <div className="flex flex-col gap-3.5 border-b border-line bg-bg px-5 pt-4 pb-[1.125rem]">{card.band}</div>}
      {body && (
        <div className="flex flex-col gap-[1.125rem] px-5 pt-[1.125rem] [&:last-child]:pb-5">
          {info && <ItemStatLines item={info} />}
          {info && <ItemSpells item={info} />}
          {shown && <ItemStatLines item={shown} />}
          {shown && <ItemSpells item={shown} passiveCooldown />}
        </div>
      )}
      {!body && !parts && !card.band && <p className="px-5 py-4 text-sm text-muted">No details for this item yet.</p>}
      {card.footer && <div className={`px-5 pb-5 ${body ? "mt-4" : "pt-4"}`}>{card.footer}</div>}
    </>
  );
}

export interface BandFact {
  value: string;
  label: string;
  tone?: string;
}

/** When this game's player (or an enemy) usually has the item: the minute, "~" when rough, and when it is late. */
export interface BandTiming {
  minute: number;
  around?: boolean;
  /** The minute after which buying it is slower than most. */
  late?: number;
  /** Whose item: the dot takes their colour (copper for yours, red for an enemy's, green for an ally's). */
  side?: "you" | "enemy" | "ally";
}

const DOT = { you: "bg-accent", enemy: "bg-dire", ally: "bg-radiant" } as const;
const LEAD = { you: "to-accent-deep", enemy: "to-dire-strong", ally: "to-radiant-strong" } as const;

/**
 * The minute as a small bar from 0 to at least 40 (Can 2026-11-27, option C2 Timing Bar): a dot at the usual minute
 * and, after the late minute, a striped part. "Done by 18 min" over it on the left, "Late after 22 min" on the right.
 */
function TimingBar({ timing, facts = [] }: { timing: BandTiming; facts?: BandFact[] }) {
  const side = timing.side ?? "you";
  const end = Math.max(40, Math.ceil((Math.max(timing.minute, timing.late ?? 0) + 6) / 10) * 10);
  const at = (m: number) => `${(Math.min(Math.max(m, 0), end) / end) * 100}%`;
  const ticks = Array.from({ length: end / 10 + 1 }, (_, i) => i * 10);
  const minute = `${timing.around ? "~" : ""}${timing.minute} min`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-base font-semibold text-fg">
          Done by <span className="num">{minute}</span>
          {/* Other numbers ride on the same line, quieter ("x2 Copies"), so no column stands alone under the bar. */}
          {facts.map((f) => (
            <span key={f.label} className="font-normal text-subtle">
              <span aria-hidden> · </span>
              <span className={`num font-semibold ${f.tone ?? "text-fg"}`}>{f.value}</span> {f.label}
            </span>
          ))}
        </span>
        {timing.late !== undefined && (
          <span className="text-sm text-subtle">
            Late after <span className="num font-semibold text-warn">{timing.late} min</span>
          </span>
        )}
      </div>
      <div aria-hidden className="relative h-[1.875rem]">
        <span className="absolute inset-x-0 top-1 h-1.5 rounded-xs bg-line" />
        <span
          className={`absolute top-1 h-1.5 rounded-l-xs bg-linear-to-r from-transparent ${LEAD[side]}`}
          style={{ left: at(timing.minute - 6), width: `calc(${at(timing.minute)} - ${at(timing.minute - 6)})` }}
        />
        {timing.late !== undefined && (
          <>
            <span
              className="absolute top-1 right-0 h-1.5 rounded-r-xs bg-[repeating-linear-gradient(135deg,var(--warn-tint)_0_4px,var(--line)_4px_8px)]"
              style={{ left: at(timing.late) }}
            />
            <span className="absolute top-0 h-3.5 w-0.5 rounded-xs bg-warn" style={{ left: at(timing.late) }} />
          </>
        )}
        <span className={`absolute top-0 size-3.5 -translate-x-1/2 rounded-full shadow-[0_0_0_3px_var(--bg)] ${DOT[side]}`} style={{ left: at(timing.minute) }} />
        {ticks.map((m, i) => (
          <span
            key={m}
            className={`num absolute top-4 text-xs text-subtle ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: at(m) }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The card's game band: the minute as a timing bar, other numbers as columns ("x2" over "Copies") split by hairlines,
 * then the heroes it is for as portraits beside why (or beside their word when there is no why).
 */
export function ItemBand({
  timing,
  facts = [],
  chip,
  why,
}: {
  timing?: BandTiming;
  facts?: BandFact[];
  chip?: { text: string; enemy: boolean; faces: { name: string; portrait?: string }[] };
  why?: string;
}) {
  const faces = chip?.faces.filter((f) => f.portrait) ?? [];
  return (
    <>
      {timing && <TimingBar timing={timing} facts={facts} />}
      {!timing && facts.length > 0 && (
        <dl className="-mx-4 flex flex-wrap gap-y-3">
          {facts.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-1 border-line px-4 not-first:border-l">
              <dt className="order-last text-xs text-subtle">{f.label}</dt>
              <dd className={`num text-lg leading-[1.375rem] font-semibold tracking-[-0.01em] ${f.tone ?? "text-fg"}`}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(chip || why) && (
        <div className="flex items-center gap-3">
          {chip && (
            <span className="flex shrink-0 items-center gap-1.5" title={chip.text}>
              {faces.map((f) => (
                <HeroFace key={f.name} portrait={f.portrait!} name={f.name} size={36} isEnemy={chip.enemy} isDecorative />
              ))}
              {/* The faces say who; the words are read out, and shown when there is no why to sit beside them. */}
              <span className={why && faces.length ? "sr-only" : `text-sm font-medium ${chip.enemy ? "text-dire" : "text-radiant"}`}>{chip.text}</span>
            </span>
          )}
          {why && <p className="text-sm leading-[1.3125rem] text-muted">{why}</p>}
        </div>
      )}
    </>
  );
}

export interface Place {
  top: number;
  left: number;
  maxHeight: number;
}

const GAP = 10;
const EDGE = 16;

/**
 * Where the card goes next to its item: under it, else over it, else beside it (right, then left), kept inside the
 * screen and under the site header. When nothing fits, it sits as low as it can and scrolls inside itself.
 */
export function placeCard(
  a: { top: number; left: number; width: number; height: number },
  card: { width: number; height: number },
  screen: { width: number; height: number; top: number },
): Place {
  const top0 = screen.top + EDGE;
  const room = screen.height - EDGE - top0;
  const maxHeight = Math.max(160, room);
  const h = Math.min(card.height, maxHeight);
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), Math.max(EDGE, screen.width - card.width - EDGE));
  const clampY = (y: number) => Math.min(Math.max(y, top0), Math.max(top0, screen.height - h - EDGE));
  const centerX = clampX(a.left + a.width / 2 - card.width / 2);
  const bottom = a.top + a.height;
  if (bottom + GAP + h <= screen.height - EDGE) return { top: bottom + GAP, left: centerX, maxHeight };
  if (a.top - GAP - h >= top0) return { top: a.top - GAP - h, left: centerX, maxHeight };
  const sideY = clampY(a.top + a.height / 2 - h / 2);
  if (a.left + a.width + GAP + card.width <= screen.width - EDGE) return { top: sideY, left: a.left + a.width + GAP, maxHeight };
  if (a.left - GAP - card.width >= EDGE) return { top: sideY, left: a.left - GAP - card.width, maxHeight };
  return { top: clampY(screen.height), left: centerX, maxHeight };
}

/** The sticky site header covers the top of the screen, so the card never goes under it. */
function headerBottom() {
  return Math.max(0, document.querySelector("header")?.getBoundingClientRect().bottom ?? 0);
}

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener("change", onChange);
      return () => list?.removeEventListener("change", onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
