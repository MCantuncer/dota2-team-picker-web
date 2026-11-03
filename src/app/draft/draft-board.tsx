"use client";

import Image from "next/image";
import { Icon } from "@/components/icon";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameStoryPanel } from "@/components/game-story-panel";
import { MoveMark, PickWhy } from "@/components/pick-why";
import { HeroInput } from "@/components/hero-input";
import { readActions } from "@/lib/draft-reader/actions";
import { Kbd } from "@/components/kbd";
import { applyAction, heroesOf, TEAM_SIZE, type DraftAction, type DraftEntry } from "@/lib/draft";
import { Engine } from "@/lib/engine/score";
import { loadSnapshot } from "@/lib/engine/snapshot";
import { POSITIONS, type GamesWins, type HeroInfo, type Position, type RankBracket, type Suggestion } from "@/lib/engine/types";
import { finishedDraftPlan } from "@/lib/game-plan";
import { HeroSearch } from "@/lib/hero-search";
import { pickGain, teamWinChance } from "@/lib/win";
import { poolFirst, reactingTo, useRankMoves } from "@/lib/pick-explain";
import { planTeam } from "@/lib/engine/plan";
import type { Party } from "@/lib/party";
import { toPlanSlots, type PlanMember } from "@/lib/party-plan";
import { AfterGame } from "./after-game";
import { Announcer, picksSentence } from "./announcer";
import { DraftCaptainBar } from "./draft-captain-bar";
import { PartyPlan } from "./party-plan";
import { ScreenshotPaste } from "./screenshot-paste";
import { useLiveParty } from "./use-live-party";
import { usePartyDraft } from "./use-party-draft";

/** What the signed-in player brings to their suggestions. Empty when signed out. */
export interface Player {
  /** Favorite heroes per position; 0 holds heroes for any position. */
  heroes: Record<number, number[]>;
  positions: Position[];
  rank: RankBracket | null;
  personal: Record<number, GamesWins>;
}

/** The signed-in player's party, when they are in one: its draft is shared by everyone in it. */
export interface PartyInfo {
  id: string;
  userId: string;
  /** Display names by user id, to show who entered each hero. */
  names: Record<string, string>;
  /** The position the player chose in the party lobby. */
  myPosition: Position | null;
  /** Everyone in the party with their lobby position, for the team plan. */
  members: PlanMember[];
  /** The party as the page loaded it; the screen keeps it live for the draft captain. */
  party: Party;
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

/**
 * One player's draft: both teams and bans typed in as they happen, and 8 heroes for your position.
 * In a party, the draft is shared live with the party and each player gets picks for their own position.
 */
export function DraftBoard({
  player,
  portraits,
  icons,
  signedIn,
  party,
}: {
  player: Player;
  portraits: Record<number, string>;
  /** Small square hero icons, for the game plan. */
  icons: Record<number, string>;
  signedIn: boolean;
  party: PartyInfo | null;
}) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [soloDraft, setSoloDraft] = useState<DraftEntry[]>([]);
  const [history, setHistory] = useState<DraftEntry[][]>([]);
  const [myPosition, setMyPosition] = useState<Position>(party?.myPosition ?? player.positions[0] ?? 1);
  const shared = usePartyDraft(party?.id ?? null, party?.userId ?? null);
  const live = useLiveParty(party?.party ?? null, party?.userId ?? null);
  // The party's favorite heroes, only for whoever plans the team (the captain, or the leader).
  const pool = party ? live.pool : null;
  const captainId = party ? (live.party?.captain.id ?? null) : null;
  // With a draft captain, only they enter the draft; everyone else watches it fill in.
  const locked = captainId !== null && captainId !== party?.userId;
  const captainName = captainId ? (live.party?.members.find((m) => m.id === captainId)?.name ?? "The captain") : null;
  const [view, setView] = useState<"mine" | "team">("mine");
  const draft = party ? shared.draft : soloDraft;
  const [rank, setRank] = useState<RankBracket | null>(player.rank);
  const allyRef = useRef<HTMLInputElement>(null);
  const bansRef = useRef<HTMLInputElement>(null);
  const picksTitleRef = useRef<HTMLHeadingElement>(null);
  /**
   * After Picked or Banned removes a card, keep the keyboard path: back to the box for that kind of entry. The My
   * team box is gone once the team is full, so fall back to the picks heading.
   */
  const refocus = (box: "ally" | "bans") =>
    requestAnimationFrame(() => ((box === "ally" ? allyRef.current : bansRef.current) ?? picksTitleRef.current)?.focus());

