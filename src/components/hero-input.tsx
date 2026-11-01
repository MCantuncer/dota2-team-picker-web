"use client";

import { useState } from "react";
import { Kbd } from "@/components/kbd";
import { splitPosition } from "@/lib/draft";
import type { HeroInfo, Position } from "@/lib/engine/types";
import type { HeroSearch } from "@/lib/hero-search";

/**
 * Hero search box: Enter adds the top match, arrows choose another, Esc clears, Backspace on an empty
 * box undoes the last add. With `multi`, Enter adds every name typed, separated by spaces. With
 * `withPosition`, a trailing digit sets the position (`cm5`).
 */
export function HeroInput({
  id,
  placeholder,
  search,
  exclude,
  multi,
  withPosition,
  onPick,
  onPickMany,
  onUndo,
  inputRef,
}: {
  id: string;
  placeholder: string;
  search: HeroSearch<HeroInfo>;
  exclude: Set<number>;
  multi?: boolean;
  withPosition?: boolean;
  onPick: (heroId: number, position: Position | null) => void;
  onPickMany?: (heroIds: number[]) => void;
  onUndo?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [value, setValue] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const typed = withPosition ? splitPosition(value) : { query: value, position: null };
  const lastWord = multi ? (value.trimEnd().split(/\s+/).at(-1) ?? "") : typed.query;
  const results: HeroInfo[] = search.find(lastWord, exclude);

  const choose = (hero: HeroInfo) => {
    onPick(hero.id, typed.position);
    setValue(multi ? value.trimEnd().split(/\s+/).slice(0, -1).map((w) => w + " ").join("") : "");
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (multi && onPickMany) {
        const picked: number[] = [];
        for (const word of value.trim().split(/\s+/).filter(Boolean)) {
          const hit = search.find(word, new Set([...exclude, ...picked]), 1)[0];
          if (hit) picked.push(hit.id);
        }
        if (picked.length) onPickMany(picked);
        setValue("");
      } else if (results[active]) choose(results[active]);
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
                choose(h);
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
