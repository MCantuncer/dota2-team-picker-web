"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { BuildItem, ItemBuild } from "@/lib/engine/item-build";
import type { ItemFork } from "@/lib/item-forks";
import { HeroFace } from "./hero-frame";
import { ItemBand, ItemButton, type ItemCardContent } from "./item-card";
import { ForkBlock } from "./item-forks";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id, cropped to faces here. */
  icons: Record<number, string>;
}

/** An enemy's key item on the path's line, below it, at its usual minute (from the Story's chapters). */
export interface EnemyItem {
  hero: string;
  heroIcon?: string;
  item: string;
  img?: string;
  minute: number;
  around?: boolean;
}

type Where = "start" | "lane" | "path";
interface Stop {
  key: string;
  where: Where;
  item: BuildItem;
}

/**
 * The lane items players usually buy, in buy order. They carry no minute: STRATZ gives each item's
 * average minute on its own, so side by side they can make a path no one could pay for (Null Talisman,
 * Bracer and Magic Wand all by minute 2 is 1,470 gold). Items this draft asks for are path steps instead.
 */
export function usualLane(build: Pick<ItemBuild, "lane">): BuildItem[] {
  return build.lane.filter((i) => !i.draft);
}

/** The path in buy order: the lane items this draft asks for (an early Magic Wand against spell spammers), then the core. */
export function pathItems(build: Pick<ItemBuild, "lane" | "core">): BuildItem[] {
  return [...build.lane.filter((i) => i.draft), ...build.core].sort((a, b) => a.minute - b.minute);
}

/** The enemies an item is bought for, or works on: the faces on its tile and the chip in its detail. */
function foesOf(item: BuildItem): number[] {
  return item.against?.length ? item.against : (item.effectAgainst ?? []);
}

/** One sentence: trailing spaces and a final period or colon trimmed, then one period, unless it ends in ? or !. */
export function sentence(text: string): string {
  const t = text.trim().replace(/[.:;,]+$/, "");
  return /[?!]$/.test(t) ? t : `${t}.`;
}

/**
 * The Build Path (Can's go on the Your Game mockup, 2026-11-12): the start and lane kits as item tiles, then the
 * core items in buy order on one line, each with its minute big and its late minute under it. Items bought for
 * this draft carry the enemy's face. Every item opens its card right next to itself (item-card.tsx): this game's
 * minutes, the enemies it is for and why on top of what the item gives and how it is built.
 */