  useEffect(() => {
    loadSnapshot()
      .then((s) => {
        setSoloDraft(readStorage(DRAFT_KEY, isDraft) ?? []);
        const saved = readStorage(POSITION_KEY, isPosition);
        if (saved && !party?.myPosition) setMyPosition(saved);
        setEngine(new Engine(s));
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [party?.myPosition]);

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
  // Your heroes for the position come first, then the best few outside your pool.
  const favorites = [...(player.heroes[myPosition] ?? []), ...(player.heroes[0] ?? [])];
  const ranked =
    engine && !mine
      ? engine.suggest({
          myPosition,
          allies: allies.map((e) => ({ heroId: e.heroId, position: e.position ?? undefined })),
          enemies,
          bans,
          rankBracket: rank ?? undefined,
          favorites,
          personal: player.personal,
          count: engine.heroes.length,
        })
      : [];
  const { list: suggestions, outside } = poolFirst(ranked, new Set(favorites));

  const allyIds = allies.map((e) => e.heroId);
  const moves = useRankMoves(
    suggestions.map((s) => s.heroId),
    JSON.stringify([allyIds, enemies, bans]),
    String(myPosition),
  );
  const bracket = rank ?? undefined;
  const chance = engine ? teamWinChance(engine, allyIds, enemies, bracket) : null;

  // In a party, save the list this player sees once it settles, for the after-game card and
  // reports. The list as a string, so a re-render with the same list saves nothing.
  const shown =
    party && suggestions.length
      ? JSON.stringify({
          heroes: suggestions.map((s) => s.heroId),
          scores: suggestions.map((s) => Math.round(s.score * 100) / 100),
          chance: chance === null ? null : Math.round(chance * 1000) / 1000,
        })
      : null;
  const { saveSuggestions } = shared;
  useEffect(() => {
    if (!shown) return;
    const { heroes, scores, chance } = JSON.parse(shown) as { heroes: number[]; scores: number[]; chance: number | null };
    const timer = setTimeout(() => void saveSuggestions(myPosition, heroes, scores, chance), 1500);
    return () => clearTimeout(timer);
  }, [shown, myPosition, saveSuggestions]);

  const change = (next: DraftEntry[]) => {
    if (next === soloDraft) return;
    setHistory((h) => [...h.slice(-49), soloDraft]);
    setSoloDraft(next);
    writeStorage(DRAFT_KEY, next);
  };
  const act = (...actions: DraftAction[]) => {
    if (locked) return;
    if (party) void shared.act(actions);
    else change(actions.reduce(applyAction, soloDraft));
  };
  // In a party, Undo takes back your own latest entry; the rest of the party keeps theirs.
  const canUndo = party ? shared.lastMine !== null : history.length > 0;
  const undo = () => {
    if (party) {
      if (shared.lastMine !== null) act({ kind: "remove", heroId: shared.lastMine });
      return;
    }
    const prev = history.at(-1);
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setSoloDraft(prev);
    writeStorage(DRAFT_KEY, prev);
  };
  const startOver = () => {
    if (party) void shared.newDraft();
    else change([]);
  };
  /** Who entered a hero in the party draft. */
  const enteredBy = (heroId: number) => {
    const actor = party ? shared.actors.get(heroId) : undefined;
    if (!party || !actor) return undefined;
    return actor === party.userId ? "You" : (party.names[actor] ?? "Left the party");
  };
  const choosePosition = (p: Position) => {
    setMyPosition(p);
    writeStorage(POSITION_KEY, p);
  };

  if (loadError) return <p className="notice notice-error">{loadError}. Reload the page to try again.</p>;
  if (!engine || !search) return <p className="text-sm text-muted">Loading hero data…</p>;

  const planMembers: PlanMember[] = live.party
    ? live.party.members.map((m) => ({ id: m.id, position: (m.position as Position | null) ?? null }))
    : (party?.members ?? []);
  // The team plan (WCST) for the whole party, planned only while it is on screen.
  const teamPlan =
    pool && view === "team"
      ? planTeam(engine, {
          slots: toPlanSlots(planMembers, pool, allies),
          enemies,
          bans,
          rankBracket: bracket,
        })
      : null;
  if (party && !shared.ready) {
    return shared.error ? (
      <p className="notice notice-error">{shared.error}. Reload the page to try again.</p>
    ) : (
      <p className="text-sm text-muted">Opening your party&apos;s draft…</p>
    );
  }

  const taken = new Set(draft.map((e) => e.heroId));
  const hero = (id: number) => engine.hero(id);
  // Once both teams are in with every ally's position, the game plan for our side.
  const gamePlan = finishedDraftPlan(
    engine,
    POSITIONS.map((p) => allies.find((e) => e.position === p)?.heroId ?? null),
    enemies,
    bracket,
  );
  // Players watching the captain's draft hear each hero as it goes in.
  const last = locked ? draft.at(-1) : undefined;
  const entered = last
    ? `${captainName} entered ${hero(last.heroId).name} (${last.kind === "ally" ? "my team" : last.kind === "enemy" ? "enemy" : "ban"}). `
    : "";
  const lastOf = (kind: DraftEntry["kind"]) => draft.filter((e) => e.kind === kind).at(-1)?.heroId;
  const undoLast = (kind: DraftEntry["kind"]) => {
    const id = lastOf(kind);
    if (id != null) act({ kind: "remove", heroId: id });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4">
        <h1 className="page-title">Draft</h1>
        {party && <span className="chip chip-accent micro">Party</span>}
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
        {!locked && (
          <div className="ml-auto flex gap-2">
            <button onClick={undo} disabled={!canUndo} className="btn btn-ghost btn-sm">
              <Icon name="undo" />
              Undo
            </button>
            <button
              onClick={() => {
                startOver();
                allyRef.current?.focus();
              }}
              disabled={!draft.length}
              className="btn btn-secondary btn-sm"
            >
              <Icon name="plus" />
              New Draft
            </button>
          </div>
        )}
      </div>

      {party && live.party && <DraftCaptainBar party={live.party} userId={party.userId} refresh={live.refresh} />}

      {locked ? (
        <p className="text-xs text-subtle">
          {captainName} enters every hero. Tell them which of your picks you want.
        </p>
      ) : (
        <p className="text-xs text-subtle">
          Type 2 or 3 letters and press <Kbd>Enter</Kbd>; <Kbd>Tab</Kbd> moves to the next box. Several at once work too
          (<span className="text-muted">pa sf</span>). Add a digit for an ally&apos;s position (<span className="text-muted">cm5</span>).
          <Kbd>Backspace</Kbd> in an empty box takes the last hero back out.
          {!signedIn && (
            <>
              {" "}
              <Link href="/login?next=/draft" className="link">
                Sign in
              </Link>{" "}
              to use your own heroes and rank.
            </>
          )}
          {party &&
            (captainId
              ? " Your party sees each hero as you enter it."
              : " Everyone in your party sees this draft and can add to it; New draft starts a fresh one for all of you.")}
        </p>
      )}

      {party && (shared.error ?? live.error) && (
        <p role="alert" className="notice notice-error text-sm">
          {shared.error ?? live.error}
        </p>
      )}

      {!locked && Object.keys(portraits).length > 0 && (
        <ScreenshotPaste
          heroes={engine.heroes}
          portraits={portraits}
          onRead={(read, side) => {
            const actions = readActions(read, side, taken);
            if (actions.length) act(...actions);
          }}
        />
      )}

      {chance !== null && <WinBar chance={chance} />}

      {/* Wide screens put the picks between the teams, like a draft overlay, with the bans under My team. The DOM
          keeps My team, Enemy, Bans, picks so Tab still goes from box to box. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] xl:grid-rows-[auto_1fr]">
        <TeamPanel title="My Team" side="radiant" count={allies.length}>
          {!locked && allies.length < TEAM_SIZE && (
            <HeroInput
              id="ally"
              inputRef={allyRef}
              placeholder="My team pick, e.g. cm5"
              search={search}
              exclude={taken}
              withPosition
              onPick={(picked) => act(...picked.map((p) => ({ kind: "ally" as const, ...p })))}
              onUndo={() => undoLast("ally")}
            />
          )}
          <Slots>
            {allies.map((e) => (
              <Slot
                key={e.heroId}
                hero={hero(e.heroId)}
                portrait={portraits[e.heroId]}
                by={captainId ? undefined : enteredBy(e.heroId)}
                onRemove={locked ? undefined : () => act({ kind: "remove", heroId: e.heroId })}
              >
                {locked ? (
                  <span className={`chip micro shrink-0 whitespace-nowrap ${e.position === myPosition ? "chip-accent" : ""}`}>
                    Pos {e.position ?? "?"}
                  </span>
                ) : (
                  <button
                    onClick={() => act({ kind: "ally", heroId: e.heroId, position: e.position === 5 ? null : (((e.position ?? 0) + 1) as Position) })}
                    aria-label={`${hero(e.heroId).name} position: ${e.position ?? "not set"}. Change`}
                    className={`chip micro shrink-0 whitespace-nowrap ${e.position === myPosition ? "chip-accent" : ""}`}
                  >
                    Pos {e.position ?? "?"}
                  </button>
                )}
              </Slot>
            ))}
          </Slots>
        </TeamPanel>

        <TeamPanel title="Enemy" side="dire" count={enemies.length} className="xl:col-start-3 xl:row-start-1">
          {!locked && enemies.length < TEAM_SIZE && (
            <HeroInput
              id="enemy"
              placeholder="Enemy pick"
              search={search}
              exclude={taken}
              onPick={(picked) => act(...picked.map(({ heroId }) => ({ kind: "enemy" as const, heroId })))}
              onUndo={() => undoLast("enemy")}
            />
          )}
          <Slots>
            {enemies.map((id) => (
              <Slot key={id} hero={hero(id)} portrait={portraits[id]} by={captainId ? undefined : enteredBy(id)} onRemove={locked ? undefined : () => act({ kind: "remove", heroId: id })} />
            ))}
          </Slots>
        </TeamPanel>

        <section aria-labelledby="bans-title" className="flex flex-col gap-3 self-start border-t border-line pt-4 md:col-span-2 xl:col-span-1 xl:col-start-1 xl:row-start-2">
          <h2 id="bans-title" className="section-title">
            Bans <span className="num text-subtle">{bans.length}</span>
          </h2>
          {!locked && (
            <HeroInput
              id="bans"
              inputRef={bansRef}
              placeholder="Bans, several at once: pa sf am"
              search={search}
              exclude={taken}
              onPick={(picked) => act(...picked.map(({ heroId }) => ({ kind: "ban" as const, heroId })))}
              onUndo={() => undoLast("ban")}
            />
          )}
          {bans.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {bans.map((id) => (
                <li key={id} title={hero(id).name}>
                  {locked ? (
                    <Portrait hero={hero(id)} src={portraits[id]} size="strip" banned label />
                  ) : (
                    <button onClick={() => act({ kind: "remove", heroId: id })} aria-label={`Unban ${hero(id).name}`}>
                      <Portrait hero={hero(id)} src={portraits[id]} size="strip" banned />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="picks-title" className="flex flex-col gap-3 md:col-span-2 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 id="picks-title" ref={picksTitleRef} tabIndex={-1} className="section-title">
              {teamPlan ? (
                "Team plan"
              ) : (
                <>
                  Picks for Pos {myPosition} <span className="text-muted">{POSITION_NAMES[myPosition - 1]}</span>
                </>
              )}
            </h2>
            {pool && (
              <div className="seg" role="group" aria-label="Suggestions for">
                <button aria-pressed={view === "mine"} onClick={() => setView("mine")} className="seg-item">
                  My Picks
                </button>
                <button aria-pressed={view === "team"} onClick={() => setView("team")} className="seg-item">
                  Team Plan
                </button>
              </div>
            )}
          </div>
          {teamPlan ? (
            <PartyPlan
              plan={teamPlan}
              names={party!.names}
              portrait={(id, name) => <Portrait hero={{ id, name } as HeroInfo} src={portraits[id]} size="card" />}
              onPicked={(heroId, position) => act({ kind: "ally", heroId, position })}
              onBanned={(heroId) => act({ kind: "ban", heroId })}
            />
          ) : mine ? (
            <p className="text-sm text-muted">
              You&apos;re on <span className="text-fg">{hero(mine.heroId).name}</span>. Good luck!
            </p>
          ) : (
            <>
            {suggestions.length > 0 && (
              <p className="text-sm text-subtle">
                {reactingTo({
                  enemies: enemies.map(hero).map((h) => h.name),
                  allies: allyIds.map(hero).map((h) => h.name),
                  bans: bans.length,
                })}
              </p>
            )}
            <ol aria-label="Suggested heroes" className="flex flex-col">
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={s.heroId}
                  suggestion={s}
                  move={moves.get(s.heroId)}
                  outsidePool={outside.has(s.heroId)}
                  portrait={portraits[s.heroId]}
                  rank={i + 1}
                  position={myPosition}
                  gain={pickGain(engine, s.heroId, allyIds, enemies, bracket)}
                  onPicked={
                    locked
                      ? undefined
                      : () => {
                          act({ kind: "ally", heroId: s.heroId, position: myPosition });
                          refocus("ally");
                        }
                  }
                  onBanned={
                    locked
                      ? undefined
                      : () => {
                          act({ kind: "ban", heroId: s.heroId });
                          refocus("bans");
                        }
                  }
                />
              ))}
            </ol>
            </>
          )}
          <Announcer
            text={
              entered +
              (teamPlan ? "" : mine ? `You're on ${hero(mine.heroId).name}.` : picksSentence(suggestions.map((s) => s.name)))
            }
          />
        </section>
      </div>

      {gamePlan && (
        <GameStoryPanel
          plan={gamePlan}
          heroName={(id) => hero(id).name}
          icons={icons}
          playerNames={POSITIONS.map((p) => {
            const member = party?.members.find((m) => m.position === p);
            return member ? (member.id === party!.userId ? "You" : (party!.names[member.id] ?? null)) : null;
          })}
          myPosition={myPosition}
        />
      )}

      {party && allies.length === TEAM_SIZE && (
        <AfterGame result={shared.result} checking={shared.checking} onFind={shared.findResult} />
      )}
    </>
  );
}

/** My team's win chance against the enemy's as one split bar. Shown only with a checked model. */
function WinBar({ chance }: { chance: number }) {
  const pct = (chance * 100).toFixed(1);
  return (
    <section aria-label="Win Chance" className="flex flex-col gap-2 border-y border-line py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-subtle">
          Win Chance <span className="num text-lg text-radiant">{pct}%</span>
        </span>
        <span className="text-sm text-subtle">
          Enemy <span className="num text-lg text-dire">{(100 - chance * 100).toFixed(1)}%</span>
        </span>
      </div>
      <div aria-hidden className="flex h-1 overflow-hidden rounded-xs bg-dire-strong">
        <div className="bg-radiant-strong" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function TeamPanel({
  title,
  side,
  count,
  className = "",
  children,
}: {
  title: string;
  side: "radiant" | "dire";
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-3 self-start border-t pt-4 ${side === "radiant" ? "border-t-radiant-strong" : "border-t-dire-strong"} ${className}`}
    >
      <h2 className="section-title flex items-baseline gap-2">
        <span aria-hidden className={`h-2 w-2 self-center rounded-full ${side === "radiant" ? "bg-radiant" : "bg-dire"}`} />
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
        <li key={`empty-${i}`} aria-hidden className="flex h-11 items-center gap-3 rounded-sm bg-surface p-1 ring-1 ring-inset ring-line">
          <span className="h-9 w-16 shrink-0 rounded-xs bg-raised" />
          <span className="text-sm text-subtle">Open</span>
        </li>
      ))}
    </ul>
  );
}

function Slot({
  hero,
  portrait,
  by,
  onRemove,
  children,
}: {
  hero: HeroInfo;
  portrait?: string;
  /** Who entered the hero, in a party draft. */
  by?: string;
  /** Left out when the player can't change the draft. */
  onRemove?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex min-h-11 items-center gap-3 rounded-sm bg-surface p-1 pr-2 ring-1 ring-inset ring-line">
      <Portrait hero={hero} src={portrait} size="strip" />
      <span className="flex min-w-0 flex-col">
        <span className="font-medium leading-tight text-fg">{hero.name}</span>
        {by && <span className="micro text-subtle">Entered by {by}</span>}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {children}
        {onRemove && (
          <button onClick={onRemove} aria-label={`Remove ${hero.name}`} className="btn btn-icon btn-sm text-muted">
            ×
          </button>
        )}
      </span>
    </li>
  );
}

const SIZES = {
  strip: { w: 64, h: 36, className: "h-9 w-16" },
  card: { w: 112, h: 63, className: "h-15.75 w-28" },
};

/** A hero's 16:9 portrait, or a slate tile with the name when the art is missing. */
function Portrait({
  hero,
  src,
  size,
  banned,
  label,
}: {
  hero: HeroInfo;
  src?: string;
  size: keyof typeof SIZES;
  banned?: boolean;
  /** Names the hero for screen readers when nothing around the portrait does. */
  label?: boolean;
}) {
  const s = SIZES[size];
  const look = `${s.className} shrink-0 rounded-xs object-cover ${banned ? "opacity-50 grayscale" : ""}`;
  if (!src) return <span className={`${look} micro flex items-center justify-center bg-raised p-1 text-center text-muted`}>{hero.name}</span>;
  return <Image src={src} alt={label ? hero.name : ""} width={s.w} height={s.h} className={look} />;
}

/** The hero's large transparent render on the Steam CDN, from its portrait URL. */
const renderOf = (portrait?: string) =>
  portrait?.replace("/images/dota_react/heroes/", "/videos/dota_react/heroes/renders/");

/** The graded render behind the best pick: one per page, never a portrait wall. */
const RENDER_STYLE: React.CSSProperties = {
  filter: "grayscale(.55) sepia(.25) brightness(.6)",
  maskImage: "radial-gradient(closest-side at 50% 45%, #000 45%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(closest-side at 50% 45%, #000 45%, transparent 100%)",
};

/**
 * One suggestion. Rank 1 is the answer: a large name over the hero's render, the score in copper and the main
 * Picked button. Ranks 2 to 8 are equal hairline rows with the same columns, so the eye reads down them.
 */
function SuggestionCard({
  suggestion: s,
  portrait,
  rank,
  position,
  move,
  outsidePool,
  gain,
  onPicked,
  onBanned,
}: {
  suggestion: Suggestion;
  portrait?: string;
  rank: number;
  position: Position;
  /** "New" or "Up 2" since the last pick or ban. */
  move?: string;
  /** Not one of the player's heroes for this position. */
  outsidePool?: boolean;
  /** Change in my team's win chance, in points, when it is known. */
  gain: number | null;
  /** Left out when the player can't change the draft. */
  onPicked?: () => void;
  onBanned?: () => void;
}) {
  const hero = { id: s.heroId, name: s.name } as HeroInfo;
  const counters = s.hardCounters.map((n) => (
    <p key={n.counterId} className={`notice ${NOTICE[n.status]} text-xs`}>
      {n.text}
    </p>
  ));
  const gainText =
    gain !== null ? (
      <span className={`num ${gain < 0 ? "text-dire" : "text-radiant"}`} title="Change in your team's win chance">
        {signed(gain)}%
      </span>
    ) : null;

  if (rank === 1) {
    const render = renderOf(portrait);
    return (
      <li className="relative isolate mb-6 flex min-h-72 flex-col justify-center gap-3 py-6 sm:pl-[42%]">
        {render && (
          <Image
            src={render}
            alt=""
            aria-hidden
            width={640}
            height={640}
            style={RENDER_STYLE}
            className="pointer-events-none absolute -left-8 top-1/2 -z-10 hidden w-[52%] max-w-md -translate-y-1/2 sm:block"
          />
        )}
        <span className="flex items-center gap-2 text-sm text-accent">
          Best Pick Right Now <MoveMark move={move} />
          {outsidePool && <OutsidePool />}
        </span>
        <span className="text-5xl font-semibold leading-none tracking-[-0.035em] text-fg">{s.name}</span>
        <span className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold tracking-[-0.02em] text-accent" title="Score in win-rate points">
            {signed(s.score)}
          </span>
          {gainText}
        </span>
        <PickWhy suggestion={s} className="max-w-md text-fg/85" />
        {counters}
        {onPicked && onBanned && (
          <div className="mt-2 flex gap-2">
            <button onClick={onPicked} className="btn btn-primary">
              <Icon name="check" />
              Picked
            </button>
            <button onClick={onBanned} className="btn btn-secondary">
              <Icon name="ban" />
              Banned
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="group relative grid grid-cols-[1.25rem_4rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-line py-3">
      {rank === 2 && <span className="col-span-4 -mt-3 mb-1 pt-3 text-sm text-subtle">Also Strong</span>}
      <span className="num text-subtle">{rank}</span>
      <Portrait hero={hero} src={portrait} size="strip" />
      <div className="min-w-0">
        <span className="flex items-center gap-2 font-medium text-fg">
          {s.name} <MoveMark move={move} />
          {outsidePool && <OutsidePool />}
        </span>
        <details className="text-sm text-subtle">
          <summary className="cursor-pointer truncate">{s.reasons[0] ?? "Why This Pick"}</summary>
          <PickWhy suggestion={{ ...s, reasons: s.reasons.slice(1) }} className="mt-1 text-fg/85" />
        </details>
      </div>
      <span className="flex items-center gap-3">
        {/* On a mouse the row's buttons float over the reason on hover or keyboard focus, so they take no room; on touch they always show. */}
        {onPicked && onBanned && (
          <span className="flex gap-1 [@media(hover:hover)]:absolute [@media(hover:hover)]:right-16 [@media(hover:hover)]:top-1/2 [@media(hover:hover)]:-translate-y-1/2 [@media(hover:hover)]:bg-bg [@media(hover:hover)]:pl-4 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
            <button onClick={onPicked} className="btn btn-secondary btn-sm">
              <Icon name="check" />
              Picked
            </button>
            <button onClick={onBanned} className="btn btn-ghost btn-sm">
              <Icon name="ban" />
              Banned
            </button>
          </span>
        )}
        {gainText}
        <span className="num w-12 text-right text-fg" title="Score in win-rate points">
          {signed(s.score)}
        </span>
      </span>
      {s.hardCounters.length > 0 && <div className="col-span-2 col-start-3 flex flex-col gap-2">{counters}</div>}
    </li>
  );
}

function OutsidePool() {
  return (
    <span className="chip text-xs" title="Not one of your heroes for this position">
      Outside Pool
    </span>
  );
}
