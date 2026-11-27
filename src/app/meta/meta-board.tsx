"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { PageStage } from "@/components/page-stage";
import { RankRow, type RankChoice } from "@/components/rank-row";
import { SponsorBand } from "@/components/sponsor-band";
import { VerdictHead } from "@/components/verdict-head";
import { POSITION_NAMES } from "@/lib/draft";
import { banRates, heroRates, movers, previousPatch, RANK_GROUPS, roleItems, roleLeaders, sliceGames, type Measure, type MetaFile, type RankSlice } from "@/lib/meta";
import { glanceTitle, metaVerdict, moversTitle, newItemsTitle, roleItemsTitle } from "@/lib/meta-verdict";
import { sponsorFor } from "@/lib/sponsors";
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

export function Panel({ title, note, facts, finding, actions, small, children }: { title: string; note?: string; facts?: string; finding?: string | null; actions?: ReactNode; small?: boolean; children: ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <VerdictHead label={title} facts={facts} finding={finding} note={note} small={small} />
        {actions}
      </div>
      {children}
    </section>
  );
}

/** The Rank row: every rank, then the four pairs of medals the numbers are grouped in. */
const RANK_CHOICES: RankChoice<RankSlice>[] = [
  { value: 0, name: "All Ranks", short: "All" },
  ...RANK_GROUPS.map((g) => ({ value: g.slice, name: g.name, medal: g.medal })),
];

/** The release the opening names, and how far the numbers reach. */
export interface MetaRelease {
  name: string;
  day: number;
  isNew: boolean;
  /** "so far", or "in the last 9 days" once the patch is older than the days kept. */
  reach: string;
}

/** The Meta page: its opening finding, filters and charts. Everything follows the rank and role filters. */
export function MetaBoard({ meta, heroes, art, release }: { meta: MetaFile; heroes: MetaHero[]; art: ItemArt; release: MetaRelease }) {
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
  const bans = useMemo(() => banRates(meta, slice), [meta, slice]);
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
  const before = previousPatch(meta.patch.name);
  const oldPatch = before ?? "Before";
  const games = sliceGames(meta, slice);
  const group = RANK_GROUPS.find((g) => g.slice === slice);
  // The opening names the chosen role's leader, or the strongest of the five role leaders.
  const tops = lead ? lead.leaders.slice(0, 1).map((h) => ({ role, rate: h.rate })) : (glance ?? []).flatMap((l, i) => (l[0] ? [{ role: i + 1, rate: l[0].rate }] : []));
  const heroName = (id: number) => byId.get(id)?.name ?? `Hero ${id}`;
  const verdict = metaVerdict(tops, lead ? lead.pool.map((h) => h.rate) : rates, heroName, before);
  const mapNote = [
    `${rates.length} heroes`,
    `${games.toLocaleString("en-US")} games`,
    group?.name,
    role ? POSITION_NAMES[role - 1] : undefined,
  ]
    .filter(Boolean)
    .join(", ");
  const measureSwitch = (
    <div className="lane-seg" role="group" aria-label="Measure">
      <button type="button" aria-pressed={measure === "win"} onClick={() => setMeasure("win")}>
        Win Rate
      </button>
      <button type="button" aria-pressed={measure === "pick"} onClick={() => setMeasure("pick")}>
        Pick Rate
      </button>
    </div>
  );

  return (
    <div className="grid gap-8">
      <PageStage
        name="Meta"
        title={verdict?.title ?? "What Ranked Players Pick and Win With"}
        portrait={verdict ? byId.get(verdict.heroId)?.image : undefined}
        facts={
          <>
            <span className="chip chip-accent num">{release.name}</span>
            <span>
              {release.isNew ? "New Patch" : "Patch"}, Day {release.day}
            </span>
            <span>
              {games.toLocaleString("en-US")} ranked games{group ? ` in ${group.name}` : ""} {release.reach}
            </span>
          </>
        }
      >
        {verdict?.line ?? "Too few games at this rank and role yet."}
      </PageStage>
      <div className="grid gap-3.5">
        <RoleTabs role={role} onChange={setRole} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2 max-sm:w-full">
            <span className="micro text-muted" id="meta-rank">
              Rank
            </span>
            <RankRow labelledBy="meta-rank" choices={RANK_CHOICES} value={slice} onChange={setSlice} />
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
          <SectionHead
            title="The Meta at a Glance"
            facts="Top four of each role by wins above even"
            finding={glanceTitle(tops.map((t) => t.rate), before)}
            note="Pick a role for its leaders, builds and counters."
          />
          <MetaGlance roles={glance} heroes={byId} onRole={setRole} onSelect={select} />
        </section>
      )}

      <section className="grid gap-[18px]">
        <SectionHead
          title="Winners and Losers"
          facts={`${measure === "win" ? "Win" : "Pick"} rate, ${role ? POSITION_NAMES[role - 1] : "every role"}, last week of ${oldPatch} to ${meta.patch.name} so far`}
          finding={moversTitle(moved.up[0], moved.down[0], measure, heroName)}
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
            facts={`${items.games.toLocaleString("en-US")} ${POSITION_NAMES[role - 1]} games of ${meta.patch.name}, bars run to 50%`}
            finding={roleItemsTitle(items.items[0] && { name: art[items.items[0].id]?.name ?? "Item", share: items.items[0].share }, role)}
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
              <PickWinMap rates={rates} bans={bans} heroes={byId} selected={selected} onSelect={select} />
            </div>
            <div className="sm:hidden">
              <MapBoards rates={rates} heroes={byId} selected={selected} onSelect={select} />
            </div>
          </>
        )}
      </Panel>

      <SponsorBand sponsor={sponsorFor("meta")} />

      {meta.extras && meta.extras.newItems.length > 0 && (
        <Panel
          title={`New Items in ${meta.patch.name}`}
          facts={`Every rank and role, ${meta.extras.buildGames.toLocaleString("en-US")} games so far, with each item's top heroes`}
          finding={newItemsTitle(meta.extras.newItems.flatMap((n) => (art[n.id] ? [{ name: art[n.id]!.name, games: n.games }] : [])))}
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
            ban={bans.get(rate.id)}
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
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted" aria-hidden>
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
