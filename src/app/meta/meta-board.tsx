"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { PositionIcon } from "@/components/position-icon";
import { RankMedal } from "@/components/rank-medal";
import { POSITION_NAMES } from "@/lib/draft";
import { heroRates, movers, previousPatch, RANK_GROUPS, sliceGames, type Measure, type MetaFile, type RankSlice } from "@/lib/meta";
import { HeroCard } from "./meta-hero-card";
import { NewItems, type ItemArt } from "./meta-hero-extras";
import { HeroList } from "./meta-list";
import { MapBoards, PickWinMap } from "./meta-map";
import { MoverRows } from "./meta-movers";

/** What the Meta page needs of a hero. */
export interface MetaHero {
  id: number;
  name: string;
  image: string;
  icon: string;
}

/** Movers shown per side. */
const MOVERS = 6;

export function Panel({ title, note, actions, children }: { title: string; note?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="grid gap-1">
          <h2 className="section-title">{title}</h2>
          {note && <p className="text-sm text-subtle">{note}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Choice({ pressed, onClick, label, children }: { pressed: boolean; onClick: () => void; label?: string; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} aria-label={label} title={label} onClick={onClick} className="seg-item min-h-9 gap-2">
      {children}
    </button>
  );
}

/** The Meta page's filters and charts. Everything below the header follows the rank and role filters. */
export function MetaBoard({ meta, heroes, art }: { meta: MetaFile; heroes: MetaHero[]; art: ItemArt }) {
  const [slice, setSlice] = useState<RankSlice>(0);
  const [role, setRole] = useState(0);
  const [measure, setMeasure] = useState<Measure>("win");
  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const rates = useMemo(
    () => heroRates(meta, slice).filter((r) => byId.has(r.id) && (!role || r.roles.includes(role))),
    [meta, slice, role, byId],
  );
  const moved = movers(rates, measure, MOVERS);
  // The hero card opens on the best win rate among heroes picked in at least 1% of games, until one is picked.
  const [picked, setPicked] = useState<number | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const fallback = [...rates].filter((r) => r.pick >= 1).sort((a, b) => b.win - a.win)[0] ?? rates[0];
  const rate = rates.find((r) => r.id === picked) ?? fallback;
  const selected = rate?.id ?? null;
  const byRank = useMemo(
    () => RANK_GROUPS.map((g) => (selected === null ? undefined : heroRates(meta, g.slice).find((r) => r.id === selected))),
    [meta, selected],
  );
  const select = (id: number) => {
    setPicked(id);
    // Bring the card into view when it is off screen, as on the map or a long list.
    requestAnimationFrame(() => card.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };
  const oldPatch = previousPatch(meta.patch.name) ?? "Before";
  const games = sliceGames(meta, slice);
  const group = RANK_GROUPS.find((g) => g.slice === slice);
  const mapNote = [
    `${rates.length} heroes`,
    `${games.toLocaleString("en-US")} games`,
    group?.name,
    role ? POSITION_NAMES[role - 1] : undefined,
  ]
    .filter(Boolean)
    .join(", ");
  const measureSwitch = (
    <div className="seg h-auto" role="group" aria-label="Measure">
      <Choice pressed={measure === "win"} onClick={() => setMeasure("win")}>
        Win Rate
      </Choice>
      <Choice pressed={measure === "pick"} onClick={() => setMeasure("pick")}>
        Pick Rate
      </Choice>
    </div>
  );

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-subtle">Rank</span>
          <div className="seg h-auto" role="group" aria-label="Rank">
            <Choice pressed={slice === 0} onClick={() => setSlice(0)}>
              All Ranks
            </Choice>
            {RANK_GROUPS.map((g) => (
              <Choice key={g.slice} pressed={slice === g.slice} onClick={() => setSlice(g.slice)} label={g.name}>
                <RankMedal rankTier={g.medal * 10} size={28} />
                <span className="hidden xl:inline">{g.name}</span>
              </Choice>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-subtle">Role</span>
          <div className="seg h-auto" role="group" aria-label="Role">
            <Choice pressed={role === 0} onClick={() => setRole(0)}>
              All Roles
            </Choice>
            {POSITION_NAMES.map((name, i) => (
              <Choice key={name} pressed={role === i + 1} onClick={() => setRole(i + 1)} label={name}>
                <PositionIcon position={i + 1} size={20} />
                <span className="hidden md:inline">{name}</span>
              </Choice>
            ))}
          </div>
        </div>
      </div>

      <Panel title="Meta Map" note={mapNote}>
        {rates.length === 0 ? (
          <p className="text-muted">Too few games at this rank and role yet.</p>
        ) : (
          <>
            <div className="max-sm:hidden">
              <PickWinMap rates={rates} heroes={byId} selected={selected} onSelect={select} />
            </div>
            <div className="sm:hidden">
              <MapBoards rates={rates} heroes={byId} selected={selected} onSelect={select} />
            </div>
          </>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Rising Since ${oldPatch}`} note={`${oldPatch} last week to ${meta.patch.name} so far`} actions={measureSwitch}>
          <MoverRows rows={moved.up} measure={measure} rising heroes={byId} oldPatch={oldPatch} newPatch={meta.patch.name} />
        </Panel>
        <Panel title={`Falling Since ${oldPatch}`} note={`${oldPatch} last week to ${meta.patch.name} so far`} actions={measureSwitch}>
          <MoverRows rows={moved.down} measure={measure} rising={false} heroes={byId} oldPatch={oldPatch} newPatch={meta.patch.name} />
        </Panel>
      </div>

      {meta.extras && meta.extras.newItems.length > 0 && (
        <Panel
          title={`New Items in ${meta.patch.name}`}
          note={`Games of this patch that ended with each, and the heroes holding it most. Every rank and role, ${meta.extras.buildGames.toLocaleString("en-US")} games so far.`}
        >
          <NewItems extras={meta.extras} art={art} heroes={byId} onSelect={select} />
        </Panel>
      )}

      {rates.length > 0 && (
        <Panel title="Every Hero" note={`${mapNote}. Pick one to see its numbers.`} actions={<ListKey />}>
          <HeroList rates={rates} heroes={byId} selected={selected} onSelect={select} />
        </Panel>
      )}

      {rate && byId.get(rate.id) && (
        <div ref={card} className="scroll-mt-24">
          <HeroCard
            hero={byId.get(rate.id)!}
            rate={rate}
            byRank={byRank}
            days={meta.days}
            slice={slice}
            oldPatch={oldPatch}
            patch={meta.patch.name}
            extras={meta.extras}
            role={role}
            art={art}
            heroes={byId}
            onSelect={select}
          />
        </div>
      )}
    </div>
  );
}

/** What the day line in each row shows. */
function ListKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-subtle" aria-hidden>
      <span className="flex items-center gap-2">
        <svg width={28} height={8}>
          <line x1={0} x2={28} y1={4} y2={4} className="stroke-line-control" strokeDasharray="3 3" strokeWidth={1.5} />
        </svg>
        Win Rate Before
      </span>
      <span className="flex items-center gap-2">
        <svg width={28} height={8}>
          <line x1={0} x2={28} y1={4} y2={4} className="stroke-accent" strokeWidth={2} />
        </svg>
        Win Rate by Day
      </span>
    </div>
  );
}
