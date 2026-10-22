"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Hero } from "@/lib/heroes";
import { setFavorite } from "./actions";

const ATTRS: Record<string, string> = { str: "Strength", agi: "Agility", int: "Intelligence", all: "Universal" };

/** Hero grid where clicking a hero adds or removes it from the user's favorites. */
export function FavoritePicker({ heroes, favorites }: { heroes: Hero[]; favorites: number[] }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => new Set(favorites));

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? heroes.filter((h) => h.name.toLowerCase().includes(q)) : heroes;
  }, [heroes, query]);
  const favoriteHeroes = heroes.filter((h) => selected.has(h.id));

  async function toggle(hero: Hero) {
    const on = !selected.has(hero.id);
    const update = (add: boolean) =>
      setSelected((current) => {
        const next = new Set(current);
        if (add) next.add(hero.id);
        else next.delete(hero.id);
        return next;
      });
    setError(null);
    update(on);
    try {
      await setFavorite(hero.id, on);
    } catch {
      update(!on);
      setError(`Could not update ${hero.name}. Please try again.`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-12 flex-wrap gap-2">
        {favoriteHeroes.length === 0 && (
          <p className="text-sm text-zinc-500">No favorites yet. Pick the heroes you like to play below.</p>
        )}
        {favoriteHeroes.map((h) => (
          <button
            key={h.id}
            onClick={() => toggle(h)}
            title={`Remove ${h.name}`}
            className="flex items-center gap-2 rounded-full bg-zinc-800 py-1 pl-1 pr-3 text-sm hover:bg-red-900"
          >
            <Image src={h.image} alt="" width={40} height={22} unoptimized className="rounded-full object-cover" />
            {h.name} <span aria-hidden>×</span>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search heroes"
        className="w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-red-600"
      />
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
        {shown.map((h) => {
          const on = selected.has(h.id);
          return (
            <li key={h.id}>
              <button
                onClick={() => toggle(h)}
                aria-pressed={on}
                title={`${h.name} · ${ATTRS[h.primaryAttr] ?? h.primaryAttr}`}
                className={`group relative block w-full overflow-hidden rounded-md ring-2 transition ${
                  on ? "ring-red-500" : "ring-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={h.image} alt="" width={128} height={72} unoptimized className="aspect-video w-full bg-zinc-800 object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 text-xs">{h.name}</span>
                {on && <span className="absolute right-1 top-0.5 text-sm text-red-400">★</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
