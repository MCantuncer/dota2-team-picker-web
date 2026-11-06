"use client";

import Image from "next/image";
import { type ReactNode, useMemo, useState } from "react";
import { PositionIcon } from "@/components/position-icon";
import { HeroSearch } from "@/lib/hero-search";
import type { Hero } from "@/lib/heroes";
import type { PoolCard } from "@/lib/pool-cards";
import { createClient } from "@/lib/supabase/client";
import { NO_SUPPORT_COPY, readSupportLists, type SupportCopy, supportCopyNote } from "@/lib/support-copy";

const POSITIONS = [
  { n: 1, name: "Carry" },
  { n: 2, name: "Mid" },
  { n: 3, name: "Offlane" },
  { n: 4, name: "Soft Support" },
  { n: 5, name: "Hard Support" },
];
const ATTRS = [
  { key: "str", name: "Strength" },
  { key: "agi", name: "Agility" },
  { key: "int", name: "Intelligence" },
  { key: "all", name: "Universal" },
];

/**
 * A row of position tabs, then the heroes for the selected position. Typing filters the hero
 * grid and Enter adds the top match; clicking a portrait adds or removes it. Everything saves at once.
 */
export function PositionHeroes({
  userId,
  heroes,
  initialPositions,
  initialHeroes,
  suggestions = [],
  options,
  initialSupportCopy = NO_SUPPORT_COPY,
}: {
  userId: string;
  heroes: Hero[];
  initialPositions: number[];
  initialHeroes: Record<number, number[]>;
  /** Hero pool cards still waiting for an answer, shown on their position. */
  suggestions?: PoolCard[];
  /** Page-level settings shown beside "Use in drafts", such as the suggestions setting. */
  options?: ReactNode;
  /** Whether the first support list is being copied to the other one (Support Copy). */
  initialSupportCopy?: SupportCopy;
}) {
  const supabase = useMemo(() => createClient(), []);
  const search = useMemo(() => new HeroSearch(heroes), [heroes]);
  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const [played, setPlayed] = useState(() => new Set(initialPositions));
  const [picks, setPicks] = useState(initialHeroes);
  const [active, setActive] = useState(initialPositions.length ? Math.min(...initialPositions) : 1);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState(suggestions);
  const [answering, setAnswering] = useState<string | null>(null);
  const [supportCopy, setSupportCopy] = useState(initialSupportCopy);

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
    // The database also copies the change to the other support list while Support Copy is on.
    const { data, error } = await supabase.rpc("set_favorite_hero", { hero_position: active, hero: id, is_on: on });
    report(byId.get(id)?.name ?? "that hero")({ error });
    if (!error) showSupportLists(data);
  }

  /** Takes both support lists and the copy state from the database's answer. */
  function showSupportLists(raw: unknown) {
    const lists = readSupportLists(raw);
    if (!lists) return;
    setSupportCopy(lists.copy);
    setPicks((cur) => ({ ...cur, 4: lists.heroes[4], 5: lists.heroes[5] }));
  }

  async function stopSupportCopy() {
    const { data, error } = await supabase.rpc("stop_support_copy");
    report("your support lists")({ error });
    if (!error) showSupportLists(data);
  }

  /** Yes adds the hero and turns the position on in the database; mirror that here. */
  async function answerCard(card: PoolCard, yes: boolean) {
    setAnswering(card.id);
    const { error } = await supabase.rpc("answer_pool_suggestion", { card: card.id, answer: yes ? "yes" : "no" });
    setAnswering(null);
    if (error) return setError("Could not save your answer. Please try again.");
    setError(null);
    setCards((cur) => cur.filter((c) => c.id !== card.id));
    if (!yes) return;
    setPicks((cur) => {
      const list = cur[card.position] ?? [];
      return list.includes(card.heroId) ? cur : { ...cur, [card.position]: [...list, card.heroId] };
    });
    setPlayed((cur) => new Set(cur).add(card.position));
    // A Yes on the source support list is copied like a hero added by hand.
    if (supportCopy.state === "on" && card.position === supportCopy.from) {
      const other = 9 - card.position;
      setPicks((cur) => {
        const list = cur[other] ?? [];
        return list.includes(card.heroId) ? cur : { ...cur, [other]: [...list, card.heroId] };
      });
    }
  }

  const pos = POSITIONS[active - 1]!;
  const activeCards = cards.filter((c) => c.position === active);
  const isPlayed = played.has(active);
  const copyNote = supportCopyNote(supportCopy, active);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Positions" className="grid grid-cols-5 gap-1 border-b border-line">
        {POSITIONS.map((p) => {
          const isActive = p.n === active;
          const count = picks[p.n]?.length ?? 0;
          return (
            <button
              key={p.n}
              onClick={() => setActive(p.n)}
              aria-current={isActive}
              title={p.name}
              className={`group relative flex min-w-0 items-center justify-center gap-1.5 rounded-t-md px-1 py-3 transition-colors max-sm:flex-col sm:gap-3 sm:px-3 ${
                isActive ? "bg-accent-tint text-fg" : "text-muted hover:bg-surface hover:text-fg"
              }`}
            >
              <span className={`shrink-0 transition-colors ${isActive ? "text-accent" : "text-subtle/60 group-hover:text-subtle"}`}>
                <PositionIcon position={p.n} size={32} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 text-left max-sm:hidden">
                <span className="flex items-center gap-1.5">
                  <span className={`truncate text-sm ${isActive ? "font-semibold" : "font-medium"}`}>{p.name}</span>
                  {played.has(p.n) && <span aria-label="You play this" className="size-1.5 shrink-0 rounded-full bg-radiant" />}
                  {cards.some((c) => c.position === p.n) && (
                    <span aria-label="Suggestion from your games" className="size-1.5 shrink-0 rounded-full bg-accent" />
                  )}
                </span>
                <span className={`num truncate text-xs ${isActive ? "text-muted" : "text-subtle"}`}>
                  Pos {p.n} · {count ? `${count} hero${count === 1 ? "" : "es"}` : "No heroes yet"}
                </span>
              </span>
              <span className={`num text-xs sm:hidden ${isActive ? "font-semibold" : "font-medium"}`}>Pos {p.n}</span>
              {isActive && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
            </button>
          );
        })}
      </nav>

      <section aria-label={`${pos.name} heroes`} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="section-title">
            {pos.name} Heroes <span className="num text-base font-medium text-subtle">Pos {pos.n}</span>
          </h2>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
              <input type="checkbox" checked={isPlayed} onChange={(e) => setPosition(active, e.target.checked)} className="lane-check" />
              Use in drafts
            </label>
            {options}
          </div>
        </div>

        <div className="flex min-h-12 flex-wrap gap-2">
          {chosen.length === 0 && <p className="self-center text-sm text-subtle">No heroes yet. Add your best ones first; five to ten is plenty.</p>}
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

        {copyNote && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {copyNote}
            <button onClick={stopSupportCopy} className="btn btn-ghost btn-sm">
              Stop Copying
            </button>
          </p>
        )}

        {activeCards.length > 0 && (
          <div role="group" aria-labelledby="from-games-title" className="flex flex-col gap-2 rounded-md bg-surface p-3">
            <h3 id="from-games-title" className="label-caps">
              From Your Games
            </h3>
            <ul className="flex flex-col gap-2">
              {activeCards.map((card) => {
                const h = byId.get(card.heroId);
                return (
                  <li key={card.id} className="flex flex-wrap items-center gap-3">
                    {h && <Image src={h.image} alt="" width={64} height={36} unoptimized className="rounded-xs" />}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium text-fg">{card.question}</span>
                      <span className="text-sm text-muted">{card.reason}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => answerCard(card, true)} disabled={answering === card.id} className="btn btn-primary btn-sm">
                        Add Hero
                      </button>
                      <button onClick={() => answerCard(card, false)} disabled={answering === card.id} className="btn btn-secondary btn-sm">
                        No
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

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
