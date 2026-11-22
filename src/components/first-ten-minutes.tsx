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

/** Tile columns by how many tiles there are, so a row never ends with one tile alone. */
const TILE_COLUMNS: Record<number, string> = { 4: "sm:grid-cols-2 xl:grid-cols-4", 3: "md:grid-cols-3", 2: "sm:grid-cols-2", 1: "" };

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id. */
  icons: Record<number, string>;
}

type Item = Pick<BuildItem, "itemId" | "name" | "img" | "minute" | "count" | "phase" | "draft">;

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

      <AtTheHorn player={player} abilities={abilities} enemyItems={enemyItems} heroName={heroName} />

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

/** At the Horn: what to start with, the first skills, what to buy in lane, and what the enemy laner buys. */
function AtTheHorn({ player, abilities, enemyItems, heroName }: { player: PlayerPlan; abilities?: HeroAbilities; enemyItems?: EnemyLaneItems; heroName: (id: number) => string }) {
  const build = player.build;
  const levels = firstLevels(player, abilities, LANE_LEVELS);
  const changed = build ? [...build.start, ...build.lane].filter((i) => i.draft) : [];
  const startDraft = build?.start.filter((i) => i.draft) ?? [];
  const reason = startDraft.find((i) => i.reason)?.reason;
  const firstCore = build?.core[0];
  const agreement = player.skills?.agreement;
  const tiles = [
    build?.start.length ? (
      <Tile key="start" title="Start With">
        <Items label="Start With" items={build.start} />
        {startDraft.length > 0 && reason && <p className="text-[0.8125rem] text-muted">{sentence(reason)}</p>}
      </Tile>
    ) : null,
    levels.length ? (
      <Tile key="skills" title="First Skills">
        <ol aria-label="First skill levels" className="grid max-w-72 grid-cols-7 gap-1">
          {levels.map((l) => {
            const ult = l.art !== "talent" && abilities?.abilities.find((a) => a.key === l.art)?.ultimate;
            return (
              <li key={l.level} className="flex flex-col items-center gap-1" title={`Level ${l.level}: ${l.name}`}>
                {l.art === "talent" ? (
                  <span className="flex aspect-square w-full max-w-[2.125rem] items-center justify-center rounded-md bg-bg">
                    <Image src={TALENT_ICON} alt={l.name} width={18} height={19} unoptimized className="size-[1.125rem]" />
                  </span>
                ) : (
                  <Image
                    src={`${ABILITY_CDN}${l.art}.png`}
                    alt={l.name}
                    width={34}
                    height={34}
                    className={`aspect-square w-full max-w-[2.125rem] rounded-md ${ult ? "shadow-[0_0_0_2px_var(--accent)]" : ""}`}
                  />
                )}
                <span className="num text-xs text-muted">{l.level}</span>
              </li>
            );
          })}
        </ol>
        {agreement && (
          <p className="text-[0.8125rem] text-muted">
            <b className="num font-semibold text-fg">{agreement.wins.toLocaleString("en-US")}</b> of <span className="num">{agreement.of.toLocaleString("en-US")}</span> high-rank wins
            this patch used this order.
          </p>
        )}
      </Tile>
    ) : null,
    build && (build.lane.length || firstCore) ? (
      <Tile key="lane" title="Buy in Lane">
        <Items label="Buy in Lane" items={build.lane} after={firstCore} />
      </Tile>
    ) : null,
    enemyItems?.items.length ? (
      <Tile key="enemy" title={`${heroName(enemyItems.hero)} Buys`}>
        <EnemyRows items={enemyItems} heroName={heroName} />
      </Tile>
    ) : null,
  ].filter((t) => t !== null);
  if (!tiles.length) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h4 className="text-lg font-semibold tracking-[-0.01em] text-fg">At the Horn</h4>
        {changed.length > 0 && (
          <span className="flex items-center gap-2 text-xs text-muted">
            <i aria-hidden className="inline-block size-2.5 rounded-[0.1875rem] shadow-[0_0_0_2px_var(--accent)]" />
            Changed for this draft
          </span>
        )}
      </div>
      <div className={`grid gap-4 ${TILE_COLUMNS[tiles.length] ?? TILE_COLUMNS[4]}`}>{tiles}</div>
    </div>
  );
}

function Tile({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line-strong bg-raised p-4">
      <h5 className="text-sm font-medium text-muted">{title}</h5>
      {children}
    </div>
  );
}

/**
 * Items in buy order with no minutes (one lane item's average minute alone can make a path no one could pay for, see
 * build-path.ts usualLane), then the first core item faded with its minute: the item the lane leads to.
 */
function Items({ label, items, after, enemy = false }: { label: string; items: Item[]; after?: Item; enemy?: boolean }) {
  return (
    <ul aria-label={label} className="flex flex-wrap items-start gap-1.5">
      {items.map((item, i) => (
        <li key={`${item.itemId}-${i}`}>
          <ItemIcon item={item} enemy={enemy} />
        </li>
      ))}
      {after && (
        <li className="flex flex-col items-center gap-1 opacity-60">
          <ItemIcon item={after} enemy={enemy} />
          <span className="num text-xs text-muted">{after.minute} min</span>
        </li>
      )}
    </ul>
  );
}

/** The enemy laner's items as two rows, the start and then what they buy in lane, so a long list never wraps loose. */
function EnemyRows({ items: { hero, items }, heroName }: { items: EnemyLaneItems; heroName: (id: number) => string }) {
  const rows = [
    { label: "Start", items: items.filter((i) => i.phase === "start") },
    { label: "In Lane", items: items.filter((i) => i.phase !== "start" && rough(i)), after: items.find((i) => !rough(i)) },
  ].filter((r) => r.items.length || r.after);
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-1.5">
          <span className="text-xs text-subtle">{r.label}</span>
          <Items label={`${heroName(hero)} ${r.label}`} items={r.items} after={r.after} enemy />
        </div>
      ))}
    </div>
  );
}

function ItemIcon({ item, enemy }: { item: Item; enemy: boolean }) {
  const label = item.count ? `${item.count} ${item.name}` : item.name;
  return (
    <ItemButton card={{ itemId: item.itemId, name: item.name, img: item.img }} label={label} className="block">
      {(open) => (
        <span
          className={`relative block h-[1.875rem] w-10 overflow-hidden rounded-md bg-bg ${
            open || (item.draft && !enemy) ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--line-strong)]"
          }`}
        >
          <Image src={ITEM_CDN + item.img} alt="" width={40} height={30} className="block size-full object-cover" />
          {item.count && <span className="num absolute bottom-0 right-0.5 text-[0.6875rem] font-semibold text-fg [text-shadow:0_0_3px_#000,0_0_3px_#000]">{item.count}</span>}
        </span>
      )}
    </ItemButton>
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
