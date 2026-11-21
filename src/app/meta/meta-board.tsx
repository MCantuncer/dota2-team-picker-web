"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { RankMedal } from "@/components/rank-medal";
import { POSITION_NAMES } from "@/lib/draft";
import { heroRates, movers, previousPatch, RANK_GROUPS, roleItems, roleLeaders, sliceGames, type Measure, type MetaFile, type RankSlice } from "@/lib/meta";
import { HeroCard } from "./meta-hero-card";
import { NewItems, type ItemArt } from "./meta-hero-extras";
import { HeroList } from "./meta-list";
import { MapBoards, PickWinMap } from "./meta-map";
import { MoverRows, moverScale } from "./meta-movers";
import { MetaGlance, RoleItems } from "./meta-role-board";
import { RoleLeaders, RoleTabs, SectionHead } from "./meta-role-leaders";

/** What the Meta page needs of a hero. */
export interface MetaHero {
  id: number;
  name: string;
  image: string;
  icon: string;
}

/** "What Carries Build" and so on. */
const ROLE_BUILDERS = ["Carries", "Mids", "Offlaners", "Soft Supports", "Hard Supports"];

/** Movers shown per side. */
const MOVERS = 6;

export function Panel({ title, note, actions, small, children }: { title: string; note?: string; actions?: ReactNode; small?: boolean; children: ReactNode }) {
  const Heading = small ? "h3" : "h2";
  return (
    <section className="grid min-w-0 content-start gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="grid gap-1">
          <Heading className={small ? "text-lg font-semibold text-fg" : "section-title"}>{title}</Heading>
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
  // The role's leaders are read from every hero at this rank, since a hero's main role can be under ROLE_SHARE elsewhere.
  const all = useMemo(() => heroRates(meta, slice).filter((r) => byId.has(r.id)), [meta, slice, byId]);
  const lead = useMemo(() => (role ? roleLeaders(meta, all, role) : null), [meta, all, role]);
  // A role's winners and losers are its leaders' pool, so a hero played there now and then does not show.
  const moved = movers(lead ? lead.pool.map((h) => h.rate) : rates, measure, MOVERS);
  const highs = useMemo(() => new Map(heroRates(meta, 4).map((r) => [r.id, r])), [meta]);
  const glance = useMemo(() => (role ? null : [1, 2, 3, 4, 5].map((p) => roleLeaders(meta, all, p).leaders)), [meta, all, role]);
  const items = useMemo(
    () => (lead && meta.extras ? roleItems(meta.extras, lead.pool.map((h) => h.rate.id), role) : null),
    [meta, lead, role],
  );
  const scale = moverScale([...moved.up, ...moved.down], measure);
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
      <div className="grid gap-3.5">
        <RoleTabs role={role} onChange={setRole} />
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
        </div>
      </div>

      {lead && (
        <RoleLeaders
          role={role}
          pool={lead.pool.length}
          leaders={lead.leaders}
          dark={lead.dark}
          highs={highs}
          days={meta.days}
          oldPatch={oldPatch}
          extras={meta.extras}
          art={art}
          heroes={byId}
          onSelect={select}
        />
      )}

      {glance && (
        <section className="grid gap-[18px]">
          <SectionHead title="The Meta at a Glance" note="The top four of each role, ranked by wins above even. Pick a role for its leaders, builds and counters." />
          <MetaGlance roles={glance} heroes={byId} onRole={setRole} onSelect={select} />
        </section>
      )}

      <section className="grid gap-[18px]">
        <SectionHead
          title="Winners and Losers"
          note={`${role ? `${POSITION_NAMES[role - 1]}, ${measure === "win" ? "win" : "pick"}` : `Every role, ${measure === "win" ? "win" : "pick"}`} rate change from the last week of ${oldPatch} to ${meta.patch.name} so far, in points.`}
        >
          {measureSwitch}
        </SectionHead>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Rising" small>
            <MoverRows rows={moved.up} measure={measure} rising heroes={byId} max={scale} onSelect={select} />
          </Panel>
          <Panel title="Falling" small>
            <MoverRows rows={moved.down} measure={measure} rising={false} heroes={byId} max={scale} onSelect={select} />
          </Panel>
        </div>
      </section>

      {role > 0 && items && items.items.length > 0 && (
        <section className="grid gap-[18px]">
          <SectionHead
            title={`What ${ROLE_BUILDERS[role - 1]} Build`}
            note={`Share of ${items.games.toLocaleString("en-US")} ${POSITION_NAMES[role - 1]} games of ${meta.patch.name} that ended with each item. Bars run to 50%.`}
          />
          <RoleItems items={items.items} art={art} />
        </section>
      )}

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
