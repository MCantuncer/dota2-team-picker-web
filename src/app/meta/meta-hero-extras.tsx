"use client";

import Image from "next/image";
import { useState } from "react";
import { ItemButton } from "@/components/item-card";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/draft";
import { buildGroups, MIN_BUILD_GAMES, type MetaExtras, type Matchup } from "@/lib/meta";
import type { MetaHero } from "./meta-board";

/** An item's name and picture, for every item the extras show (neutral items too). */
export type ItemArt = Record<string, { name: string; image: string }>;

const BUILD_COLS: Record<number, string> = {
  1: "",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
};

function ItemIcon({ id, art, className }: { id: number; art: ItemArt; className: string }) {
  const it = art[id];
  return (
    <ItemButton card={{ itemId: id, name: it?.name, img: it?.image }} label={it?.name} className={`shrink-0 ${className}`}>
      {it ? (
        <Image src={it.image} alt="" width={88} height={64} className="size-full rounded-md object-cover" />
      ) : (
        <span className="block size-full rounded-md bg-raised ring-1 ring-inset ring-line-strong" />
      )}
    </ItemButton>
  );
}

/**
 * The share of the hero's games of this patch that ended with each item, in Core, Common and Situational, with its
 * neutral items under them. Opens on the page's role filter when the hero has a build there, else every role.
 */
