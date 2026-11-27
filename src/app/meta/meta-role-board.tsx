"use client";

import Image from "next/image";
import { HeroPortrait } from "@/components/hero-frame";
import { ItemButton } from "@/components/item-card";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/draft";
import { change, signed, type RoleHero } from "@/lib/meta";
import type { MetaHero } from "./meta-board";
import type { ItemArt } from "./meta-hero-extras";

/** Bars of the role items run to this share, in percent. */
const ITEM_BAR_TOP = 50;

/** From xl the second to fourth hero of a role are small rows, so their frames take the cut of a 36px frame. */
const ROW_CUT = "xl:[--cut:7px]! xl:[--cut-radius:6px]!";

/** The items that end most of a role's games, each with its share as a bar, new items marked. */
export function RoleItems({ items, art }: { items: { id: number; share: number; isNew: boolean }[]; art: ItemArt }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((i) => {
        const it = art[i.id];
        return (
          <li key={i.id} className="relative grid">
            <ItemButton card={{ itemId: i.id, name: it?.name, img: it?.image }} label={`${it?.name ?? "Item"}, ${Math.round(i.share)}% of games`} className="grid w-full rounded-lg">
              <span className="grid grid-cols-[3.25rem_minmax(0,1fr)] grid-rows-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-lg bg-surface p-3 text-left ring-1 ring-inset ring-line-strong">
                {it ? (
                  <Image src={it.image} alt="" width={88} height={64} className="row-span-2 aspect-[50/36] w-full rounded-md object-cover" />
                ) : (
                  <span className="row-span-2 block aspect-[50/36] w-full rounded-md bg-raised" />
                )}
                <span className="self-end text-sm font-medium leading-tight text-fg">{it?.name ?? "Item"}</span>
                <span className="grid grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-2 self-start text-right text-sm tabular-nums text-muted">
                  <span className="relative h-1.5 rounded-[3px] bg-line-strong">
                    <span className="absolute inset-y-0 left-0 rounded-[3px] bg-accent" style={{ width: `${Math.min(100, (i.share / ITEM_BAR_TOP) * 100)}%` }} />
                  </span>
                  {Math.round(i.share)}%
                </span>
              </span>
            </ItemButton>
            {i.isNew && <span className="pointer-events-none absolute -top-2 right-2.5 rounded-[4px] bg-accent px-1.5 text-xs font-semibold leading-[1.0625rem] text-on-accent">New</span>}
          </li>
        );
      })}
    </ul>
  );
}

function RateLine({ h }: { h: RoleHero }) {
  const d = change(h.rate, "win");
  return (
    <span className="flex items-baseline gap-2 text-sm tabular-nums">
      <b className="font-semibold text-fg">{h.rate.win.toFixed(1)}%</b>
      <span className={d === null ? "text-subtle" : d >= 0 ? "text-radiant" : "text-dire"}>{d === null ? "New" : signed(d)}</span>
    </span>
  );
}

/**
 * The top four of each role in five columns: the leader big, the next three as rows. Below the widest screens
 * each role is a row of four tiles, two by two on a phone.
 */
export function MetaGlance({
  roles,
  heroes,
  onRole,
  onSelect,
}: {
  /** Per role 1 to 5, its leaders, best first. */
  roles: RoleHero[][];
  heroes: Map<number, MetaHero>;
  onRole: (role: number) => void;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-5">
      {roles.map((leaders, r) => (
        <section key={r} className="grid min-w-0 content-start gap-3 rounded-xl border border-line bg-surface p-3.5">
          <h3>
            <button
              type="button"
              onClick={() => onRole(r + 1)}
              aria-label={`Open ${POSITION_NAMES[r]} Leaders`}
              className="flex items-center gap-2 rounded-md font-semibold text-accent-bright hover:text-fg"
            >
              <PositionIcon position={r + 1} size={22} />
              {POSITION_NAMES[r]}
            </button>
          </h3>
          {leaders.length === 0 ? (
            <p className="text-sm text-subtle">Too few games at this rank yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-1">
              {leaders.slice(0, 4).map((h, i) => {
                const hero = heroes.get(h.rate.id);
                if (!hero) return null;
                const row = i > 0;
                return (
                  <li key={h.rate.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(h.rate.id)}
                      aria-label={`${hero.name}, ${h.rate.win.toFixed(1)}% win rate. Open ${hero.name}`}
                      className={`grid w-full gap-1.5 rounded-lg text-left hover:brightness-125 ${row ? "xl:grid-cols-[4rem_minmax(0,1fr)] xl:items-center xl:gap-x-2.5" : ""}`}
                    >
                      <HeroPortrait portrait={hero.image} size={100} className={row ? ROW_CUT : ""} />
                      <span className="grid gap-0.5">
                        <span className={`text-base leading-tight text-fg ${row ? "" : "xl:font-semibold"}`}>{hero.name}</span>
                        <RateLine h={h} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
