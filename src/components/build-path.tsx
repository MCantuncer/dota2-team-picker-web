"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import type { BuildItem, ItemBuild } from "@/lib/engine/item-build";
import { HeroFace } from "./hero-frame";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id, cropped to faces here. */
  icons: Record<number, string>;
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
 * this draft carry the enemy's face. A tile opens its detail right under itself: the numbers as stat blocks and at
 * most two sentences on why. The draft's first answer item is open to start, else the first core item.
 */
export function BuildPath({ build, heroName, icons, note }: Art & { build: ItemBuild; note?: string }) {
  const rough = build.timings === "around";
  const path = pathItems(build);
  const stops: Stop[] = [
    ...build.start.map((item) => ({ key: `start-${item.itemId}`, where: "start" as const, item })),
    ...usualLane(build).map((item) => ({ key: `lane-${item.itemId}`, where: "lane" as const, item })),
    ...path.map((item) => ({ key: `path-${item.itemId}`, where: "path" as const, item })),
  ];
  const [picked, setPicked] = useState<string>();
  const open =
    stops.find((s) => s.key === picked) ?? stops.find((s) => s.where === "path" && s.item.reason) ?? stops.find((s) => s.where === "path") ?? stops[0];
  // The other boots go once, under the core boots (the first core item bought in the lane phase).
  const boots = build.core.find((i) => i.phase === "lane");
  const detail = open && <Detail stop={open} rough={rough} heroName={heroName} icons={icons} />;
  const tile = (stop: Stop) => ({
    pressed: open?.key === stop.key,
    onClick: () => setPicked(stop.key),
    label: tileLabel(stop.item, heroName),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h3 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">Build Path</h3>
        <span className="text-sm text-muted">{rough ? "Rough minutes from all games" : note}</span>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-5">
        <Kit title="Start" label="Start items" stops={stops.filter((s) => s.where === "start")} tile={tile} heroName={heroName} icons={icons} />
        <Kit title="Lane" label="Lane items, in buy order" stops={stops.filter((s) => s.where === "lane")} tile={tile} heroName={heroName} icons={icons} />
      </div>
      {open && open.where !== "path" && detail}

      {path.length > 0 && (
        <div role="region" aria-label="Core items" tabIndex={0} className="-mx-2 overflow-x-auto px-2 pb-1 pt-2 focus-visible:outline-2 focus-visible:outline-accent">
          <ol
            aria-label="Core items, in buy order"
            style={{ "--n": path.length } as CSSProperties}
            className="relative flex flex-col gap-3.5 before:absolute before:inset-y-4 before:left-8 before:w-0.5 before:rounded-xs before:bg-line-hover sm:grid sm:min-w-[calc(var(--n)*6.75rem)] sm:grid-cols-[repeat(var(--n),minmax(6.75rem,1fr))] sm:gap-0 sm:before:hidden"
          >
            {path.flatMap((item) => {
              const stop = stops.find((s) => s.where === "path" && s.item === item)!; // Every path item is a stop.
              const { pressed, onClick, label } = tile(stop);
              const step = (
                <li
                  key={stop.key}
                  className="relative grid grid-cols-[4rem_2.5rem_minmax(0,1fr)] items-center gap-x-3.5 sm:row-start-1 sm:flex sm:flex-col sm:items-center sm:gap-1.5 sm:px-1 sm:text-center sm:after:absolute sm:after:inset-x-0 sm:after:bottom-[0.3125rem] sm:after:h-0.5 sm:after:bg-line-hover"
                >
                  <span className="num col-start-2 row-span-2 row-start-1 text-xl font-semibold leading-none tracking-[-0.02em] text-fg sm:order-1 sm:text-[1.375rem]">
                    {rough ? "~" : ""}
                    {item.minute}
                  </span>
                  <ItemTile item={item} pressed={pressed} onClick={onClick} label={label} heroName={heroName} icons={icons} className="col-start-1 row-span-2 row-start-1 sm:order-2" />
                  <span className="col-start-3 row-start-1 self-end text-[0.8125rem] font-medium leading-tight text-fg sm:order-3 sm:min-h-[2.125rem] sm:self-auto">{item.name}</span>
                  <span className="col-start-3 row-start-2 flex flex-col self-start text-xs leading-tight sm:order-4 sm:min-h-[1.125rem] sm:items-center sm:self-auto">
                    {!rough && item.lateMinute !== undefined && <span className="text-warn">Late After {item.lateMinute}</span>}
                    {item === boots && build.bootsOr && (
                      <span className="text-subtle">
                        Or {build.bootsOr.name} at <span className="num">{build.bootsOr.minute}</span>
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="relative z-10 order-5 mt-2 hidden size-3 rounded-full bg-fg shadow-[0_0_0_3px_var(--bg),0_0_0_4.5px_var(--line-control)] sm:block" />
                </li>
              );
              // The detail opens right under its item: under the line on wide screens, under the row on phones.
              return pressed
                ? [
                    step,
                    <li key="detail" role="none" className="relative sm:sticky sm:left-0 sm:col-span-full sm:row-start-2 sm:mt-6 sm:max-w-3xl">
                      {detail}
                    </li>,
                  ]
                : [step];
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
                  <ItemArt item={item} className="h-8 w-11" />
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

function Kit({ title, label, stops, tile, heroName, icons }: Art & { title: string; label: string; stops: Stop[]; tile: (s: Stop) => { pressed: boolean; onClick: () => void; label: string } }) {
  if (!stops.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-medium text-fg">{title}</span>
      <ul aria-label={label} className="flex flex-wrap gap-2.5">
        {stops.map((stop) => (
          <li key={stop.key} className="flex w-16 flex-col items-center gap-1 text-center">
            <ItemTile item={stop.item} {...tile(stop)} heroName={heroName} icons={icons} />
            <span className="text-xs leading-tight text-subtle">{stop.item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** An item as a pressable tile: its art, a copy count, and the face of the enemy it is bought for. */
function ItemTile({
  item,
  pressed,
  onClick,
  label,
  heroName,
  icons,
  className = "",
}: Art & { item: BuildItem; pressed: boolean; onClick: () => void; label: string; className?: string }) {
  const foe = item.against?.[0];
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`relative cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      <ItemArt item={item} className={`h-[2.9375rem] w-16 ${pressed ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--line-strong)]"}`} />
      {item.count && (
        <span className="num absolute -right-1 bottom-0.5 rounded-xs bg-bg px-1 text-[0.6875rem] font-semibold leading-4 text-fg shadow-[0_0_0_1px_var(--line-hover)]">x{item.count}</span>
      )}
      {foe !== undefined && icons[foe] && (
        <span className="absolute -left-1.5 -top-1.5 rounded-[0.3125rem] shadow-[0_0_0_2px_var(--bg)]">
          <HeroFace portrait={icons[foe]} name={heroName(foe)} size={20} isEnemy isDecorative />
        </span>
      )}
    </button>
  );
}

function ItemArt({ item, className }: { item: BuildItem; className: string }) {
  return <Image src={ITEM_CDN + item.img} alt="" width={64} height={47} className={`block rounded-md object-cover ${className}`} />;
}

/** The open item: art, name, the enemies it is for, its numbers as stat blocks, and why it is in this game. */
function Detail({ stop, rough, heroName, icons }: Art & { stop: Stop; rough: boolean }) {
  const { item } = stop;
  const foes = foesOf(item);
  const why = [item.reason, item.effect].filter((s): s is string => Boolean(s)).map(sentence).join(" ");
  const facts = [
    ...(stop.where === "path" ? [{ value: `${rough ? "~" : ""}${item.minute} min`, label: rough ? "Rough Minute" : "Usual", tone: "text-fg" }] : []),
    ...(stop.where === "path" && !rough && item.lateMinute !== undefined ? [{ value: `${item.lateMinute} min`, label: "Late After", tone: "text-warn" }] : []),
    ...(item.count ? [{ value: `x${item.count}`, label: "Copies", tone: "text-fg" }] : []),
  ];
  return (
    <div aria-live="polite" className="grid gap-5 rounded-lg bg-surface p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
      <ItemArt item={item} className="h-16 w-[5.5rem] shadow-[inset_0_0_0_1px_var(--line-strong)]" />
      <div className="flex min-w-0 flex-col gap-3.5">
        <h4 className="flex flex-wrap items-center gap-2.5 text-[1.0625rem] font-semibold text-fg">
          {item.name}
          {foes.length > 0 && (
            <span className="chip h-6 gap-1.5 bg-dire-tint px-2 text-[0.8125rem] font-medium text-dire shadow-none">
              {item.against?.length ? "For" : "Works on"} {foes.map(heroName).join(" and ")}
            </span>
          )}
          {foes.map((id) => (icons[id] ? <HeroFace key={id} portrait={icons[id]} name={heroName(id)} size={24} isEnemy isDecorative /> : null))}
        </h4>
        {facts.length > 0 && (
          <dl className="flex flex-wrap gap-7">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col-reverse gap-0.5">
                <dt className="text-xs text-subtle">{f.label}</dt>
                <dd className={`num text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] ${f.tone}`}>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {why && <p className="max-w-[70ch] text-sm text-muted">{why}</p>}
      </div>
    </div>
  );
}
