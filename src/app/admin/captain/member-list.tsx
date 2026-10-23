"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/account-menu";
import { rankName } from "@/lib/rank";
import type { Member } from "./captain-board";

/** Hero name and icon URL; the icon is missing when the hero list couldn't be loaded. */
export interface HeroFace {
  name: string;
  icon?: string;
}

const POSITION_SHORT = ["Carry", "Mid", "Off", "Soft sup", "Hard sup"];
/** Heroes per position shown on a collapsed row. */
const PREVIEW = 3;

/**
 * The team's members as slim rows: who they are, their rank, and their top heroes per position.
 * Clicking a row opens their full pool; removing someone sits in a menu with a confirm step.
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
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const panelId = useId();
  const total = m.positions.reduce((n, p) => n + (m.heroes[p]?.length ?? 0), 0);
  const rank = rankName(m.rankTier);

  return (
    <li>
      <div className={`flex items-center gap-2 pr-2 transition-colors hover:bg-hover/50 ${open ? "bg-hover/30" : ""}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          <svg viewBox="0 0 16 16" aria-hidden className={`h-4 w-4 shrink-0 text-subtle transition-transform ${open ? "rotate-90" : ""}`}>
            <path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <Avatar account={{ name: m.name, avatarUrl: m.avatarUrl, detail: null, steamLinked: !!m.avatarUrl }} size={28} />
          <span className="flex min-w-0 flex-1 flex-col md:w-36 md:flex-none">
            <span className="truncate font-heading text-base font-semibold leading-tight text-fg">{m.name}</span>
            <span className="truncate text-xs text-muted">{rank ?? <span className="text-subtle">No Steam rank</span>}</span>
          </span>
          <span className="hidden min-w-0 flex-1 items-center gap-4 overflow-hidden md:flex">
            {!m.positions.length ? (
              <span className="text-sm text-subtle">No positions yet</span>
            ) : total === 0 ? (
              <span className="text-sm text-subtle">
                Plays <span className="tabular-nums text-muted">{m.positions.join(" ")}</span>, no heroes yet
              </span>
            ) : (
              m.positions.map((p) => (
                <span key={p} className="flex shrink-0 items-center gap-0.5" title={POSITION_SHORT[p - 1]}>
                  <span className="mr-1 text-sm font-semibold tabular-nums text-radiant">{p}</span>
                  {(m.heroes[p] ?? []).length === 0 ? (
                    <span className="text-xs text-subtle">Any</span>
                  ) : (
                    (m.heroes[p] ?? []).slice(0, PREVIEW).map((id) => <HeroIcon key={id} face={hero(id)} />)
                  )}
                </span>
              ))
            )}
          </span>
          <span className="ml-auto shrink-0 font-mono text-xs text-subtle md:hidden">
            {m.positions.length ? `Pos ${m.positions.join(" ")}` : "No positions"}
          </span>
        </button>
        <MemberMenu name={m.name} onRemove={() => setConfirming(true)} />
      </div>

      {confirming && (
        <div role="alert" className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-md bg-dire/10 px-3 py-2 text-sm ring-1 ring-dire-strong">
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

      <div id={panelId} hidden={!open} className="border-t border-line bg-bg/40 px-4 py-3 sm:pl-12">
        {!m.positions.length ? (
          <p className="text-sm text-subtle">Hasn&apos;t picked positions or heroes yet. They set these on My heroes.</p>
        ) : total === 0 ? (
          <p className="text-sm text-subtle">No heroes picked yet, so the draft suggests any hero for their positions.</p>
        ) : (
          <dl className="flex flex-col gap-1.5">
            {m.positions.map((p) => {
              const ids = m.heroes[p] ?? [];
              return (
                <div key={p} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                  <dt className="flex shrink-0 items-center gap-1.5 text-sm text-muted sm:h-7 sm:w-20">
                    <span className="font-semibold tabular-nums text-radiant">{p}</span>
                    {POSITION_SHORT[p - 1]}
                  </dt>
                  <dd className="flex min-w-0 flex-wrap gap-1">
                    {ids.length === 0 && <span className="flex h-7 items-center text-sm text-subtle">Any hero</span>}
                    {ids.map((id) => (
                      <HeroChip key={id} face={hero(id)} record={m.personal[id]} />
                    ))}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </li>
  );
}

/** A hero's square icon, named on hover. Falls back to the name when there's no icon. */
function HeroIcon({ face, decorative }: { face: HeroFace; decorative?: boolean }) {
  if (!face.icon) return <span className="text-xs text-fg">{face.name}</span>;
  return (
    <Image
      src={face.icon}
      alt={decorative ? "" : face.name}
      title={decorative ? undefined : face.name}
      width={24}
      height={24}
      unoptimized
      className="h-6 w-6 shrink-0 rounded-sm bg-raised"
    />
  );
}

/** Icon and name, with the member's record on this hero on hover when known. */
function HeroChip({ face, record }: { face: HeroFace; record?: { games: number; wins: number } }) {
  const title = record?.games
    ? `${face.name}: ${record.games} games, ${((record.wins / record.games) * 100).toFixed(1)}% won`
    : face.name;
  return (
    <span title={title} className="flex h-7 items-center gap-1.5 rounded bg-raised py-0.5 pl-0.5 pr-2 text-sm text-fg ring-1 ring-line-strong">
      {face.icon && <HeroIcon face={face} decorative />}
      {face.name}
    </span>
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
