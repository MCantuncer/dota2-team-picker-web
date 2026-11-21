"use client";

import { useMemo, useState } from "react";
import { LaneTactics } from "@/components/lane-tactics";
import type { PairTactics } from "@/lib/engine/game-plan";
import { laneTactics } from "@/lib/engine/lane-tactics";
import { loadSnapshot } from "@/lib/engine/snapshot";
import { POSITIONS, type Position, type Snapshot } from "@/lib/engine/types";
import type { MetaHero } from "./meta-board";

/** Enemies offered on the switch: the heroes this one meets most in lane. */
const ENEMIES = 6;

/** The position a hero plays most, from the snapshot's games per position. */
function mainPosition(data: Snapshot, heroId: number): Position | undefined {
  const games = data.positions?.[String(heroId)];
  if (!games?.length) return undefined;
  const best = games.indexOf(Math.max(...games));
  return POSITIONS[best];
}

/**
 * The hero's lane tactics against the heroes it meets most in lane (all ranks), with this hero's lane win rate
 * against each, at `position` (the role filter, else the hero's main role). Pairs without tactics are left out.
 */
export function metaLaneTactics(data: Snapshot, heroId: number, position: Position, name: (id: number) => string): { pairs: PairTactics[]; won: Map<number, number> } {
  const lanes = data.laneOutcomes?.["0"]?.[String(heroId)] ?? {};
  const met = Object.entries(lanes)
    .map(([id, c]) => ({ id: Number(id), games: c[0], won: c[0] > 0 ? c[1] / c[0] : 0 }))
    .sort((a, b) => b.games - a.games);
  const pairs: PairTactics[] = [];
  const won = new Map<number, number>();
  for (const enemy of met) {
    if (pairs.length >= ENEMIES) break;
    const tactics = laneTactics(data, { id: heroId, position }, { id: enemy.id, position: mainPosition(data, enemy.id) ?? position }, name);
    if (!tactics.length) continue;
    pairs.push({ hero: heroId, enemy: enemy.id, tactics });
    won.set(enemy.id, enemy.won);
  }
  return { pairs, won };
}

type State = { kind: "idle" } | { kind: "loading" } | { kind: "failed" } | { kind: "ready"; data: Snapshot };

/**
 * The Meta hero card's Lane Tactics: the hero against the enemies it meets most in lane, each with this hero's lane
 * win rate. The hero data (about 1.3 MB) is downloaded only when asked for, once per page.
 */
export function MetaLaneTactics({ hero, role, roles, heroes }: { hero: MetaHero; role: number; roles: number[]; heroes: Map<number, MetaHero> }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const name = (id: number) => heroes.get(id)?.name ?? `Hero ${id}`;
  const icons = useMemo(() => Object.fromEntries([...heroes.values()].map((h) => [h.id, h.image])), [heroes]);
  const position = (role || roles[0] || undefined) as Position | undefined;
  const found = useMemo(
    () => (state.kind === "ready" ? metaLaneTactics(state.data, hero.id, position ?? mainPosition(state.data, hero.id) ?? 1, (id) => heroes.get(id)?.name ?? `Hero ${id}`) : null),
    [state, hero.id, position, heroes],
  );
  const load = () => {
    setState({ kind: "loading" });
    loadSnapshot().then(
      (data) => setState({ kind: "ready", data }),
      () => setState({ kind: "failed" }),
    );
  };

  return (
    // Loaded, the cards sit on the hero card itself as on the Game Story; until then a panel offers them.
    <div className={`grid min-w-0 content-start gap-4 lg:col-span-2 ${found?.pairs.length ? "pt-2" : "rounded-xl bg-raised p-4 ring-1 ring-inset ring-line-strong sm:p-5"}`}>
      {found && found.pairs.length > 0 ? (
        <LaneTactics
          key={hero.id}
          level={3}
          pairs={found.pairs}
          heroName={name}
          icons={icons}
          note={(id) => {
            const share = found.won.get(id);
            return share === undefined ? undefined : `Won ${Math.round(share * 100)}%`;
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="grid gap-1">
            <h3 className="font-semibold text-fg">Lane Tactics</h3>
            <p className="text-sm text-muted">
              {found
                ? `No lane tactics for ${hero.name} yet.`
                : state.kind === "failed"
                  ? "The hero data did not load. Try again."
                  : `How ${hero.name} plays the lane against the heroes it meets most, from the game numbers.`}
            </p>
          </div>
          {!found && (
            <button type="button" onClick={load} disabled={state.kind === "loading"} className="btn btn-secondary h-10 px-4">
              {state.kind === "loading" ? "Loading Lane Tactics" : state.kind === "failed" ? "Try Again" : "Show Lane Tactics"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
