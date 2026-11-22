"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { SimilarSummary, WonTarget } from "@/lib/engine/similar-games";
import type { ItemInfo } from "@/lib/engine/types";
import { POSITION_NAMES } from "@/lib/draft";
import type { SimilarState } from "@/lib/use-similar-games";
import { HeroFace } from "./hero-frame";
import { ItemButton } from "./item-card";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

/** What the answer has to show: the hook's state and, when ready, the engine's summary (null: too few games). */
export interface SimilarView {
  state: SimilarState;
  summary: SimilarSummary | null;
}

/** The Similar Games tab's answer: the record, and the closest games' results as squares. */
export function SimilarPreview({ view }: { view: SimilarView | null }) {
  const s = view?.summary;
  if (!s) return <span className="text-sm text-muted">{previewWord(view)}</span>;
  return (
    <span className="flex items-center gap-3">
      <span className="num text-[0.9375rem] text-fg">
        {s.wins} of {s.games}
      </span>
      <span className="text-sm text-muted">Won</span>
      <span className="flex gap-1">
        {s.closest.map((g) => (
          <span key={g.match} className={`size-3.5 rounded-xs ${g.won ? "bg-radiant" : "bg-dire"}`} />
        ))}
      </span>
    </span>
  );
}

function previewWord(view: SimilarView | null): string {
  if (!view || view.state.kind === "loading") return "Looking up games";
  if (view.state.kind === "sign-in") return "Sign in to see games";
  if (view.state.kind === "unavailable") return "Not available now";
  return "Too few games yet";
}

/** A sentence for screen readers: what the tab shows on itself. */
export function similarPreviewText(view: SimilarView | null): string {
  const s = view?.summary;
  if (!s) return `${previewWord(view)}.`;
  return `${s.wins} of ${s.games} similar games won.`;
}

export interface SimilarGamesAnswerProps {
  view: SimilarView | null;
  position: number;
  heroName: (id: number) => string;
  icons: Record<number, string>;
  items?: Record<string, ItemInfo>;
  /** This draft's enemy in the hero's lane, when the enemy positions are known. */
  laneEnemy: number | null;
  /** Keys the ticks to this draft, so a new draft starts with none. */
  draftKey: string;
}

/**
 * Similar Games: real Divine and up games of this patch where the hero played this position against three (or two)
 * of these enemies. The record and each enemy's count, the usual build, and What Won: targets a fair test found,
 * to tick during the game.
 */
export function SimilarGamesAnswer({ view, position, heroName, icons, items, laneEnemy, draftKey }: SimilarGamesAnswerProps) {
  const state = view?.state;
  if (!view || !state || state.kind === "loading") return <p className="text-sm text-muted">Looking up similar games…</p>;
  if (state.kind === "sign-in")
    return <p className="text-sm text-muted">Sign in to see high-rank games of this hero against these enemies.</p>;
  if (state.kind === "unavailable") {
    return (
      <p className="notice">
        {state.reason === "limit"
          ? "Too many lookups for now. Try again in a while."
          : "Could not look up similar games right now. Try again in a minute."}
      </p>
    );
  }
  const s = view.summary;
  const role = POSITION_NAMES[position - 1] ?? "this position";
  const name = heroName(state.answer.hero);
  if (!s) {
    const more = state.answer.pending ? " More games are still being read." : "";
    return (
      <p className="text-sm text-muted">
        Too few Divine and up {name} games as {role} against these enemies this patch to show.{more}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <Record summary={s} name={name} role={role} heroName={heroName} icons={icons} items={items} laneEnemy={laneEnemy} />
      <WhatWon summary={s} items={items} storageKey={`similar-ticks:${draftKey}:${s.hero}`} />
    </div>
  );
}

function Record({
  summary: s,
  name,
  role,
  heroName,
  icons,
  items,
  laneEnemy,
}: {
  summary: SimilarSummary;
  name: string;
  role: string;
  heroName: (id: number) => string;
  icons: Record<number, string>;
  items?: Record<string, ItemInfo>;
  laneEnemy: number | null;
}) {
  const share = s.games ? s.wins / s.games : 0;
  return (
    <div className="grid gap-x-10 gap-y-6 rounded-xl border border-line-strong bg-bg p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="flex flex-col gap-3">
        <p className="flex items-baseline gap-2">
          <span className={`text-5xl font-semibold tabular-nums tracking-[-0.03em] ${share >= 0.5 ? "text-radiant" : "text-dire"}`}>
            {s.wins}
          </span>
          <span className="text-lg text-muted">of {s.games} Won</span>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-xs bg-raised" aria-hidden>
          <div className={`h-full ${share >= 0.5 ? "bg-radiant" : "bg-dire"}`} style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
        <p className="text-[0.8125rem] text-subtle">
          {name} as {role} against {s.level} or more of these enemies. Divine and up, this patch.
          {s.pending ? " More games are still being read." : ""}
        </p>
      </div>
      <ul className="grid w-fit grid-cols-[repeat(5,minmax(0,4.5rem))] gap-2 sm:gap-3" aria-label="Won with each enemy in the game">
        {s.enemies.map((e) => {
          const lane = e.hero === laneEnemy;
          return (
            <li key={e.hero} className={`flex flex-col items-center gap-1 rounded-lg p-1.5 ${lane ? "ring-1 ring-accent" : ""}`}>
              {icons[e.hero] ? (
                <HeroFace portrait={icons[e.hero]!} name={heroName(e.hero)} size={44} isEnemy />
              ) : (
                <span className="size-11" />
              )}
              <span className="num text-[0.9375rem] text-fg">{e.wins}</span>
              <span className="text-xs text-muted">of {e.games}</span>
              {lane && <span className="whitespace-nowrap text-xs text-accent">Lane</span>}
            </li>
          );
        })}
      </ul>
      {s.usualBuild.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:gap-6 lg:col-span-2">
          <h3 className="label-caps shrink-0">Usual Build</h3>
          <div className="flex flex-wrap gap-4">
            {s.usualBuild.map((b) => {
              const info = items?.[String(b.item)];
              return (
                <span key={b.item} className="flex flex-col items-center gap-1">
                  {info ? (
                    <ItemButton card={{ itemId: b.item, name: info.name }}>
                      <Image src={ITEM_CDN + info.img} alt="" width={44} height={32} className="h-8 w-11 rounded-md object-cover" />
                    </ItemButton>
                  ) : (
                    <span className="h-8 w-11 rounded-md bg-raised" />
                  )}
                  <span className="num text-xs text-muted">{b.minute}</span>
                </span>
              );
            })}
          </div>
          <p className="text-[0.8125rem] text-subtle sm:ml-auto sm:text-right">Most of these games, wins and losses alike</p>
        </div>
      )}
    </div>
  );
}

