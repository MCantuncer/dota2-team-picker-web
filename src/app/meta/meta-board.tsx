"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PositionIcon } from "@/components/position-icon";
import { RankMedal } from "@/components/rank-medal";
import { POSITION_NAMES } from "@/lib/draft";
import { heroRates, movers, previousPatch, RANK_GROUPS, sliceGames, type Measure, type MetaFile, type RankSlice } from "@/lib/meta";
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
export function MetaBoard({ meta, heroes }: { meta: MetaFile; heroes: MetaHero[] }) {
  const [slice, setSlice] = useState<RankSlice>(0);
  const [role, setRole] = useState(0);
  const [measure, setMeasure] = useState<Measure>("win");
  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const rates = useMemo(
    () => heroRates(meta, slice).filter((r) => byId.has(r.id) && (!role || r.roles.includes(role))),
    [meta, slice, role, byId],
  );
  const moved = movers(rates, measure, MOVERS);
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
              <PickWinMap rates={rates} heroes={byId} />
            </div>
            <div className="sm:hidden">
              <MapBoards rates={rates} heroes={byId} />
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
    </div>
  );
}
