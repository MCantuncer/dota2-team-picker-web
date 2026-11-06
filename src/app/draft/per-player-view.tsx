"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import { MoveMark, OutsidePool, WeakHere } from "@/components/pick-why";
import { ordinal } from "@/lib/engine/reasons";
import type { Position, ScoreBreakdown, Suggestion } from "@/lib/engine/types";
import { POSITION_NAMES } from "@/lib/party";
import type { PlayerColumn } from "@/lib/per-player";
import { useRankMoves } from "@/lib/pick-explain";
import { reasonRow, type ReasonKind } from "@/lib/reason-rows";

/**
 * Per Player: the planner's view of what each party member who still has to pick should take.
 * One column per player, as wide as the panel allows: a single player gets the whole width, and players sit side
 * by side only when each column still has room. Each hero is a card that opens to show why: every reason the
 * engine found and the score parts behind it. The top hero starts open.
 */
/** A hero's portrait: the 64x36 strip on a card, the 40x22 chip on a Why row. */
type Portrait = (heroId: number, name: string, size?: "strip" | "chip") => ReactNode;
type HeroName = { id: number; name: string };

export function PerPlayerView({
  columns,
  names,
  draftKey,
  heroes,
  portrait,
  onPicked,
  onBanned,
}: {
  columns: PlayerColumn[];
  names: Record<string, string>;
  /** Changes with every pick or ban, so each column can mark heroes that moved. */
  draftKey: string;
  /** Every hero, to put a face on the heroes a reason names. */
  heroes: HeroName[];
  portrait: Portrait;
  onPicked: (heroId: number, position: Position) => void;
  onBanned: (heroId: number) => void;
}) {
  if (!columns.length) return <p className="text-sm text-muted">Everyone in the party has a hero.</p>;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-x-8 gap-y-8">
      {columns.map((c) => (
        <Column
          key={`${c.playerId}:${c.position}`}
          column={c}
          name={names[c.playerId] ?? "Unnamed"}
          draftKey={draftKey}
          heroes={heroes}
          portrait={portrait}
          onPicked={onPicked}
          onBanned={onBanned}
        />
      ))}
    </div>
  );
}

function Column({
  column: c,
  name,
  draftKey,
  heroes,
  portrait,
  onPicked,
  onBanned,
}: {
  column: PlayerColumn;
  name: string;
  draftKey: string;
  heroes: HeroName[];
  portrait: Portrait;
  onPicked: (heroId: number, position: Position) => void;
  onBanned: (heroId: number) => void;
}) {
  const moves = useRankMoves(
    c.suggestions.map((s) => s.heroId),
    draftKey,
    `${c.playerId}:${c.position}`,
  );
  const headingId = `per-player-${c.playerId}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col">
      <h3 id={headingId} className="flex items-baseline gap-2 pb-2 font-semibold text-fg">
        <span className="truncate">{name}</span>{" "}
        <span className="num text-sm font-normal text-subtle">
          Pos {c.position} {POSITION_NAMES[c.position]}
        </span>
      </h3>
      <ol aria-label={`Suggested heroes for ${name}`} className="flex flex-col">
        {c.suggestions.map((s, i) => (
          <HeroCard
            // A new top hero after a pick or ban starts open again.
            key={`${s.heroId}:${i === 0}`}
            suggestion={s}
            top={i === 0}
            playerName={name}
            portrait={portrait(s.heroId, s.name)}
            face={(id) => {
              const heroName = heroes.find((h) => h.id === id)?.name ?? "";
              // The name on hover; screen readers get it from the row's line.
              return (
                <span title={heroName} className="block">
                  {portrait(id, heroName, "chip")}
                </span>
              );
            }}
            heroes={heroes}
            badges={
              <>
                <MoveMark move={moves.get(s.heroId)} />
                {c.outside.has(s.heroId) && <OutsidePool title={`Not one of ${name}'s heroes for this position`} />}
                {c.weak.has(s.heroId) && <WeakHere />}
              </>
            }
            onPicked={() => onPicked(s.heroId, c.position)}
            onBanned={() => onBanned(s.heroId)}
          />
        ))}
      </ol>
    </section>
  );
}

/**
 * One suggested hero. Closed, it is a hairline row with the main reason; open, it shows every reason and a bar per
 * score part, so the planner sees why at a glance instead of reading a paragraph.
 */