export function BuildPath({
  build,
  heroName,
  icons,
  note,
  forks = [],
  enemyItems = [],
}: Art & { build: ItemBuild; note?: string; forks?: ItemFork[]; enemyItems?: EnemyItem[] }) {
  const rough = build.timings === "around";
  const path = pathItems(build);
  // Our items and the enemy's on one line in minute order, ours first on a tie; rough minutes can't be set beside theirs.
  type Column = { ours?: BuildItem; theirs?: EnemyItem; minute: number };
  const columns = [
    ...path.map((ours): Column => ({ ours, minute: ours.minute })),
    ...(rough ? [] : enemyItems.map((theirs): Column => ({ theirs, minute: theirs.minute }))),
  ].sort((a, b) => a.minute - b.minute || Number(Boolean(a.theirs)) - Number(Boolean(b.theirs)));
  const forkOf = (item: BuildItem) => forks.find((f) => f.itemId === item.itemId);
  const stops: Stop[] = [
    ...build.start.map((item) => ({ key: `start-${item.itemId}`, where: "start" as const, item })),
    ...usualLane(build).map((item) => ({ key: `lane-${item.itemId}`, where: "lane" as const, item })),
    ...path.map((item) => ({ key: `path-${item.itemId}`, where: "path" as const, item })),
  ];
  // The other boots go once, under the core boots (the first core item bought in the lane phase).
  const boots = build.core.find((i) => i.phase === "lane");
  const cardOf = (stop: Stop) => stopCard(stop, rough, heroName, icons, stop.where === "path" ? forkOf(stop.item) : undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-fg">Build Path</h3>
        <span className="text-sm text-muted">{rough ? "Rough minutes from all games" : note}</span>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-5">
        <Kit title="Start" label="Start items" stops={stops.filter((s) => s.where === "start")} cardOf={cardOf} heroName={heroName} icons={icons} />
        <Kit title="Lane" label="Lane items, in buy order" stops={stops.filter((s) => s.where === "lane")} cardOf={cardOf} heroName={heroName} icons={icons} />
      </div>

      {/* The row needs 5rem a stop: nine stops fit at 768px. Below that the path runs down the page. */}
      {path.length > 0 && (
        <div role="region" aria-label="Core items" tabIndex={0} className="-mx-2 overflow-x-auto px-2 pb-1 pt-2 focus-visible:outline-2 focus-visible:outline-accent">
          <ol
            aria-label={columns.some((c) => c.theirs) ? "Core items in buy order, with the enemy's key items" : "Core items, in buy order"}
            style={{ "--n": columns.length } as CSSProperties}
            className="relative flex flex-col gap-3.5 before:absolute before:inset-y-4 before:left-8 before:w-0.5 before:rounded-xs before:bg-line-hover md:grid md:min-w-[calc(var(--n)*5rem)] md:grid-cols-[repeat(var(--n),minmax(5rem,1fr))] md:gap-0 md:before:hidden"
          >
            {columns.flatMap((column, index) => {
              const at = { gridColumnStart: index + 1 } as CSSProperties;
              if (!column.ours) {
                const e = column.theirs!; // A column holds ours or theirs.
                return [
                  <li key={`line-${index}`} aria-hidden style={at} className="relative hidden items-end justify-center md:row-start-1 md:flex md:after:absolute md:after:inset-x-0 md:after:bottom-[0.3125rem] md:after:h-0.5 md:after:bg-line-hover">
                    <span className="relative z-10 size-3 rounded-full bg-dire shadow-[0_0_0_3px_var(--bg)]" />
                  </li>,
                  <EnemyStop key={`theirs-${index}`} enemy={e} style={at} />,
                ];
              }
              const item = column.ours;
              const fork = forkOf(item);
              // The fork's late minute is the one its win counts split at, so the path says the same minute.
              const late = fork?.late ?? item.lateMinute;
              const stop = stops.find((s) => s.where === "path" && s.item === item)!; // Every path item is a stop.
              return [
                <li
                  key={stop.key}
                  style={at}
                  className="relative grid grid-cols-[4rem_2.5rem_minmax(0,1fr)] items-center gap-x-3.5 md:row-start-1 md:flex md:flex-col md:items-center md:gap-1.5 md:px-1 md:text-center md:after:absolute md:after:inset-x-0 md:after:bottom-[0.3125rem] md:after:h-0.5 md:after:bg-line-hover"
                >
                  <span className="num col-start-2 row-span-2 row-start-1 text-lg font-semibold leading-none tracking-[-0.02em] text-fg md:order-1">
                    {rough ? "~" : ""}
                    {item.minute}
                  </span>
                  <ItemTile item={item} card={cardOf(stop)} heroName={heroName} icons={icons} className="col-start-1 row-span-2 row-start-1 md:order-2" />
                  <span className="col-start-3 row-start-1 self-end text-sm font-medium leading-tight text-fg md:order-3 md:min-h-9 md:self-auto">{item.name}</span>
                  <span className="col-start-3 row-start-2 flex flex-col self-start text-xs leading-tight md:order-4 md:mb-2 md:min-h-[1.125rem] md:items-center md:self-auto">
                    {!rough && late !== undefined && <span className="text-warn">Late After {late}</span>}
                    {fork && (
                      <span className="text-subtle">
                        <span className="num">
                          {fork.onTime} of {fork.running}
                        </span>{" "}
                        On Time
                      </span>
                    )}
                    {item === boots && build.bootsOr && (
                      <span className="text-subtle">
                        Or {build.bootsOr.name} at <span className="num">{build.bootsOr.minute}</span>
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="relative z-10 order-5 mt-2 hidden size-3 shrink-0 rounded-full md:mt-auto bg-fg shadow-[0_0_0_3px_var(--bg),0_0_0_4.5px_var(--line-control)] md:block" />
                </li>,
              ];
            })}
          </ol>
        </div>
      )}

      {build.situational.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-muted">If Needed</h4>
          <ul className="flex flex-col gap-2">
            {build.situational.map((item) => {
              const instead = build.core.find((c) => c.itemId === item.replaces)?.name;
              const line = [item.reason, instead && `Instead of ${instead}`].filter((s): s is string => Boolean(s)).map(sentence).join(" ");
              return (
                <li key={item.itemId} className="flex items-center gap-3 text-sm">
                  <ItemButton label={item.name} card={{ itemId: item.itemId, name: item.name, img: item.img, band: line ? <ItemBand why={line} /> : undefined }} className="shrink-0">
                    <ItemArt item={item} className="h-8 w-11" />
                  </ItemButton>
                  <span className="text-fg">{item.name}</span>
                  {line && <span className="text-muted">{line}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** "Black King Bar, for Axe and Lion": the tile's name, with the enemies its face marks stand for. */
function tileLabel(item: BuildItem, heroName: (id: number) => string): string {
  const name = item.count ? `${item.count} ${item.name}` : item.name;
  const foes = item.against ?? [];
  return foes.length ? `${name}, for ${foes.map(heroName).join(" and ")}` : name;
}

function Kit({ title, label, stops, cardOf, heroName, icons }: Art & { title: string; label: string; stops: Stop[]; cardOf: (s: Stop) => ItemCardContent }) {
  if (!stops.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-medium text-fg">{title}</span>
      <ul aria-label={label} className="flex flex-wrap gap-2.5">
        {stops.map((stop) => (
          <li key={stop.key} className="flex w-16 flex-col items-center gap-1 text-center">
            <ItemTile item={stop.item} card={cardOf(stop)} heroName={heroName} icons={icons} />
            <span className="text-xs leading-tight text-subtle">{stop.item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** An item as a tile that opens its card: its art, a copy count, and the face of the enemy it is bought for. */
function ItemTile({ item, card, heroName, icons, className = "" }: Art & { item: BuildItem; card: ItemCardContent; className?: string }) {
  const foe = item.against?.[0];
  return (
    <ItemButton label={tileLabel(item, heroName)} card={card} className={className}>
      {(open) => (
        <>
          <ItemArt item={item} className={`h-[2.9375rem] w-16 ${open ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--line-strong)]"}`} />
          {item.count && (
            <span className="num absolute -right-1 bottom-0.5 rounded-md bg-bg px-1 text-xs font-semibold leading-4 text-fg shadow-[0_0_0_1px_var(--line-hover)]">x{item.count}</span>
          )}
          {foe !== undefined && icons[foe] && (
            <span className="absolute -left-1.5 -top-1.5 rounded-md shadow-[0_0_0_2px_var(--bg)]">
              <HeroFace portrait={icons[foe]} name={heroName(foe)} size={20} isEnemy isDecorative />
            </span>
          )}
        </>
      )}
    </ItemButton>
  );
}

function ItemArt({ item, className }: { item: BuildItem; className: string }) {
  return <Image src={ITEM_CDN + item.img} alt="" width={64} height={47} className={`block rounded-md object-cover ${className}`} />;
}

/**
 * A Build Path item's card: on top of the shop tooltip, this game's numbers (usual and late minute, copies), the
 * enemies it is for, why, and the If It Is Late split last.
 */
function stopCard(stop: Stop, rough: boolean, heroName: (id: number) => string, icons: Record<number, string>, fork?: ItemFork): ItemCardContent {
  const { item } = stop;
  const foes = foesOf(item);
  const why = [item.reason, item.effect].filter((s): s is string => Boolean(s)).map(sentence).join(" ");
  const late = fork?.late ?? item.lateMinute;
  const timing = stop.where === "path" ? { minute: item.minute, around: rough, late: rough ? undefined : late } : undefined;
  const facts = item.count ? [{ value: `x${item.count}`, label: "Copies" }] : [];
  const chip = foes.length
    ? { text: `${item.against?.length ? "For" : "Works on"} ${foes.map(heroName).join(" and ")}`, enemy: true, faces: foes.map((id) => ({ name: heroName(id), portrait: icons[id] })) }
    : undefined;
  return {
    itemId: item.itemId,
    name: item.name,
    img: item.img,
    band: timing || facts.length || chip || why ? <ItemBand timing={timing} facts={facts} chip={chip} why={why || undefined} /> : undefined,
    footer: fork ? <ForkBlock fork={fork} /> : undefined,
  };
}

/** An enemy's key item under the line: the item with the hero's face on it, the minute in Dire red and the item. */
function EnemyStop({ enemy, style }: { enemy: EnemyItem; style: CSSProperties }) {
  return (
    <li
      style={style}
      className="relative ml-4 grid grid-cols-[3rem_2.5rem_minmax(0,1fr)] items-center gap-x-3.5 md:row-start-2 md:ml-0 md:flex md:flex-col md:items-center md:gap-1 md:px-1 md:pt-3 md:text-center"
    >
      <ItemButton
        label={`Enemy ${enemy.hero}: ${enemy.item}`}
        card={{
          name: enemy.item,
          img: enemy.img,
          band: (
            <ItemBand
              timing={{ minute: enemy.minute, around: enemy.around, side: "enemy" }}
              chip={{ text: `Enemy ${enemy.hero}`, enemy: true, faces: [{ name: enemy.hero, portrait: enemy.heroIcon }] }}
            />
          ),
        }}
        className="col-start-1 w-fit md:order-1"
      >
        {enemy.img ? (
          <Image src={ITEM_CDN + enemy.img} alt="" width={44} height={32} className="block h-8 w-11 rounded-md object-cover" />
        ) : (
          <span className="block h-8 w-11 rounded-md bg-raised" />
        )}
        {enemy.heroIcon && (
          <span className="absolute -left-2 -top-2 rounded-md shadow-[0_0_0_2px_var(--bg)]">
            <HeroFace portrait={enemy.heroIcon} name={enemy.hero} size={20} isEnemy isDecorative />
          </span>
        )}
      </ItemButton>
      <span className="num col-start-2 text-base font-semibold text-dire md:order-2">
        {enemy.around ? "~" : ""}
        {enemy.minute}
      </span>
      <span className="col-start-3 text-xs leading-tight text-muted md:order-3">
        <span className="sr-only">Enemy </span>
        {enemy.hero}: {enemy.item}
      </span>
    </li>
  );
}
