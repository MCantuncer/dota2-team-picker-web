"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { EnemyLaneItems, LanePlan, PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem } from "@/lib/engine/item-build";
import type { HeroAbilities } from "@/lib/engine/types";
import { firstLevels } from "./answer-previews";
import { sentence } from "./build-path";
import { HeroFace } from "./hero-frame";
import { Icon } from "./icon";
import { ItemButton } from "./item-card";
import { ENEMY_POSITIONS, LANE_TITLES, PairBar, playerTactics, VERDICT_CHIPS, VERDICT_WORDS, Versus } from "./lane-board";
import { LastHitTarget, LaneTactics } from "./lane-tactics";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";
const TALENT_ICON = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/talents.svg";

/** How many levels First Skills shows: the levels a laner reaches in the first 10 minutes. */
const LANE_LEVELS = 7;

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id. */
  icons: Record<number, string>;
}

type Item = Pick<BuildItem, "itemId" | "name" | "img" | "minute" | "count" | "phase" | "draft" | "reason" | "against">;

/**
 * First 10 Minutes (Can 2026-11-22, option B on the First 10 Minutes mockup): the lane on its own, above the rest of
 * Your Game, because the first ten minutes decide so much. The player against their enemy laner and the real lane
 * results, what to start with, skill and buy in lane, what the enemy buys, how to play the lane, and what to have
 * by minute 10. With two enemy laners, a switch picks which one it is about, the likelier one first.
 */
