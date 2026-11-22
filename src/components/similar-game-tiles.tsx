"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { finishedBuys, type SimilarGame, type SimilarSeat } from "@/lib/engine/similar-games";
import type { ItemInfo } from "@/lib/engine/types";
import { HeroFace } from "./hero-frame";
import { Icon } from "./icon";
import { ItemButton } from "./item-card";
import { GamePopup } from "./similar-game-popup";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
/** Finished items a tile shows, in buy order. */
export const TILE_ITEMS = 5;

export interface ClosestGamesProps {
  games: SimilarGame[];
  /** Our hero: left out of his own team's row. */
  hero: number;
  /** This draft's heroes: theirs and ours light up in each game's rows, the others are dimmed. */
  enemies: number[];
  allies: number[];
  heroName: (id: number) => string;
  icons: Record<number, string>;
  items?: Record<string, ItemInfo>;
}

/** The closest games to this draft, two wins and a loss, each a tile: result, length, K/D/A, both teams, items. */
export function ClosestGames({ games, hero, enemies, allies, heroName, icons, items }: ClosestGamesProps) {
  if (games.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="section-title">Closest Games</h3>
        <p className="text-[0.8125rem] text-subtle">The two closest wins and the closest loss</p>
      </div>
      <ul className={`grid gap-3 ${games.length === 3 ? "lg:grid-cols-3" : games.length === 2 ? "md:grid-cols-2" : "max-w-md"}`}>
        {games.map((g) => (
          <li key={g.match}>
            <GameTile game={g} hero={hero} enemies={enemies} allies={allies} heroName={heroName} icons={icons} items={items} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GameTile({ game: g, hero, enemies, allies, heroName, icons, items }: Omit<ClosestGamesProps, "games"> & { game: SimilarGame }) {
  const bought = items ? finishedBuys(g, items).slice(0, TILE_ITEMS) : [];
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <article
      aria-label={`${g.won ? "Won" : "Lost"}, ${minutes(g.duration)} min, ${g.kills} kills, ${g.deaths} deaths, ${g.assists} assists`}
      className="flex h-full flex-col gap-4 rounded-xl border border-line-strong bg-bg p-4"
    >
      <span className="flex items-center gap-3">
        <span
          className={`chip h-6 px-2 text-[0.8125rem] font-medium shadow-none ${g.won ? "bg-radiant-tint text-radiant" : "bg-dire-tint text-dire"}`}
        >
          {g.won ? "Won" : "Lost"}
        </span>
        <span className="num text-[0.9375rem] text-fg">{minutes(g.duration)} Min</span>
        <span className="ml-auto text-[0.8125rem] text-muted">{g.sharedEnemies} of 5 Enemies</span>
      </span>
      <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-fg">
        {g.kills}
        <span className="text-subtle"> / </span>
        <span className="text-dire">{g.deaths}</span>
        <span className="text-subtle"> / </span>
        {g.assists}
      </p>
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2">
        <span className="text-[0.8125rem] text-muted">Enemy</span>
        <Faces seats={g.enemies} lit={enemies} isEnemy heroName={heroName} icons={icons} />
        <span className="text-[0.8125rem] text-muted">With</span>
        <Faces seats={g.allies.filter((s) => s.hero !== hero)} lit={allies} heroName={heroName} icons={icons} />
      </div>
      {bought.length > 0 && (
        <span className="flex flex-wrap gap-3 border-t border-line pt-4 lg:grid lg:grid-cols-5 lg:gap-2">
          {bought.map(([id, at]) => {
            const info = items?.[String(id)];
            if (!info) return null;
            return (
              <span key={id} className="flex min-w-0 flex-col items-center gap-1">
                <ItemButton card={{ itemId: id, name: info.name }} className="flex w-full justify-center">
                  <Image
                    src={ITEM_CDN + info.img}
                    alt=""
                    width={40}
                    height={29}
                    className="aspect-[11/8] h-8 w-11 rounded-md object-cover lg:h-auto lg:w-full lg:max-w-11"
                  />
                </ItemButton>
                <span className="num text-xs text-muted">{minutes(at)}</span>
              </span>
            );
          })}
        </span>
      )}
      <button ref={button} type="button" className="btn btn-sm btn-ghost mt-auto self-start" onClick={() => setOpen(true)}>
        Open Game
        <Icon name="chevronRight" />
      </button>
      {open && (
        <GamePopup
          game={g}
          hero={hero}
          enemies={enemies}
          allies={allies}
          heroName={heroName}
          icons={icons}
          items={items}
          onClose={() => {
            setOpen(false);
            button.current?.focus();
          }}
        />
      )}
    </article>
  );
}

/** A team's faces: heroes of this draft in full, the others greyed. */
export function Faces({
  seats,
  lit,
  isEnemy = false,
  heroName,
  icons,
  size = 28,
}: {
  seats: SimilarSeat[];
  lit: number[];
  isEnemy?: boolean;
  heroName: (id: number) => string;
  icons: Record<number, string>;
  size?: number;
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {seats.map((s) =>
        icons[s.hero] ? (
          <HeroFace
            key={s.hero}
            portrait={icons[s.hero]!}
            name={heroName(s.hero)}
            size={size}
            isEnemy={isEnemy}
            isDim={!lit.includes(s.hero)}
          />
        ) : null,
      )}
    </span>
  );
}

/** Whole minutes from seconds, a buy before the horn as 0. */
export const minutes = (seconds: number) => Math.max(0, Math.round(seconds / 60));
