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

  return (
    <div className="grid gap-4 md:grid-cols-[15rem_1fr]">
      <nav aria-label="Positions" className="flex flex-col gap-1.5">
        {POSITIONS.map((p) => {
          const isActive = p.n === active;
          const isPlayed = played.has(p.n);
          const count = picks[p.n]?.length ?? 0;
          return (
            <div
              key={p.n}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                isActive ? "border-amber-500/70 bg-zinc-900" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              }`}
            >
              <button onClick={() => setActive(p.n)} className="flex flex-1 items-center gap-3 text-left" aria-current={isActive}>
                <span
                  className={`grid size-8 place-items-center rounded-md font-mono text-sm font-bold ${
                    isPlayed ? "bg-green-600/20 text-green-300 ring-1 ring-green-600" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {p.n}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className={`font-semibold ${isPlayed ? "" : "text-zinc-400"}`}>{p.name}</span>
                  <span className="text-xs tabular-nums text-zinc-500">
                    {count ? `${count} hero${count === 1 ? "" : "es"}` : p.lane}
                  </span>
                </span>
              </button>
              <label className="flex items-center gap-1.5 text-xs text-zinc-400" title={`I play ${p.name}`}>
                <input
                  type="checkbox"
                  checked={isPlayed}
                  onChange={(e) => setPosition(p.n, e.target.checked)}
                  className="size-4 accent-green-600"
                />
                Play
              </label>
            </div>
          );
        })}
        <p className="px-1 pt-1 text-xs text-zinc-500">Tick the positions you play. Your captain still picks your position each game.</p>
      </nav>

      <section aria-label={`${pos.name} heroes`} className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-lg font-bold">
            <span className="font-mono text-green-400">{pos.n}</span> {pos.name} heroes
          </h2>
          <span className="text-sm text-zinc-500">Your best heroes first. Five to ten is plenty.</span>
        </div>

        <div className="flex min-h-12 flex-wrap gap-2">
          {chosen.length === 0 && <p className="self-center text-sm text-zinc-500">No heroes yet. Search or click portraits below.</p>}
          {chosen.map((id) => {
            const h = byId.get(id);
            if (!h) return null;
            return (
              <button
                key={id}
                onClick={() => toggleHero(id)}
                title={`Remove ${h.name}`}
                className="flex items-center gap-2 rounded-md bg-zinc-800 py-1 pl-1 pr-2.5 text-sm ring-1 ring-green-700 hover:ring-red-500"
              >
                <Image src={h.image} alt="" width={48} height={27} unoptimized className="rounded-sm" />
                {h.name}
                <span aria-hidden className="text-zinc-500">
                  ×
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
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
            className="w-full max-w-xs rounded-md bg-zinc-800 px-3 py-2 ring-1 ring-zinc-700 outline-none focus:ring-2 focus:ring-amber-500"
          />
          {matches?.[0] && (
            <span className="text-xs text-zinc-500">
              <kbd className="rounded border border-zinc-700 px-1 font-mono">Enter</kbd> adds {matches[0].name}
            </span>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {ATTRS.map((attr) => {
          const list = heroes.filter((h) => h.primaryAttr === attr.key && (!matchIds || matchIds.has(h.id)));
          if (!list.length) return null;
          return (
            <div key={attr.key} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{attr.name}</h3>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1.5">
                {list.map((h) => {
                  const on = chosen.includes(h.id);
                  return (
                    <li key={h.id}>
                      <button
                        onClick={() => toggleHero(h.id)}
                        aria-pressed={on}
                        title={h.name}
                        className={`relative block w-full overflow-hidden rounded ring-2 ${
                          on ? "ring-green-500" : "opacity-60 ring-transparent hover:opacity-100"
                        }`}
                      >
                        <Image src={h.image} alt={h.name} width={128} height={72} unoptimized className="aspect-video w-full bg-zinc-800 object-cover" />
                        {on && (
                          <span className="absolute right-0.5 top-0.5 rounded-sm bg-green-600 px-1 font-mono text-[10px] font-bold">
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
    </div>
  );
}
