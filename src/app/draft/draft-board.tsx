"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeroInput } from "@/components/hero-input";
import { Kbd } from "@/components/kbd";
import { applyAction, heroesOf, TEAM_SIZE, type DraftAction, type DraftEntry } from "@/lib/draft";
import { Engine } from "@/lib/engine/score";
import { loadSnapshot } from "@/lib/engine/snapshot";
import { POSITIONS, type GamesWins, type HeroInfo, type Position, type RankBracket, type Suggestion } from "@/lib/engine/types";
import { HeroSearch } from "@/lib/hero-search";
import { pickGain, teamWinChance } from "@/lib/win";

/** What the signed-in player brings to their suggestions. Empty when signed out. */
export interface Player {
  /** Favorite heroes per position; 0 holds heroes for any position. */
  heroes: Record<number, number[]>;
  positions: Position[];
  rank: RankBracket | null;
  personal: Record<number, GamesWins>;
}

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"];
const RANKS = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];
const DRAFT_KEY = "solo-draft";
const POSITION_KEY = "solo-draft-position";
const NOTICE = { enemy: "notice-error", open: "notice-warn", out: "notice-done" } as const;

/** A signed score with one decimal and a real minus sign. */
const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}`;

function readStorage<T>(key: string, valid: (v: unknown) => v is T): T | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return valid(v) ? v : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not keeping the draft in this browser is fine.
  }
}

const isPosition = (v: unknown): v is Position => POSITIONS.includes(v as Position);
const isDraft = (v: unknown): v is DraftEntry[] =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      Number.isInteger(e?.heroId) && ["ally", "enemy", "ban"].includes(e?.kind) && (e?.position === null || isPosition(e?.position)),
  );

/** One player's draft: both teams and bans typed in as they happen, and 8 heroes for your position. */
export function DraftBoard({ player, portraits, signedIn }: { player: Player; portraits: Record<number, string>; signedIn: boolean }) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEntry[]>([]);
  const [history, setHistory] = useState<DraftEntry[][]>([]);
  const [myPosition, setMyPosition] = useState<Position>(player.positions[0] ?? 1);
  const [rank, setRank] = useState<RankBracket | null>(player.rank);
  const allyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSnapshot()
      .then((s) => {
        setDraft(readStorage(DRAFT_KEY, isDraft) ?? []);
        const saved = readStorage(POSITION_KEY, isPosition);
        if (saved) setMyPosition(saved);
        setEngine(new Engine(s));
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const search = useMemo(() => {
    if (!engine) return null;
    const picks = (id: number) => (engine.data.bracketStats[id]?.picks ?? []).reduce((s, x) => s + x, 0);
    return new HeroSearch(engine.heroes, picks);
  }, [engine]);

  const allies = draft.filter((e) => e.kind === "ally");
  const enemies = heroesOf(draft, "enemy");
  const bans = heroesOf(draft, "ban");
  const mine = allies.find((e) => e.position === myPosition);

  // Typing stays inside each search box, so this runs only when the draft or a setting changes.
  const suggestions =
    engine && !mine
      ? engine.suggest({
          myPosition,
          allies: allies.map((e) => ({ heroId: e.heroId, position: e.position ?? undefined })),
          enemies,
          bans,
          rankBracket: rank ?? undefined,
          favorites: [...(player.heroes[myPosition] ?? []), ...(player.heroes[0] ?? [])],
          personal: player.personal,
          count: 8,
        })
      : [];

  const allyIds = allies.map((e) => e.heroId);
  const bracket = rank ?? undefined;
  const chance = engine ? teamWinChance(engine, allyIds, enemies, bracket) : null;

  const change = (next: DraftEntry[]) => {
    if (next === draft) return;
    setHistory((h) => [...h.slice(-49), draft]);
    setDraft(next);
    writeStorage(DRAFT_KEY, next);
  };
  const act = (...actions: DraftAction[]) => change(actions.reduce(applyAction, draft));
  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setDraft(prev);
    writeStorage(DRAFT_KEY, prev);
  };
  const choosePosition = (p: Position) => {
    setMyPosition(p);
    writeStorage(POSITION_KEY, p);
  };

  if (loadError) return <p className="notice notice-error">{loadError}. Reload the page to try again.</p>;
  if (!engine || !search) return <p className="text-sm text-muted">Loading hero data…</p>;

  const taken = new Set(draft.map((e) => e.heroId));
  const hero = (id: number) => engine.hero(id);
  const lastOf = (kind: DraftEntry["kind"]) => draft.filter((e) => e.kind === kind).at(-1)?.heroId;
  const undoLast = (kind: DraftEntry["kind"]) => {
    const id = lastOf(kind);
    if (id != null) act({ kind: "remove", heroId: id });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4">
        <h1 className="page-title">Draft</h1>
        <div className="flex items-center gap-2">
          <span className="label-caps" id="my-position">
            I play
          </span>
          <div className="seg" role="group" aria-labelledby="my-position">
            {POSITIONS.map((p) => (
              <button key={p} aria-pressed={myPosition === p} title={POSITION_NAMES[p - 1]} onClick={() => choosePosition(p)} className="seg-item">
                Pos {p}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="label-caps">Rank</span>
          <select
            value={rank ?? ""}
            onChange={(e) => setRank(e.target.value ? (Number(e.target.value) as RankBracket) : null)}
            className="field btn-sm"
          >
            <option value="">All ranks</option>
            {RANKS.map((r, i) => (
              <option key={r} value={i + 1}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={undo} disabled={!history.length} className="btn btn-ghost btn-sm">
            Undo
          </button>
          <button
            onClick={() => {
              change([]);
              allyRef.current?.focus();
            }}
            disabled={!draft.length}
            className="btn btn-secondary btn-sm"
          >
            New draft
          </button>
        </div>
      </div>

      <p className="text-xs text-subtle">
        Type 2 or 3 letters and press <Kbd>Enter</Kbd>; <Kbd>Tab</Kbd> moves to the next box. Add a digit for an ally&apos;s
        position (<span className="text-muted">cm5</span>). <Kbd>Backspace</Kbd> in an empty box takes the last hero back out.
        {!signedIn && (
          <>
            {" "}
            <Link href="/login?next=/draft" className="link">
              Sign in
            </Link>{" "}
            to use your own heroes and rank.
          </>
        )}
      </p>

      {chance !== null && <WinBar chance={chance} />}

      <div className="grid gap-4 md:grid-cols-2">
        <TeamPanel title="My team" side="radiant" count={allies.length}>
          {allies.length < TEAM_SIZE && (
            <HeroInput
              id="ally"
              inputRef={allyRef}
              placeholder="My team pick, e.g. cm5"
              search={search}
              exclude={taken}
              withPosition
              onPick={(heroId, position) => act({ kind: "ally", heroId, position })}
              onUndo={() => undoLast("ally")}
            />
          )}
          <Slots>
            {allies.map((e) => (
              <Slot key={e.heroId} hero={hero(e.heroId)} portrait={portraits[e.heroId]} onRemove={() => act({ kind: "remove", heroId: e.heroId })}>
                <button
                  onClick={() => act({ kind: "ally", heroId: e.heroId, position: e.position === 5 ? null : (((e.position ?? 0) + 1) as Position) })}
                  aria-label={`${hero(e.heroId).name} position: ${e.position ?? "not set"}. Change`}
                  className={`chip micro ${e.position === myPosition ? "chip-accent" : ""}`}
                >
                  Pos {e.position ?? "?"}
                </button>
              </Slot>
            ))}
          </Slots>
        </TeamPanel>

        <TeamPanel title="Enemy" side="dire" count={enemies.length}>
          {enemies.length < TEAM_SIZE && (
            <HeroInput
              id="enemy"
              placeholder="Enemy pick"
              search={search}
              exclude={taken}
              onPick={(heroId) => act({ kind: "enemy", heroId })}
              onUndo={() => undoLast("enemy")}
            />
          )}
          <Slots>
            {enemies.map((id) => (
              <Slot key={id} hero={hero(id)} portrait={portraits[id]} onRemove={() => act({ kind: "remove", heroId: id })} />
            ))}
          </Slots>
        </TeamPanel>
      </div>

      <section aria-labelledby="bans-title" className="card flex flex-col gap-3 p-4">
        <h2 id="bans-title" className="section-title">
          Bans <span className="num text-subtle">{bans.length}</span>
        </h2>
        <HeroInput
          id="bans"
          placeholder="Bans, several at once: pa sf am"
          search={search}
          exclude={taken}
          multi
          onPick={(heroId) => act({ kind: "ban", heroId })}
          onPickMany={(ids) => act(...ids.map((heroId) => ({ kind: "ban" as const, heroId })))}
          onUndo={() => undoLast("ban")}
        />
        {bans.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {bans.map((id) => (
              <li key={id}>
                <button onClick={() => act({ kind: "remove", heroId: id })} aria-label={`Unban ${hero(id).name}`} title={hero(id).name}>
                  <Portrait hero={hero(id)} src={portraits[id]} size="strip" banned />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="picks-title" className="flex flex-col gap-3">
        <h2 id="picks-title" className="section-title">
          Picks for pos {myPosition} <span className="text-muted">{POSITION_NAMES[myPosition - 1]}</span>
        </h2>
        {mine ? (
          <p className="text-sm text-muted">
            You&apos;re on <span className="text-fg">{hero(mine.heroId).name}</span>. Good luck!
          </p>
        ) : (
          <ol aria-label="Suggested heroes" className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={s.heroId}
                suggestion={s}
                portrait={portraits[s.heroId]}
                best={i === 0}
                gain={pickGain(engine, s.heroId, allyIds, enemies, bracket)}
                onPicked={() => act({ kind: "ally", heroId: s.heroId, position: myPosition })}
                onBanned={() => act({ kind: "ban", heroId: s.heroId })}
              />
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

/** My team's win chance against the enemy's as one split bar. Shown only with a checked model. */
function WinBar({ chance }: { chance: number }) {
  const pct = (chance * 100).toFixed(1);
  return (
    <section aria-label="Win chance" className="card flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between text-sm">
        <span>
          <span className="label-caps">Win chance</span> <span className="num text-radiant">{pct}%</span>
        </span>
        <span>
          <span className="label-caps">Enemy</span> <span className="num text-dire">{(100 - chance * 100).toFixed(1)}%</span>
        </span>
      </div>
      <div aria-hidden className="flex h-2 overflow-hidden rounded-xs bg-dire-strong">
        <div className="bg-radiant-strong" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function TeamPanel({ title, side, count, children }: { title: string; side: "radiant" | "dire"; count: number; children: React.ReactNode }) {
  return (
    <section
      aria-label={title}
      className={`card flex flex-col gap-3 border-t-3 p-4 ${side === "radiant" ? "border-t-radiant-strong" : "border-t-dire-strong"}`}
    >
      <h2 className={`section-title ${side === "radiant" ? "text-radiant" : "text-dire"}`}>
        {title} <span className="num text-subtle">{count}/5</span>
      </h2>
      {children}
    </section>
  );
}

/** The team's five slots: picks in order, then empty ones. */
function Slots({ children }: { children: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {children}
      {Array.from({ length: TEAM_SIZE - children.length }, (_, i) => (
        <li key={`empty-${i}`} aria-hidden className="h-11 rounded-md border border-dashed border-line" />
      ))}
    </ul>
  );
}

function Slot({ hero, portrait, onRemove, children }: { hero: HeroInfo; portrait?: string; onRemove: () => void; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-md bg-raised p-1 pr-2">
      <Portrait hero={hero} src={portrait} size="strip" />
      <span className="font-heading text-base font-semibold">{hero.name}</span>
      <span className="ml-auto flex items-center gap-2">
        {children}
        <button onClick={onRemove} aria-label={`Remove ${hero.name}`} className="btn btn-icon btn-sm text-muted">
          ×
        </button>
      </span>
    </li>
  );
}

const SIZES = {
  strip: { w: 64, h: 36, className: "h-9 w-16" },
  card: { w: 112, h: 63, className: "h-15.75 w-28" },
};

/** A hero's 16:9 portrait, or a slate tile with the name when the art is missing. */
function Portrait({ hero, src, size, banned }: { hero: HeroInfo; src?: string; size: keyof typeof SIZES; banned?: boolean }) {
  const s = SIZES[size];
  const look = `${s.className} shrink-0 rounded-xs object-cover ${banned ? "opacity-50 grayscale" : ""}`;
  if (!src) return <span className={`${look} micro flex items-center justify-center bg-raised p-1 text-center text-muted`}>{hero.name}</span>;
  return <Image src={src} alt="" width={s.w} height={s.h} className={look} />;
}

function SuggestionCard({
  suggestion: s,
  portrait,
  best,
  gain,
  onPicked,
  onBanned,
}: {
  suggestion: Suggestion;
  portrait?: string;
  best: boolean;
  /** Change in my team's win chance, in points, when it is known. */
  gain: number | null;
  onPicked: () => void;
  onBanned: () => void;
}) {
  const hero = { id: s.heroId, name: s.name } as HeroInfo;
  return (
    <li className={`card flex flex-col gap-2 p-3 ${best ? "ring-2 ring-accent" : ""}`}>
      <div className="flex items-start gap-3">
        <Portrait hero={hero} src={portrait} size="card" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-heading text-xl font-bold leading-6">{s.name}</span>
          <span className="flex items-center gap-2">
            <span className="num text-muted" title="Score in win-rate points">
              {signed(s.score)}
            </span>
            {gain !== null && (
              <span className={`num ${gain < 0 ? "text-dire" : "text-radiant"}`} title="Change in your team's win chance">
                {signed(gain)}%
              </span>
            )}
            {best && <span className="chip chip-accent micro">Best</span>}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-0.5 text-sm">
        {s.reasons.slice(0, 2).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {s.hardCounters.map((n) => (
        <p key={n.counterId} className={`notice ${NOTICE[n.status]} text-xs`}>
          {n.text}
        </p>
      ))}
      <div className="mt-auto flex gap-2 pt-1">
        <button onClick={onPicked} className="btn btn-primary btn-sm">
          Picked
        </button>
        <button onClick={onBanned} className="btn btn-secondary btn-sm">
          Banned
        </button>
      </div>
    </li>
  );
}
