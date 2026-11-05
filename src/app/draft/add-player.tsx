"use client";

import { useId, useState } from "react";
import type { Position } from "@/lib/engine/types";
import { SOLO_ME } from "@/lib/solo-queue";
import type { Seat, TeamPerson } from "@/lib/team-lineup";
import type { PlannableStack } from "./use-team-lineup";

/** One row of the picker. */
interface Option {
  id: string;
  name: string;
  meta: string;
  /** What choosing it does, e.g. "Add to Pos 5". */
  action: string;
  disabled: boolean;
}

type Filter = "all" | "friends" | string;

/** "Night Shift · Friend · plays Pos 4, 5", or why they can't bring heroes. */
function describe(p: TeamPerson, seat: Seat | undefined): string {
  const parts = p.stacks.filter((s) => s.role !== "owner").map((s) => s.name);
  if (p.isFriend) parts.push("Friend");
  if (!p.canAdd) parts.push("Not shared with Managers");
  else if (seat) parts.push(`In this lineup at Pos ${seat.position}`);
  else if (!p.shared) parts.push("heroes not shared, planned as any hero");
  else if (p.positions.length) parts.push(`plays Pos ${p.positions.join(", ")}`);
  return parts.join(" · ");
}

/**
 * Who to put in an open seat: a search box over everyone from the Stacks the player runs and their
 * friends, once each, with chips to narrow it. A non-modal popover: Up and Down choose, Enter adds,
 * Escape closes (and only closes this).
 */
export function AddPlayer({
  position,
  people,
  seats,
  stacks,
  onPick,
  onClose,
}: {
  position: Position;
  people: TeamPerson[];
  seats: Seat[];
  stacks: PlannableStack[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);

  const seatOf = (id: string) => seats.find((s) => s.id === id);
  const inFilter = (p: TeamPerson, f: Filter) =>
    f === "all" ? true : f === "friends" ? p.isFriend : p.stacks.some((s) => s.id === f);
  const q = query.trim().toLowerCase();
  const options: Option[] = [
    ...(seatOf(SOLO_ME) || q || filter !== "all"
      ? []
      : [{ id: SOLO_ME, name: "You", meta: "Play this position yourself", action: `Add Me to Pos ${position}`, disabled: false }]),
    ...people
      .filter((p) => inFilter(p, filter) && p.name.toLowerCase().includes(q))
      .map((p) => {
        const seat = seatOf(p.id);
        return {
          id: p.id,
          name: p.name,
          meta: describe(p, seat),
          action: seat ? `Move to Pos ${position}` : `Add to Pos ${position}`,
          disabled: !p.canAdd,
        };
      }),
  ];
  const usable = options.filter((o) => !o.disabled);
  const current = usable[Math.min(active, usable.length - 1)];
  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: people.length },
    ...stacks.map((s) => ({ key: s.id, label: s.name, count: people.filter((p) => inFilter(p, s.id)).length })),
    { key: "friends", label: "Friends", count: people.filter((p) => p.isFriend).length },
  ];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // Closing the picker must not also clear the draft or close anything else.
      e.stopPropagation();
      e.preventDefault();
      return onClose();
    }
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (step && usable.length) {
      e.preventDefault();
      setActive((a) => (Math.min(a, usable.length - 1) + step + usable.length) % usable.length);
    } else if (e.key === "Enter" && current) {
      e.preventDefault();
      onPick(current.id);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Add a player to Pos ${position}`}
      className="flex w-full max-w-lg flex-col gap-2.5 rounded-md bg-surface p-3 shadow-lg ring-1 ring-inset ring-line-strong"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onClose();
      }}
    >
      <input
        // The picker opens to type straight away, like the hero boxes.
        autoFocus
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
        aria-label={`Find a Stack mate or friend for Pos ${position}`}
        placeholder={`Find a Stack mate or friend for Pos ${position}`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        className="field"
      />
      <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={filter === c.key}
            aria-label={`${c.label}, ${c.count} ${c.count === 1 ? "person" : "people"}`}
            onClick={() => {
              setFilter(c.key);
              setActive(0);
            }}
            className="seg-item h-7 gap-1.5"
          >
            {c.label} <span className="num text-subtle">{c.count}</span>
          </button>
        ))}
      </div>
      <ul id={listId} role="listbox" aria-label={`Players for Pos ${position}`} className="flex flex-col">
        {options.map((o) => {
          const on = o === current;
          return (
            <li
              key={o.id}
              id={`${listId}-${o.id}`}
              role="option"
              aria-selected={on}
              aria-disabled={o.disabled || undefined}
              // Keep focus in the search box, so the keyboard path goes on.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => !o.disabled && onPick(o.id)}
              className={`flex min-w-0 items-center gap-2.5 rounded-sm p-2 ${o.disabled ? "text-subtle" : "cursor-pointer hover:bg-hover"} ${on ? "bg-hover" : ""}`}
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-muted ring-1 ring-inset ring-line-hover"
              >
                {o.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate font-semibold ${o.disabled ? "text-muted" : "text-fg"}`}>{o.name}</span>
                <span className="text-xs text-subtle">{o.meta}</span>
              </span>
              {!o.disabled && (
                <span aria-hidden className={`btn btn-sm shrink-0 ${on ? "btn-primary" : "btn-secondary"}`}>
                  {o.action}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {options.length === 0 && (
        <p role="status" className="px-2 text-sm text-muted">
          {people.length ? "Nobody matches that." : "Nobody to add yet. Add friends, or create a Stack, to plan with them."}
        </p>
      )}
      <p className="flex flex-wrap items-center gap-3.5 text-xs text-subtle">
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> choose
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd">Enter</kbd> add
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd">Esc</kbd> close
        </span>
      </p>
    </div>
  );
}