export function FirstTenMinutes({ lanes, player, heroName, icons, abilities }: Art & { lanes: LanePlan[]; player: PlayerPlan; abilities?: HeroAbilities }) {
  const lane = lanes.find((l) => l.ours.includes(player.heroId));
  const weight = (enemy: number) => lane?.pairs?.find((p) => p.hero === player.heroId && p.enemy === enemy)?.weight ?? 0;
  const enemies = [...(lane?.theirs ?? [])].sort((a, b) => weight(b) - weight(a));
  const [picked, setPicked] = useState<number>();
  if (!lane) return null;
  const enemy = enemies.find((e) => e === picked) ?? enemies[0];
  const pair = lane.pairs?.find((p) => p.hero === player.heroId && p.enemy === enemy);
  const tactics = playerTactics(lane, player.heroId).filter((t) => t.enemy === enemy);
  const target = tactics[0]?.tactics.find((t) => t.rule === "lastHits");
  const positions = ENEMY_POSITIONS[lane.name];
  const positionOf = (id: number) => (positions && lane.theirs.length === positions.length ? positions[lane.theirs.indexOf(id)] : undefined);
  const laneTitle = LANE_TITLES[lane.name] ?? lane.name;
  const enemyItems = lane.enemyItems?.find((e) => e.hero === enemy);
  return (
    <section aria-labelledby="first-ten-title" className="flex flex-col gap-8 rounded-xl border border-line bg-surface p-4 sm:p-7">
      <div className="grid items-center gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
          <h3 id="first-ten-title" className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">
            First 10 Minutes
          </h3>
          <span className="flex items-center gap-2 text-sm text-muted">
            <span className="text-accent">
              <Icon name="clock" />
            </span>
            {laneTitle} against {lane.theirs.length ? lane.theirs.map(heroName).join(" and ") : "no enemy laner"}, 0 to 10 min
          </span>
        </div>
        {enemies.length > 1 && (
          <div role="group" aria-label="Enemy laner" className="grid grid-cols-2 gap-2">
            {enemies.map((id) => {
              const on = id === enemy;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(id)}
                  className={`flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg border py-1 pl-1 pr-3 text-sm transition-colors ${
                    on ? "border-accent-deep bg-accent-tint text-accent-bright" : "border-line-strong bg-raised text-muted hover:bg-hover hover:text-fg"
                  }`}
                >
                  {icons[id] && <HeroFace portrait={icons[id]} name={heroName(id)} size={30} isEnemy isDecorative />}
                  <span className="whitespace-nowrap">{heroName(id)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 items-center gap-x-7 gap-y-5 md:grid-cols-[10.5rem_minmax(0,1fr)_10.5rem]">
        <Versus heroId={player.heroId} position={player.position} side="ours" heroName={heroName} icons={icons} />
        <div className="col-span-full row-start-2 flex min-w-0 flex-col gap-3 md:col-span-1 md:col-start-2 md:row-start-1">
          <span className={`chip h-6 justify-self-start self-start px-2.5 text-[0.8125rem] font-medium shadow-none md:self-center ${VERDICT_CHIPS[lane.verdict]}`}>
            Lane: {VERDICT_WORDS[lane.verdict]}
          </span>
          {pair ? <PairBar pair={pair} heroName={heroName} /> : <p className="text-sm text-muted">{lane.text}</p>}
          {pair && <span className="text-[0.8125rem] text-subtle">{pair.allRanks ? "Lane results from all ranks" : "Lane results at your rank"}</span>}
        </div>
        {enemy !== undefined ? (
          <Versus heroId={enemy} position={positionOf(enemy)} side="theirs" heroName={heroName} icons={icons} />
        ) : (
          <span className="text-right text-sm text-muted">No enemy laner</span>
        )}
      </div>

      <AtTheHorn player={player} abilities={abilities} enemyItems={enemyItems} heroName={heroName} icons={icons} />

      {tactics.length > 0 && <LaneTactics key={enemy} pairs={tactics} heroName={heroName} icons={icons} title="How to Play the Lane" withTarget={false} />}

      <div className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold tracking-[-0.01em] text-fg">By 10 Minutes</h4>
        {target && <LastHitTarget tactic={target} />}
        <OtherLanes lanes={lanes} mine={lane} heroName={heroName} icons={icons} />
      </div>
    </section>
  );
}

/** Start and lane items (boots too), whose minutes are rough on their own; core items have real minutes. */
const rough = (item: Item) => item.phase === "start" || item.phase === "lane";

/** One side of At the Horn: a laner's start items, lane items and first core item. */
interface Loadout {
  hero: number;
  enemy: boolean;
  start: Item[];
  lane: Item[];
  /** The first core item and its minute: ours from the build, the enemy's only when bought by the end of the lane. */
  core?: Item;
}

/**
 * At the Horn (Can 2026-11-22, "looks really bad" on four loose tiles): the player's loadout and the enemy laner's
 * side by side as two cards with the same rows (Start, In Lane, First Core), so each row reads across, then the
 * first skill levels as one band under both.
 */
function AtTheHorn({ player, abilities, enemyItems, heroName, icons }: Art & { player: PlayerPlan; abilities?: HeroAbilities; enemyItems?: EnemyLaneItems }) {
  const build = player.build;
  const levels = firstLevels(player, abilities, LANE_LEVELS);
  const ours: Loadout | null =
    build && (build.start.length || build.lane.length || build.core[0])
      ? { hero: player.heroId, enemy: false, start: build.start, lane: build.lane, core: build.core[0] }
      : null;
  const theirs: Loadout | null = enemyItems?.items.length
    ? {
        hero: enemyItems.hero,
        enemy: true,
        start: enemyItems.items.filter((i) => i.phase === "start"),
        lane: enemyItems.items.filter((i) => i.phase !== "start" && rough(i)),
        core: enemyItems.items.find((i) => !rough(i)),
      }
    : null;
  const cards = [ours, theirs].filter((c): c is Loadout => c !== null);
  if (!cards.length && !levels.length) return null;
  const changed = build ? [...build.start, ...build.lane].filter((i) => i.draft) : [];
  // Two cards share their rows; a fifth row holds the "Changed for this draft" line when ours has one.
  const span = changed.some((i) => i.reason) ? "lg:row-span-5" : "lg:row-span-4";
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-lg font-semibold tracking-[-0.01em] text-fg">At the Horn</h4>
      {cards.length > 0 && (
        <div className={`grid gap-4 ${cards.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {cards.map((c) => (
            <LoadoutCard key={c.enemy ? "enemy" : "ours"} loadout={c} changed={c.enemy ? [] : changed} span={cards.length > 1 ? span : undefined} heroName={heroName} icons={icons} />
          ))}
        </div>
      )}
      {levels.length > 0 && <FirstSkills levels={levels} agreement={player.skills?.agreement} />}
    </div>
  );
}

/**
 * A laner's card: the hero on a team colour bar, then Start, In Lane and First Core. Two cards side by side share their
 * rows (subgrid), so Start sits next to Start however many items wrap. Items this draft changed carry the face of
 * the enemy they are for, and the card's last line says why.
 */
function LoadoutCard({ loadout, changed, span, heroName, icons }: Art & { loadout: Loadout; changed: Item[]; span?: string }) {
  const { hero, enemy, start, lane, core } = loadout;
  const name = heroName(hero);
  const why = changed.map((i) => i.reason).find(Boolean);
  const foe = changed.map((i) => i.against?.[0]).find((id) => id !== undefined);
  return (
    <section
      aria-label={enemy ? `${name} Items` : "Your Items"}
      className={`relative grid min-w-0 content-start gap-5 overflow-hidden rounded-xl border border-line-strong bg-raised p-5 pt-6 ${
        span ? `${span} lg:grid-rows-subgrid` : "lg:grid-cols-[repeat(3,max-content)] lg:gap-x-16"
      }`}
    >
      <i aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${enemy ? "bg-dire" : "bg-radiant"}`} />
      <div className="col-span-full flex min-w-0 items-center gap-3">
        {icons[hero] && <HeroFace portrait={icons[hero]} name={name} size={32} isEnemy={enemy} isDecorative />}
        <b className="text-base font-semibold text-fg">{name}</b>
        {enemy ? (
          <span className="text-[0.8125rem] text-muted">Enemy</span>
        ) : (
          <span className="rounded-full bg-radiant px-1.5 text-xs font-semibold leading-4 text-bg">You</span>
        )}
      </div>
      <Row label="Start" icon="bag">
        <Items label={`${name} Start`} items={start} enemy={enemy} fit={!span} heroName={heroName} icons={icons} />
      </Row>
      <Row label="In Lane" icon="lanes">
        <Items label={`${name} In Lane`} items={lane} enemy={enemy} fit={!span} heroName={heroName} icons={icons} />
      </Row>
      <Row label="First Core" icon="target">
        {core ? (
          <div className="flex items-center gap-3.5">
            <ItemIcon item={core} enemy={enemy} heroName={heroName} icons={icons} />
            <span className={`text-sm ${enemy ? "text-dire" : "text-muted"}`}>
              <b className={`num text-[1.375rem] font-semibold tracking-[-0.02em] ${enemy ? "" : "text-fg"}`}>{core.minute}</b> min
            </span>
          </div>
        ) : (
          <span className="flex h-[2.9375rem] items-center text-sm text-subtle">{enemy ? "None by 10 min" : "No core item yet"}</span>
        )}
      </Row>
      {why && (
        <p className="col-span-full flex items-center gap-2.5 border-t border-line pt-4 text-[0.8125rem] text-muted">
          {foe !== undefined && icons[foe] ? (
            <HeroFace portrait={icons[foe]} name={heroName(foe)} size={20} isEnemy isDecorative />
          ) : (
            <i aria-hidden className="inline-block size-2.5 shrink-0 rounded-[0.1875rem] shadow-[0_0_0_2px_var(--accent)]" />
          )}
          <span>
            <b className="font-medium text-fg">Changed for this draft.</b> {sentence(why)}
          </span>
        </p>
      )}
    </section>
  );
}

/** A row of a card under its own small heading: a copper glyph in a dark tile, then the row's name. */
function Row({ label, icon, children }: { label: string; icon: keyof typeof ROW_GLYPHS; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <RowTitle label={label} icon={icon} />
      {children}
    </div>
  );
}

function RowTitle({ label, icon }: { label: string; icon: keyof typeof ROW_GLYPHS }) {
  return (
    <span className="flex items-center gap-2.5 text-sm font-medium text-fg">
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-bg text-accent shadow-[inset_0_0_0_1px_var(--line-strong)]">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          {ROW_GLYPHS[icon]}
        </svg>
      </span>
      {label}
    </span>
  );
}

/** The row glyphs: the shop bag for the start, the three lanes for the lane, a target for the first core item, level ups for skills. */
const ROW_GLYPHS = {
  bag: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  lanes: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="4" />
      <path d="M6.5 17.5v-11h11" opacity="0.5" />
      <path d="M6.5 17.5h11v-11" opacity="0.5" />
      <path d="m6.5 17.5 11-11" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  levels: (
    <>
      <path d="m17 11-5-5-5 5" />
      <path d="m17 18-5-5-5 5" />
    </>
  ),
};

/**
 * Items in buy order, as big tiles in up to six columns, the way the inventory reads. `fit` (a card alone, its rows
 * as columns) sizes the list to its items on wide screens, so no empty columns push the next row away.
 */
function Items({ label, items, enemy, fit, heroName, icons }: Art & { label: string; items: Item[]; enemy: boolean; fit: boolean }) {
  if (!items.length) return <span className="flex h-[2.9375rem] items-center text-sm text-subtle">None</span>;
  return (
    <ul aria-label={label} className={`grid grid-cols-[repeat(6,minmax(0,4rem))] gap-2 ${fit ? "lg:flex lg:flex-wrap" : ""}`}>
      {items.map((item, i) => (
        <li key={`${item.itemId}-${i}`} className="min-w-0 lg:w-16">
          <ItemIcon item={item} enemy={enemy} heroName={heroName} icons={icons} />
        </li>
      ))}
    </ul>
  );
}

/** An item tile that opens its card: the art, a copy count, and on ours the face of the enemy this draft buys it for. */
function ItemIcon({ item, enemy, heroName, icons }: Art & { item: Item; enemy: boolean }) {
  const foes = enemy ? [] : (item.against ?? []);
  const name = item.count ? `${item.count} ${item.name}` : item.name;
  const label = foes.length ? `${name}, for ${foes.map(heroName).join(" and ")}` : name;
  const foe = foes[0];
  const marked = item.draft && !enemy && (foe === undefined || !icons[foe]);
  return (
    <ItemButton card={{ itemId: item.itemId, name: item.name, img: item.img }} label={label} className="relative block w-full max-w-16">
      {(open) => (
        <>
          <span
            className={`relative block aspect-[64/47] w-16 max-w-full overflow-hidden rounded-md bg-bg ${
              open || marked ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--line-strong)]"
            }`}
          >
            <Image src={ITEM_CDN + item.img} alt="" width={64} height={47} className="block size-full object-cover" />
          </span>
          {item.count && (
            <span className="num absolute -right-1 bottom-0.5 rounded-xs bg-bg px-1 text-[0.6875rem] font-semibold leading-4 text-fg shadow-[0_0_0_1px_var(--line-hover)]">x{item.count}</span>
          )}
          {foe !== undefined && icons[foe] && (
            <span className="absolute -left-1.5 -top-1.5 rounded-[0.3125rem] shadow-[0_0_0_2px_var(--raised)]">
              <HeroFace portrait={icons[foe]} name={heroName(foe)} size={20} isEnemy isDecorative />
            </span>
          )}
        </>
      )}
    </ItemButton>
  );
}

/** The first skill levels as one band: the ability art big with its level, and how many high-rank wins used the order. */
function FirstSkills({ levels, agreement }: { levels: ReturnType<typeof firstLevels>; agreement?: { wins: number; of: number } }) {
  return (
    <div className="grid items-center gap-x-8 gap-y-4 rounded-xl border border-line-strong bg-raised p-5 lg:grid-cols-[auto_auto_minmax(0,1fr)]">
      <h5>
        <RowTitle label="First Skills" icon="levels" />
      </h5>
      <ol aria-label="First skill levels" className="grid grid-cols-[repeat(7,minmax(0,2.75rem))] gap-2.5">
        {levels.map((l) => (
          <li key={l.level} className="flex min-w-0 flex-col items-center gap-1.5" title={`Level ${l.level}: ${l.name}`}>
            {l.art === "talent" ? (
              <span className="flex aspect-square w-full items-center justify-center rounded-md bg-bg">
                <Image src={TALENT_ICON} alt={l.name} width={22} height={23} unoptimized className="size-[1.375rem]" />
              </span>
            ) : (
              <Image
                src={`${ABILITY_CDN}${l.art}.png`}
                alt={l.name}
                width={44}
                height={44}
                className="aspect-square w-full rounded-md"
              />
            )}
            <span className="num text-xs text-muted">{l.level}</span>
          </li>
        ))}
      </ol>
      {agreement && (
        <p className="text-[0.8125rem] text-muted lg:justify-self-end lg:text-right">
          <b className="num text-lg font-semibold text-fg">{agreement.wins.toLocaleString("en-US")}</b> of <span className="num">{agreement.of.toLocaleString("en-US")}</span>{" "}
          high-rank wins this patch used this order
        </p>
      )}
    </div>
  );
}

/** The other two lanes: who meets whom and how each lane goes, so the player knows where help or danger comes from. */
function OtherLanes({ lanes, mine, heroName, icons }: Art & { lanes: LanePlan[]; mine: LanePlan }) {
  const others = lanes.filter((l) => l !== mine);
  if (!others.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <h5 className="text-sm font-medium text-muted">Other Lanes</h5>
      <ul className={`grid gap-3 ${others.length > 1 ? "md:grid-cols-2" : ""}`}>
        {others.map((l) => (
          <li key={l.name} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-bg px-3 py-2.5">
            <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <span className="w-16 text-[0.8125rem] text-muted">{LANE_TITLES[l.name] ?? l.name}</span>
              <span className="flex items-center gap-1 text-xs text-subtle">
                {l.ours.map((id) => (icons[id] ? <HeroFace key={id} portrait={icons[id]} name={heroName(id)} size={26} /> : null))}
                <span className="px-1">vs</span>
                {l.theirs.map((id) => (icons[id] ? <HeroFace key={id} portrait={icons[id]} name={heroName(id)} size={26} isEnemy /> : null))}
              </span>
            </span>
            <span className={`chip h-6 px-2.5 text-xs font-medium shadow-none ${VERDICT_CHIPS[l.verdict]}`}>{VERDICT_WORDS[l.verdict]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
