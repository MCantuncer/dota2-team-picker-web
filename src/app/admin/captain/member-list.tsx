"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/account-menu";
import { rankName } from "@/lib/rank";
import type { Member } from "./captain-board";

/** Hero name and portrait URL; the portrait is missing when the hero list couldn't be loaded. */
export interface HeroFace {
  name: string;
  image?: string;
}

const POSITION_SHORT = ["Carry", "Mid", "Off", "Soft sup", "Hard sup"];
/** Portraits shown per position before the "+N" button. One line at the board's width. */
const COLLAPSED = 10;

/**
 * The team's members as compact rows: who they are, which positions they play, and their heroes
 * per position as portraits. Long pools fold behind "+N"; removing someone sits in a menu with a confirm step.
 */
export function MemberList({
  members,
  hero,
  onRemove,
}: {
  members: Member[];
  hero: (id: number) => HeroFace;
  onRemove: (m: Member) => void;
}) {
  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-2">
      <h2 id="members-heading" className="text-sm font-semibold uppercase tracking-wider">
        Members <span className="font-mono text-xs text-subtle">{members.length}</span>
      </h2>
      {members.length ? (
        <ul className="card divide-y divide-line">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} hero={hero} onRemove={() => onRemove(m)} />
          ))}
        </ul>
      ) : (
        <p className="card p-4 text-sm text-muted">Nobody has joined yet. Invited friends show up here once they accept.</p>
      )}
    </section>
  );
}

function MemberRow({ member: m, hero, onRemove }: { member: Member; hero: (id: number) => HeroFace; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const total = m.positions.reduce((n, p) => n + (m.heroes[p]?.length ?? 0), 0);
  const rank = rankName(m.rankTier);
  const foldable = m.positions.some((p) => (m.heroes[p]?.length ?? 0) > COLLAPSED);

  return (
    <li className="flex flex-col gap-2.5 px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar account={{ name: m.name, avatarUrl: m.avatarUrl, detail: null, steamLinked: !!m.avatarUrl }} size={36} />
        <div className="mr-auto min-w-0">
          <div className="truncate font-heading text-lg font-semibold leading-tight text-fg">{m.name}</div>
          <div className="truncate text-xs text-muted">
            {rank ?? <span className="text-subtle">No Steam rank</span>}
            {total > 0 && <span className="text-subtle"> · {total} heroes</span>}
          </div>
        </div>
        <PositionPips positions={m.positions} />
        <MemberMenu name={m.name} onRemove={() => setConfirming(true)} />
      </div>

      {confirming && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md bg-dire/10 px-3 py-2 text-sm ring-1 ring-dire-strong">
          <span className="mr-auto">
            Remove <strong>{m.name}</strong> from the team? They&apos;ll need a new invite to come back.
          </span>
          <button type="button" onClick={onRemove} className="btn btn-danger btn-sm">
            Remove
          </button>
          <button type="button" autoFocus onClick={() => setConfirming(false)} className="btn btn-secondary btn-sm">
            Cancel
          </button>
        </div>
      )}

      {!m.positions.length ? (
        <p className="text-sm text-subtle">Hasn&apos;t picked positions or heroes yet. They set these on My heroes.</p>
      ) : total === 0 ? (
        <p className="text-sm text-subtle">No heroes picked yet, so the draft suggests any hero for their positions.</p>
      ) : (
        <dl className="flex flex-col gap-1.5">
          {m.positions.map((p) => {
            const ids = m.heroes[p] ?? [];
            const shown = expanded ? ids : ids.slice(0, COLLAPSED);
            return (
              <div key={p} className="flex items-start gap-3">
                <dt className="flex h-7 w-20 shrink-0 items-center gap-1.5 text-sm text-muted">
                  <span className="font-semibold tabular-nums text-radiant">{p}</span>
                  {POSITION_SHORT[p - 1]}
                </dt>
                <dd className="flex min-w-0 flex-wrap gap-1">
                  {ids.length === 0 && <span className="flex h-7 items-center text-sm text-subtle">Any hero</span>}
                  {shown.map((id) => (
                    <Portrait key={id} face={hero(id)} record={m.personal[id]} />
                  ))}
                  {!expanded && ids.length > COLLAPSED && (
                    <button
                      type="button"
                      onClick={() => setExpanded(true)}
                      aria-expanded={false}
                      aria-label={`Show all ${ids.length} ${POSITION_SHORT[p - 1]} heroes for ${m.name}`}
                      className="flex h-7 min-w-12 items-center justify-center rounded-sm bg-raised px-1.5 font-mono text-xs text-muted ring-1 ring-line-strong hover:bg-hover hover:text-fg"
                    >
                      +{ids.length - COLLAPSED}
                    </button>
                  )}
                </dd>
              </div>
            );
          })}
          {expanded && foldable && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-expanded
              className="link ml-23 self-start text-xs"
            >
              Show less
            </button>
          )}
        </dl>
      )}
    </li>
  );
}

/** The five positions as small squares, lit for the ones the member plays. */
function PositionPips({ positions }: { positions: number[] }) {
  if (!positions.length) return null;
  return (
    <div role="img" aria-label={`Plays position ${positions.join(", ")}`} className="hidden gap-0.5 sm:flex">
      {[1, 2, 3, 4, 5].map((p) => {
        const on = positions.includes(p);
        return (
          <span
            key={p}
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-sm font-mono text-[11px] ${
              on ? "bg-radiant/15 text-radiant ring-1 ring-radiant-strong" : "text-subtle/60 ring-1 ring-line"
            }`}
          >
            {p}
          </span>
        );
      })}
    </div>
  );
}

/** A hero portrait at the client's 16:9 ratio, named on hover, with the member's record when known. */
function Portrait({ face, record }: { face: HeroFace; record?: { games: number; wins: number } }) {
  const label = record?.games
    ? `${face.name}: ${record.games} games, ${((record.wins / record.games) * 100).toFixed(1)}% won`
    : face.name;
  if (!face.image) {
    return (
      <span title={label} className="flex h-7 items-center rounded-sm bg-raised px-2 text-xs text-fg ring-1 ring-line-strong">
        {face.name}
      </span>
    );
  }
  return (
    <Image
      src={face.image}
      alt={face.name}
      title={label}
      width={48}
      height={27}
      unoptimized
      className="h-7 w-auto rounded-sm bg-raised object-cover ring-1 ring-black/40"
    />
  );
}

/** The "more" button on a member row (the WAI-ARIA menu button pattern). */
function MemberMenu({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    itemRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`More for ${name}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`btn btn-ghost btn-sm w-8 px-0 ${open ? "bg-raised text-fg" : ""}`}
      >
        <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4">
          <circle cx="3" cy="8" r="1.4" fill="currentColor" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
          <circle cx="13" cy="8" r="1.4" fill="currentColor" />
        </svg>
      </button>
      <div
        id={menuId}
        role="menu"
        aria-label={`Actions for ${name}`}
        hidden={!open}
        onKeyDown={onMenuKey}
        className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-line-strong bg-surface p-1 shadow-xl shadow-black/40"
      >
        <button
          ref={itemRef}
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onRemove();
          }}
          className="flex w-full items-center rounded px-2.5 py-2 text-left text-sm text-dire outline-none hover:bg-hover focus-visible:bg-hover"
        >
          Remove from team
        </button>
      </div>
    </div>
  );
}
