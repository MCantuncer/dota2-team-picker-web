"use client";

import Image from "next/image";
import type { NeutralOption, NeutralPlanTier, NeutralSource } from "@/lib/engine/neutral-plan";
import type { Position } from "@/lib/engine/types";
import { POSITION_NAMES } from "@/lib/draft";
import { ItemBand, ItemButton, itemSrc } from "./item-card";
import { TIER_COLOR } from "./neutral-kind";

/** Whose games a tier's order is from, in words: "34 Abaddon Hard Support games". */
export function sourceLabel(source: NeutralSource, picks: number, hero: string, position: Position): string {
  const n = picks.toLocaleString("en-US");
  if (source === "hero-position") return `${n} ${hero} ${POSITION_NAMES[position - 1]} crafts`;
  if (source === "hero") return `${n} ${hero} crafts, every role`;
  return `${n} ${POSITION_NAMES[position - 1]} crafts, every hero`;
}

/**
 * The Item Build's Neutral Items (Can 2026-11-25: "add correct possible neutral items"): one card per tier of the
 * patch, with the minute the tier is usually crafted, the artifacts this hero and role chose most when offered, and
 * the enchantments the game offers this hero at that tier. Each item opens its tooltip. A tier without enough games
 * shows every artifact it can offer, unranked.
 */
export function NeutralItems({ tiers, hero, position }: { tiers: NeutralPlanTier[]; hero: string; position: Position }) {
  if (!tiers.length) return null;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-fg">Neutral Items</h3>
        <span className="text-sm text-muted">Most chosen first, when the craft offers it</span>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((t) => (
          <TierCard key={t.tier} tier={t} hero={hero} position={position} />
        ))}
      </ul>
    </div>
  );
}

function TierCard({ tier, hero, position }: { tier: NeutralPlanTier; hero: string; position: Position }) {
  const from = tier.from && sourceLabel(tier.from.source, tier.from.picks, hero, position);
  return (
    <li className="flex flex-col gap-4 rounded-xl bg-surface p-4 ring-1 ring-inset ring-line-strong">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2 text-base font-semibold text-fg">
          <span aria-hidden className="size-2.5 rotate-45 rounded-[2px]" style={{ background: TIER_COLOR[tier.tier] }} />
          <span>
            Tier <span className="num">{tier.tier}</span>
          </span>
        </span>
        <span className="flex flex-col items-end leading-tight">
          <span className="num text-lg font-semibold tracking-[-0.02em] text-fg">{tier.usual ? tier.usual.minute : tier.unlock}</span>
          <span className="text-xs text-subtle">{tier.usual ? "Usual Minute" : "Earliest Minute"}</span>
        </span>
      </div>

      {tier.from ? (
        <ul aria-label={`Tier ${tier.tier} artifacts, most chosen first`} className="flex flex-col gap-2.5">
          {tier.artifacts.map((a) => (
            <li key={a.itemId} className="grid grid-cols-[3.25rem_minmax(0,1fr)_2.75rem] items-center gap-x-3">
              <Art option={a} band={<ItemBand facts={[{ value: `${a.share}%`, label: `of ${from}` }]} />} />
              <span className="grid gap-1.5">
                <span className="text-base font-semibold leading-tight text-fg">{a.name}</span>
                <span className="relative h-1.5 rounded-full bg-line-strong">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${a.share}%` }} />
                </span>
              </span>
              <span className="num text-right">{a.share}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul aria-label={`Tier ${tier.tier} artifacts the game can offer`} className="grid grid-cols-4 gap-2">
          {tier.artifacts.map((a) => (
            <li key={a.itemId}>
              <Art option={a} />
            </li>
          ))}
        </ul>
      )}

      {tier.enchants.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-3.5">
          <span className="text-sm text-subtle">Enchantment</span>
          <ul aria-label={`Tier ${tier.tier} enchantments`} className="flex flex-wrap gap-x-4 gap-y-2.5">
            {tier.enchants.map((e) => (
              <li key={e.itemId} className="flex items-center gap-2">
                <Art option={e} small />
                <span className="flex flex-col leading-tight">
                  <span className="text-sm text-fg">{e.name}</span>
                  {e.share !== undefined && <span className="num text-xs text-subtle">{e.share}%</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-auto text-xs leading-snug text-subtle">{from ? `From ${from}` : "Too few games yet: every artifact the tier can offer"}</p>
    </li>
  );
}

/** A neutral item's picture that opens its card; enchantments open at the tier's level. */
function Art({ option, band, small = false }: { option: NeutralOption; band?: React.ReactNode; small?: boolean }) {
  return (
    <ItemButton card={{ itemId: option.itemId, name: option.name, img: option.img, ...(option.level ? { level: option.level } : {}), ...(band ? { band } : {}) }} label={option.name}>
      {(open) => (
        <Image
          src={itemSrc(option.img)}
          alt=""
          width={52}
          height={38}
          className={`block rounded-md object-cover ${small ? "size-8" : "h-[2.375rem] w-[3.25rem]"} ${open ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--line-strong)]"}`}
        />
      )}
    </ItemButton>
  );
}