function WhatWon({ summary: s, items, storageKey }: { summary: SimilarSummary; items?: Record<string, ItemInfo>; storageKey: string }) {
  const [ticks, setTicks] = useTicks(storageKey);
  let body;
  if (s.whatWon === null) {
    body = <Quiet>{s.pending ? "Reading the rest of the games first." : `Needs 20 games in this role, ${s.games} so far.`}</Quiet>;
  } else if (s.whatWon.length === 0) {
    body = <Quiet>No item timing or death count in these {s.games} games split wins from losses beyond chance.</Quiet>;
  } else {
    body = (
      <div className={`grid gap-3 ${s.whatWon.length > 1 ? "md:grid-cols-2" : "max-w-2xl"}`}>
        {s.whatWon.map((t) => {
          const id = targetId(t);
          const title = targetTitle(t, items);
          return (
            <label
              key={id}
              className="flex cursor-pointer flex-col gap-4 rounded-xl border border-line-strong bg-bg p-4 hover:border-line-hover"
            >
              <span className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={title}
                  className="mt-0.5 size-5 shrink-0 accent-accent"
                  checked={ticks.includes(id)}
                  onChange={(e) => setTicks(e.target.checked ? [...ticks, id] : ticks.filter((x) => x !== id))}
                />
                <span className="text-[0.9375rem] font-semibold text-fg">{title}</span>
              </span>
              <TargetBar label={t.kind === "item" ? "With It" : t.most === 0 ? "No Deaths" : `${t.most} or Fewer`} side={t.met} strong />
              <TargetBar label={t.kind === "item" ? "Without" : `${t.most + 1} or More`} side={t.missed} />
            </label>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="section-title">What Won</h3>
        <p className="text-[0.8125rem] text-subtle">Only gaps that beat chance. Counts, not causes.</p>
      </div>
      {body}
    </div>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">{children}</p>;
}

function TargetBar({ label, side, strong = false }: { label: string; side: { games: number; wins: number }; strong?: boolean }) {
  const share = side.games ? side.wins / side.games : 0;
  return (
    <span className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-xs bg-raised">
        <span className={`block h-full ${strong ? "bg-radiant" : "bg-subtle"}`} style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
      <span className="num text-fg">
        {side.wins} of {side.games}
      </span>
    </span>
  );
}

/** "Meteor Hammer by 11 Min", "Die 2 Times or Less by 20 Min" or "No Deaths by 20 Min". */
export function targetTitle(t: WonTarget, items?: Record<string, ItemInfo>): string {
  if (t.kind === "item") return `${items?.[String(t.item)]?.name ?? "Item"} by ${t.minute} Min`;
  if (t.most === 0) return `No Deaths by ${t.minute} Min`;
  return `Die ${t.most} ${t.most === 1 ? "Time" : "Times"} or Less by ${t.minute} Min`;
}

const targetId = (t: WonTarget) => (t.kind === "item" ? `item-${t.item}-${t.minute}` : `deaths-${t.most}-${t.minute}`);

/** The ticked targets saved in this browser for a key; none when storage is blocked or holds something else. */
export function readTicks(key: string): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === "string" && x.length < 64).slice(0, 10) : [];
  } catch {
    return [];
  }
}

/** The ticked targets for this draft and hero, kept in this browser. */
function useTicks(key: string): [string[], (next: string[]) => void] {
  const [ticks, setTicks] = useState(() => ({ key, ids: typeof window === "undefined" ? [] : readTicks(key) }));
  // Another draft or hero: read its ticks while rendering, as React suggests for state that follows a prop.
  if (ticks.key !== key) setTicks({ key, ids: readTicks(key) });
  const set = (next: string[]) => {
    setTicks({ key, ids: next });
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage full or blocked: the ticks still work for this visit.
    }
  };
  return [ticks.key === key ? ticks.ids : [], set];
}
