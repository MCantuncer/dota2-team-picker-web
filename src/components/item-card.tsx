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
import type { ItemInfo } from "@/lib/engine/types";
import { recipeOf } from "@/lib/item-recipe";
import { HeroFace } from "./hero-frame";
import { Icon } from "./icon";
import { Coin, ItemParts, ItemSpells, ItemStatLines } from "./item-anatomy";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

/*
 * The item pop-up card (Can 2026-11-15: "pop up a card when user clicks any item", "for each item details I need to
 * go same place, confusing"). Any item icon on the Draft page's game plan is a button that opens the Dota-style
 * tooltip right next to itself: its gold, what it gives, its spells and the parts it is built from, with this game's
 * numbers on top where the place it was clicked has them (the Build Path's minutes, the enemies it is for, why).
 * On a phone the card is a sheet from the bottom.
 */

/** What one card shows. The shop data comes from `itemId`, or from `name` when the place only knows the name. */
export interface ItemCardContent {
  itemId?: number;
  /** The name to show when the shop data has none (or to find it by, without `itemId`). */
  name?: string;
  img?: string;
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

interface CardApi {
  items?: Record<string, ItemInfo>;
  openId?: string;
  show: (id: string, anchor: HTMLElement, card: ItemCardContent) => void;
  /** Set inside the card: an item there opens over the card instead of moving it. */
  push?: (card: ItemCardContent) => void;
}

const CardContext = createContext<CardApi | null>(null);

/** Gives every item button under it one shared card, so only one is open at a time. */
export function ItemCardProvider({ items, children }: { items?: Record<string, ItemInfo>; children: ReactNode }) {
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
  const api = useMemo(() => ({ items, openId: open?.id, show }), [items, open?.id, show]);
  return (
    <CardContext.Provider value={api}>
      {children}
      {open &&
        createPortal(
          <Popup
            anchor={open.anchor}
            stack={open.stack}
            items={items}
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
  const said = label ?? findItem(api.items, card)?.info.name ?? card.name ?? "Item";
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

const SHEET = "(max-width: 639px)";

function Popup({
  anchor,
  stack,
  items,
  onPush,
  onBack,
  onClose,
}: {
  anchor: HTMLElement;
  stack: ItemCardContent[];
  items?: Record<string, ItemInfo>;
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

  const inside = useMemo<CardApi>(() => ({ items, show: () => {}, push: onPush }), [items, onPush]);
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
          sheet ? "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]" : "w-[30rem] rounded-xl"
        }`}
      >
        {sheet && <span aria-hidden className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-xs bg-line-hover" />}
        <CardContext.Provider value={inside}>
          <ItemCard card={card} items={items} titleId={titleId} back={back} onBack={onBack} onClose={() => onClose(true)} onPart={onPush} />
        </CardContext.Provider>
      </div>
    </>
  );
}

/** The Dota-style tooltip: the header with art, name and gold, this game's band, the bonuses, spells and parts. */
export function ItemCard({
  card,
  items,
  titleId,
  back,
  onBack,
  onClose,
  onPart,
}: {
  card: ItemCardContent;
  items?: Record<string, ItemInfo>;
  titleId?: string;
  back?: string;
  onBack?: () => void;
  onClose?: () => void;
  onPart?: (card: ItemCardContent) => void;
}) {
  const found = findItem(items, card);
  const info = found?.info;
  const name = info?.name ?? card.name ?? "Item";
  const img = info?.img ?? card.img;
  const body = info && (info.stats?.length || info.abilities?.length);
  const parts = items && found && recipeOf(found.id, items) ? <ItemParts itemId={found.id} items={items} onPick={onPart && ((p) => onPart({ itemId: p.itemId, name: p.name, img: p.img }))} /> : null;
  return (
    <>
      <div className="flex items-center gap-4 border-b border-line-strong bg-linear-to-b from-hover to-raised px-5 py-4">
        {img ? (
          <Image src={ITEM_CDN + img} alt="" width={88} height={64} className="block h-16 w-[5.5rem] shrink-0 rounded-md object-cover shadow-[0_0_0_1px_var(--line-hover)]" />
        ) : (
          <span aria-hidden className="block h-16 w-[5.5rem] shrink-0 rounded-md bg-raised" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h4 id={titleId} className="text-xl font-semibold tracking-[-0.01em] text-fg">
            {name}
          </h4>
          {info?.cost ? (
            <span className="num flex items-center gap-2 text-base font-semibold text-accent-bright">
              <Coin />
              {info.cost.toLocaleString("en-US")}
              <span className="sr-only"> gold</span>
            </span>
          ) : null}
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
      {card.band && <div className="flex flex-col gap-2.5 border-b border-line bg-bg px-5 py-3">{card.band}</div>}
      {body && (
        <div className="flex flex-col gap-4 px-5 pt-4 [&:last-child]:pb-5">
          <ItemStatLines item={info} />
          <ItemSpells item={info} />
        </div>
      )}
      {parts && <div className={`px-5 pb-5 ${body ? "mt-4 border-t border-line pt-4" : "pt-4"}`}>{parts}</div>}
      {!body && !parts && !card.band && <p className="px-5 py-4 text-sm text-muted">No shop details for this item yet.</p>}
      {card.footer && <div className={`px-5 pb-5 ${parts ? "" : body ? "mt-4" : "pt-4"}`}>{card.footer}</div>}
    </>
  );
}

export interface BandFact {
  value: string;
  label: string;
  tone?: string;
}

/** The card's game band: the numbers ("18 min Usual", "22 min Late After"), a chip for the heroes, and why. */
export function ItemBand({
  facts = [],
  chip,
  why,
}: {
  facts?: BandFact[];
  chip?: { text: string; enemy: boolean; faces: { name: string; portrait?: string }[] };
  why?: string;
}) {
  return (
    <>
      {(facts.length > 0 || chip) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {facts.length > 0 && (
            <dl className="contents">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline gap-1.5">
                  <dt className="order-last text-[0.8125rem] text-subtle">{f.label}</dt>
                  <dd className={`num text-[0.9375rem] font-semibold ${f.tone ?? "text-fg"}`}>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {chip && (
            <span className="flex items-center gap-2">
              <span className={`chip h-6 gap-1.5 px-2 text-[0.8125rem] font-medium shadow-none ${chip.enemy ? "bg-dire-tint text-dire" : "bg-radiant-tint text-radiant"}`}>
                {chip.text}
              </span>
              {chip.faces.map((f) => (f.portrait ? <HeroFace key={f.name} portrait={f.portrait} name={f.name} size={24} isEnemy={chip.enemy} isDecorative /> : null))}
            </span>
          )}
        </div>
      )}
      {why && <p className="text-sm leading-relaxed text-muted">{why}</p>}
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
