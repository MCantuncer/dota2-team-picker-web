"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { HeroSearch } from "@/lib/hero-search";
import type { Hero } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/client";

const POSITIONS = [
  { n: 1, name: "Carry", lane: "Safe lane" },
  { n: 2, name: "Mid", lane: "Mid lane" },
  { n: 3, name: "Offlane", lane: "Off lane" },
  { n: 4, name: "Soft support", lane: "Off lane" },
  { n: 5, name: "Hard support", lane: "Safe lane" },
];
const ATTRS = [
  { key: "str", name: "Strength" },
  { key: "agi", name: "Agility" },
  { key: "int", name: "Intelligence" },
  { key: "all", name: "Universal" },
];

/**
 * Positions on the left, heroes for the selected position on the right. Typing filters the hero
 * grid and Enter adds the top match; clicking a portrait adds or removes it. Everything saves at once.
 */
export function PositionHeroes({
  userId,
  heroes,
  initialPositions,
  initialHeroes,
}: {
  userId: string;
  heroes: Hero[];
  initialPositions: number[];
  initialHeroes: Record<number, number[]>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const search = useMemo(() => new HeroSearch(heroes), [heroes]);
  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const [played, setPlayed] = useState(() => new Set(initialPositions));
  const [picks, setPicks] = useState(initialHeroes);
  const [active, setActive] = useState(initialPositions.length ? Math.min(...initialPositions) : 1);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const chosen = picks[active] ?? [];
  const matches = query.trim() ? search.find(query, new Set(), 200) : null;
  const matchIds = matches ? new Set(matches.map((h) => h.id)) : null;

  const report = (what: string) => (res: { error: unknown }) => setError(res.error ? `Could not save ${what}. Please try again.` : null);

  async function setPosition(pos: number, on: boolean) {
    setPlayed((cur) => {
      const next = new Set(cur);
      if (on) next.add(pos);
      else next.delete(pos);
      return next;
    });
    report("your positions")(
      on
        ? await supabase.from("favorite_positions").upsert({ user_id: userId, position: pos }, { ignoreDuplicates: true })
        : await supabase.from("favorite_positions").delete().eq("user_id", userId).eq("position", pos),
    );
  }

  async function toggleHero(id: number) {
    const on = !chosen.includes(id);
    setPicks((cur) => ({ ...cur, [active]: on ? [...(cur[active] ?? []), id] : (cur[active] ?? []).filter((x) => x !== id) }));
    if (on && !played.has(active)) setPosition(active, true);
    report(byId.get(id)?.name ?? "that hero")(
      on
        ? await supabase.from("favorite_heroes").insert({ user_id: userId, position: active, hero_id: id })
        : await supabase.from("favorite_heroes").delete().eq("user_id", userId).eq("position", active).eq("hero_id", id),
    );
  }

  const pos = POSITIONS[active - 1]!;
  const isPlayed = played.has(active);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Positions" className="grid grid-cols-5 border-b border-line">
        {POSITIONS.map((p) => {
          const isActive = p.n === active;
          const count = picks[p.n]?.length ?? 0;
          return (
            <button
              key={p.n}
              onClick={() => setActive(p.n)}
              aria-current={isActive}
              className={`relative flex min-w-0 flex-col items-start gap-0.5 px-1 pb-3 pt-2 text-left sm:px-3 ${
                isActive ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`num text-2xl font-semibold ${isActive ? "text-accent" : ""}`}>{p.n}</span>
                {played.has(p.n) && <span aria-label="You play this" className="size-1.5 rounded-full bg-radiant" />}
              </span>
              <span className="truncate text-sm font-medium max-sm:hidden">{p.name}</span>
              <span className="num truncate text-xs text-subtle max-sm:hidden">
                {count ? `${count} hero${count === 1 ? "" : "es"}` : p.lane}
              </span>
              {isActive && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
            </button>
          );
        })}
      </nav>

      <section aria-label={`${pos.name} heroes`} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="mr-auto flex flex-col gap-0.5">
            <h2 className="section-title">
              {pos.name} Heroes <span className="num text-base font-medium text-subtle">Pos {pos.n}</span>
            </h2>
            <span className="text-sm text-muted">Your best heroes first. Five to ten is plenty.</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={isPlayed} onChange={(e) => setPosition(active, e.target.checked)} className="size-4 accent-radiant" />I
            play {pos.name}
          </label>
        </div>

        <div className="flex min-h-12 flex-wrap gap-2">
          {chosen.length === 0 && <p className="self-center text-sm text-subtle">No heroes yet. Search or click a portrait below.</p>}
          {chosen.map((id, i) => {
            const h = byId.get(id);
            if (!h) return null;
            return (
              <button
                key={id}
                onClick={() => toggleHero(id)}
                title={`Remove ${h.name}`}
                className="flex items-center gap-2 rounded-sm bg-surface py-1 pl-1 pr-2.5 text-sm text-fg ring-1 ring-inset ring-line-hover hover:ring-dire"
              >
                <Image src={h.image} alt="" width={48} height={27} unoptimized className="rounded-xs" />
                <span className="num text-subtle">{i + 1}</span>
                {h.name}
                <span aria-hidden className="text-subtle">
                  ×
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches?.[0]) {
                e.preventDefault();
                if (!chosen.includes(matches[0].id)) toggleHero(matches[0].id);
                setQuery("");
              } else if (e.key === "Escape") setQuery("");
            }}
            placeholder="Search, e.g. am, wk, cm"
            aria-label="Search heroes"
            autoFocus
            className="field w-full max-w-xs"
          />
          {matches?.[0] && (
            <span className="text-xs text-subtle">
              <kbd className="kbd">Enter</kbd> adds {matches[0].name}
            </span>
          )}
        </div>
        {error && <p className="text-sm text-dire">{error}</p>}

        {ATTRS.map((attr) => {
          const list = heroes.filter((h) => h.primaryAttr === attr.key && (!matchIds || matchIds.has(h.id)));
          if (!list.length) return null;
          return (
            <div key={attr.key} className="flex flex-col gap-2">
              <h3 className="label-caps">{attr.name}</h3>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1.5">
                {list.map((h) => {
                  const on = chosen.includes(h.id);
                  return (
                    <li key={h.id}>
                      <button
                        onClick={() => toggleHero(h.id)}
                        aria-pressed={on}
                        title={h.name}
                        className={`relative block w-full overflow-hidden rounded-xs ring-2 ${
                          on ? "ring-accent" : "opacity-55 ring-transparent hover:opacity-100"
                        }`}
                      >
                        <Image src={h.image} alt={h.name} width={128} height={72} unoptimized className="aspect-video w-full bg-raised object-cover" />
                        {on && (
                          <span className="num absolute right-0.5 top-0.5 rounded-xs bg-accent px-1 text-xs font-semibold leading-4 text-on-accent">
                            {chosen.indexOf(h.id) + 1}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
      <p className="text-xs text-subtle">Your captain still picks your position each game.</p>
    </div>
  );
}