function HeroCard({
  suggestion: s,
  top,
  playerName,
  portrait,
  face,
  heroes,
  badges,
  onPicked,
  onBanned,
}: {
  suggestion: Suggestion;
  top: boolean;
  playerName: string;
  portrait: ReactNode;
  face: (heroId: number) => ReactNode;
  heroes: HeroName[];
  badges: ReactNode;
  onPicked: () => void;
  onBanned: () => void;
}) {
  const [open, setOpen] = useState(top);
  const panelId = useId();
  const actions = (
    <>
      <button
        onClick={onPicked}
        aria-label={`Picked ${s.name} for ${playerName}`}
        className={`btn btn-sm ${top ? "btn-primary" : "btn-secondary"}`}
      >
        <Icon name="check" />
        Picked
      </button>
      <button
        onClick={onBanned}
        aria-label={`Banned ${s.name}`}
        className="btn btn-secondary btn-sm"
      >
        <Icon name="ban" />
        Banned
      </button>
    </>
  );

  return (
    <li className={`border-t border-line ${open ? "bg-surface" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-3 text-left hover:bg-hover"
      >
        {portrait}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={`flex flex-wrap items-center gap-2 font-semibold ${top ? "text-accent" : "text-fg"}`}>
            {s.name}
            {badges}
          </span>
          {!open && s.reasons[0] && <span className="truncate text-sm text-muted">{s.reasons[0]}</span>}
        </span>
        <span className="flex items-center gap-2">
          <span className="num w-12 text-right text-sm text-fg" title="Score in win-rate points">
            {signed(s.score)}
          </span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className={`size-4 shrink-0 text-subtle transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* The panel stays in the page for aria-controls; its content mounts only while open. */}
      <div id={panelId} hidden={!open} className="@container px-2 pb-4">
        {open && (
          <>
            <div className="grid gap-x-6 gap-y-4 sm:pl-[4.75rem] @lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-2">
                <h4 className="text-xs text-subtle">Why</h4>
                <ul className="flex flex-col gap-1">
                  {s.reasons.map((r) => (
                    <Reason key={r} row={reasonRow(r, heroes, s.breakdown)} face={face} />
                  ))}
                </ul>
                {s.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span key={t} className="chip text-xs">
                        {t}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              <ScoreParts breakdown={s.breakdown} place={s.place} />
            </div>
            <div className="mt-4 flex gap-1.5 sm:pl-[4.75rem]">{actions}</div>
          </>
        )}
      </div>
    </li>
  );
}

/** Faces shown on a Why row; the line still names every hero. */
const MAX_FACES = 3;

const KIND_ICONS: Record<ReasonKind, IconName> = {
  Counters: "swords",
  Synergy: "users",
  Meta: "trend",
  "Team Needs": "plus",
  Flex: "shuffle",
  "Pick Safety": "shield",
  "Pick Order": "clock",
  "Watch Out": "alert",
  Draft: "check",
};

/**
 * A reason as a row: the faces of the heroes it names (or the score part's icon when it names none), the part and
 * the line, and its points on the right. A warning row is amber.
 */
function Reason({ row, face }: { row: ReturnType<typeof reasonRow>; face: (heroId: number) => ReactNode }) {
  const faces = row.heroIds.slice(0, MAX_FACES);
  const more = row.heroIds.length - faces.length;
  return (
    <li
      className={`grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-sm py-1.5 pl-1.5 pr-3 ${
        row.warn ? "bg-warn-tint" : "bg-raised"
      }`}
    >
      {faces.length ? (
        // Named heroes overlap like a stack, so every row's text starts at the same place; past three, a +N badge.
        <span className="relative flex w-[5.5rem]">
          {faces.map((id, n) => (
            <span
              key={id}
              className={n ? `-ml-4 rounded-xs ring-2 ${row.warn ? "ring-warn-tint" : "ring-raised"}` : ""}
            >
              {face(id)}
            </span>
          ))}
          {more > 0 && (
            <span
              className="micro absolute -bottom-1 -right-1 rounded-xs bg-hover-strong px-1 text-fg"
              title={`${more} more`}
            >
              +{more}
            </span>
          )}
        </span>
      ) : (
        <span
          className={`flex h-5.5 w-10 items-center justify-center rounded-xs bg-hover ${row.warn ? "text-warn" : "text-radiant"}`}
        >
          <Icon name={KIND_ICONS[row.kind]} />
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className={`micro flex items-center gap-1 ${row.warn ? "text-warn" : "text-subtle"}`}>
          {faces.length > 0 && <Icon name={KIND_ICONS[row.kind]} />}
          {row.kind}
        </span>
        <span className={`text-sm ${row.warn ? "text-warn" : "text-fg/90"}`}>{row.text}</span>
      </span>
      {row.points !== null && (
        <span className={`num ${row.points >= 0 && !row.warn ? "text-radiant" : "text-warn"}`}>
          {signed(row.points)}
        </span>
      )}
    </li>
  );
}

const PART_NAMES: Record<keyof ScoreBreakdown, string> = {
  counter: "Counters",
  synergy: "Synergy",
  meta: "Meta",
  positionFit: "Role Fit",
  teamNeeds: "Team Needs",
  comfort: "Comfort",
  flex: "Flex",
  pickSafety: "Pick Safety",
};

/** One bar per score part that moves the score, biggest first, on a shared scale. */
function ScoreParts({ breakdown, place }: { breakdown?: ScoreBreakdown; place?: { rank: number; of: number } }) {
  if (!breakdown) return null;
  const parts = (Object.keys(PART_NAMES) as (keyof ScoreBreakdown)[])
    .map((k) => ({ k, v: breakdown[k] }))
    .filter((p) => Math.abs(p.v) >= 0.05)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  if (!parts.length) return null;
  const max = Math.max(...parts.map((p) => Math.abs(p.v)));
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs text-subtle">
        Score Parts
        {place && place.rank > 0 && (
          <span>
            {" "}
            · {ordinal(place.rank)} of {place.of} here
          </span>
        )}
      </h4>
      <ul className="flex flex-col gap-1.5">
        {parts.map((p) => (
          <li key={p.k} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs">
            <span className="text-muted">{PART_NAMES[p.k]}</span>
            <span className="h-1.5 rounded-full bg-raised">
              <span
                className={`block h-full rounded-full ${p.v >= 0 ? "bg-radiant" : "bg-dire"}`}
                style={{
                  width: `${Math.max(4, (Math.abs(p.v) / max) * 100)}%`,
                }}
              />
            </span>
            <span className={`num text-right ${p.v >= 0 ? "text-fg" : "text-dire"}`}>{signed(p.v)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const signed = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}`;