export function BuildPanel({ hero, extras, role, art, patch }: { hero: MetaHero; extras: MetaExtras; role: number; art: ItemArt; patch: string }) {
  const builds = extras.builds[hero.id] ?? {};
  const positions = [0, 1, 2, 3, 4, 5].filter((p) => builds[p]);
  const [picked, setPicked] = useState<number | null>(null);
  const position = picked !== null && builds[picked] ? picked : builds[role] ? role : 0;
  const build = builds[position];

  return (
    <div className="grid min-w-0 content-start gap-5 rounded-xl bg-raised p-4 ring-1 ring-inset ring-line-strong sm:p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="grid gap-1">
          <h3 className="font-semibold text-fg">Build in {patch}</h3>
          <p className="text-sm text-subtle">
            {build
              ? `Share of ${build.games.toLocaleString("en-US")} ${hero.name} games${position ? ` as ${POSITION_NAMES[position - 1]}` : ""} that ended with each item`
              : `Counted from this patch's ranked games, ${extras.buildGames.toLocaleString("en-US")} so far`}
          </p>
        </div>
        {positions.length > 1 && (
          <div className="seg h-auto" role="group" aria-label="Build role">
            {positions.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={position === p}
                aria-label={p ? POSITION_NAMES[p - 1] : "All Roles"}
                title={p ? POSITION_NAMES[p - 1] : "All Roles"}
                onClick={() => setPicked(p)}
                className="seg-item min-h-9 gap-2"
              >
                {p ? <PositionIcon position={p} size={20} /> : "All Roles"}
                {p > 0 && <span className="hidden sm:inline">{POSITION_NAMES[p - 1]}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {build ? (
        <BuildRows build={build} art={art} />
      ) : (
        <p className="max-w-2xl text-muted">Builds are being counted. A hero needs {MIN_BUILD_GAMES} games of this patch before its build shows, and more come in four times a day.</p>
      )}
    </div>
  );
}

function BuildRows({ build, art }: { build: NonNullable<MetaExtras["builds"][string][string]>; art: ItemArt }) {
  const groups = buildGroups(build);
  return (
    <div className="grid gap-6">
      <div className={`grid gap-x-8 gap-y-6 ${BUILD_COLS[groups.length] ?? ""}`}>
        {groups.map((g) => (
          <div key={g.name} className="grid content-start gap-3">
            <h4 className="text-sm text-subtle">{g.name}</h4>
            <ul className="grid gap-2.5">
              {g.items.map((it) => (
                <li key={it.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1.5">
                  <ItemIcon id={it.id} art={art} className="h-[2.375rem] w-[3.25rem]" />
                  <span className="grid gap-1.5">
                    <span className="text-base font-semibold leading-tight text-fg">{art[it.id]?.name ?? "Item"}</span>
                    <span className="relative h-1.5 rounded-full bg-line-strong">
                      <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${it.share}%` }} />
                    </span>
                  </span>
                  <span className="num text-right">{Math.round(it.share)}%</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {build.neutral.length > 0 && (
        <div className="grid gap-3 border-t border-line pt-5">
          <h4 className="text-sm text-subtle">Neutral Items</h4>
          <ul className="grid grid-cols-2 gap-3 sm:auto-cols-fr sm:grid-flow-col sm:gap-5">
            {build.neutral.map(([id, games]) => (
              <li key={id} className="flex items-center gap-3">
                <ItemIcon id={id} art={art} className="h-[2.375rem] w-[3.25rem]" />
                <span className="grid">
                  <span className="text-sm leading-tight text-fg max-sm:hidden">{art[id]?.name ?? "Item"}</span>
                  <span className="num text-sm">{Math.round((games / build.games) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MatchupList({ title, rows, heroes, onSelect, up }: { title: string; rows: Matchup[]; heroes: Map<number, MetaHero>; onSelect: (id: number) => void; up: boolean }) {
  return (
    <div className="grid content-start gap-3">
      <h4 className="flex items-center gap-2 text-sm text-subtle">
        <span aria-hidden className={up ? "text-radiant" : "text-dire"}>
          {up ? "▲" : "▼"}
        </span>
        {title}
      </h4>
      <ul className="grid gap-2 sm:grid-cols-5 sm:gap-3">
        {rows.map(([id, rate, games]) => {
          const enemy = heroes.get(id);
          if (!enemy) return null;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-label={`${enemy.name}: wins ${rate.toFixed(1)}% against, ${games.toLocaleString("en-US")} games. Open ${enemy.name}`}
                className="grid w-full grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-1.5 text-left hover:bg-hover sm:grid-cols-1 sm:gap-1.5"
              >
                <Image src={enemy.image} alt="" width={160} height={90} className="aspect-video w-full rounded-md object-cover" />
                <span className="text-sm leading-tight text-fg sm:min-h-[2.5em]">{enemy.name}</span>
                <span className={`num ${up ? "text-radiant" : "text-dire"}`}>{rate.toFixed(1)}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The enemies the hero wins and loses most against this patch; each opens its own card. */
export function MatchupsPanel({ hero, extras, heroes, onSelect }: { hero: MetaHero; extras: MetaExtras; heroes: Map<number, MetaHero>; onSelect: (id: number) => void }) {
  const m = extras.matchups[hero.id];
  if (!m || (m.best.length === 0 && m.worst.length === 0)) return null;
  return (
    <div className="grid min-w-0 content-start gap-5 rounded-xl bg-raised p-4 ring-1 ring-inset ring-line-strong sm:p-5 lg:col-span-2">
      <div className="grid gap-1">
        <h3 className="font-semibold text-fg">Matchups</h3>
        <p className="text-sm text-subtle">{hero.name}&apos;s win rate with each hero on the enemy team, this patch</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
        <MatchupList title="Wins Most Against" rows={m.best} heroes={heroes} onSelect={onSelect} up />
        <MatchupList title="Loses Most Against" rows={m.worst} heroes={heroes} onSelect={onSelect} up={false} />
      </div>
    </div>
  );
}

/** Items new in this patch: how many games ended with each, and the heroes holding it most. */
export function NewItems({ extras, art, heroes, onSelect }: { extras: MetaExtras; art: ItemArt; heroes: Map<number, MetaHero>; onSelect: (id: number) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {extras.newItems.map((n) => {
        const it = art[n.id];
        const cost = extras.items[n.id]?.cost;
        return (
          <li key={n.id} className="grid content-start gap-3 rounded-lg bg-raised p-4 ring-1 ring-inset ring-line-strong">
            <ItemIcon id={n.id} art={art} className="h-[2.9375rem] w-16" />
            <span className="grid gap-1">
              <span className="font-semibold leading-tight text-fg sm:min-h-[2.5em]">{it?.name ?? "Item"}</span>
              {cost ? <span className="num text-sm text-muted">{cost.toLocaleString("en-US")} Gold</span> : <span className="text-sm text-muted">Neutral</span>}
            </span>
            <span className="text-sm text-muted">
              {n.games ? (
                <>
                  Ended <span className="num text-fg">{n.games.toLocaleString("en-US")}</span> {n.games === 1 ? "game" : "games"}
                </>
              ) : (
                "Not seen yet"
              )}
            </span>
            {n.heroes.length > 0 && (
              <span className="grid grid-cols-3 gap-1.5">
                {n.heroes.slice(0, 3).map(([id, games]) => {
                  const h = heroes.get(id);
                  return h ? (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelect(id)}
                      aria-label={`${h.name}, ${games} ${games === 1 ? "game" : "games"}. Open ${h.name}`}
                      title={h.name}
                      className="rounded-md hover:brightness-125"
                    >
                      <Image src={h.icon} alt="" width={44} height={44} className="aspect-square w-full rounded-md" />
                    </button>
                  ) : null;
                })}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
