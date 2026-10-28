"use client";

import { useState } from "react";
import { Kbd } from "@/components/kbd";
import { splitHeroes } from "@/lib/hero-entry";
import type { HeroInfo, Position } from "@/lib/engine/types";
import type { HeroSearch } from "@/lib/hero-search";

/** A hero chosen in a search box, with the position typed after it (`cm5`) when positions are on. */
export interface PickedHero {
  heroId: number;
  position: Position | null;
}

interface HeroInputProps {
  id: string;
  placeholder: string;
  search: HeroSearch<HeroInfo>;
  exclude: Set<number>;
  withPosition?: boolean;
  onPick: (heroes: PickedHero[]) => void;
  onUndo?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Hero search box: Enter adds the top match, arrows choose another, Esc clears, Backspace on an empty
 * box undoes the last add. Several heroes can go in at once, separated by spaces (`pa sf`); the list
 * and the arrows apply to the last one. With `withPosition`, a digit after a hero sets its position (`cm5`).
 */
export function HeroInput({ id, placeholder, search, exclude, withPosition, onPick, onUndo, inputRef }: HeroInputProps) {
  const [value, setValue] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const typed = splitHeroes(value, Boolean(withPosition), (q) => search.isNameStart(q));
  const results: HeroInfo[] = search.find(typed.at(-1)?.query ?? "", exclude);

  /** Adds every typed hero: the top match for each, and the highlighted one (or `last`) for the last. */
  const commit = (last?: HeroInfo) => {
    const picked: PickedHero[] = [];
    const taken = new Set(exclude);
    typed.forEach((t, i) => {
      const isLast = i === typed.length - 1;
      const hero = isLast ? (last ?? results[active]) : search.find(t.query, taken, 1)[0];
      if (!hero || taken.has(hero.id)) return;
      taken.add(hero.id);
      picked.push({ heroId: hero.id, position: t.position });
    });
    if (!picked.length) return;
    onPick(picked);
    setValue("");
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Escape") {
      setValue("");
    } else if (e.key === "Backspace" && !value && onUndo) {
      e.preventDefault();
      onUndo();
    }
  };

  return (
    <div className="relative min-w-0">
      <input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="field w-full"
      />
      {open && results.length > 0 && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-10 mt-0.5 rounded-md bg-raised p-1 shadow-lg ring-1 ring-line-strong">
          {results.map((h, i) => (
            <li
              key={h.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(h);
              }}
              className={`flex cursor-pointer justify-between rounded px-2 py-1 text-sm ${i === active ? "bg-hover" : ""}`}
            >
              {h.name}
              {i === 0 && <Kbd>Enter</Kbd>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
