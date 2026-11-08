"use client";

import Image from "next/image";
import { Icon } from "@/components/icon";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameStoryPanel } from "@/components/game-story-panel";
import { MoveMark, OutsidePool, PickWhy, WeakHere } from "@/components/pick-why";
import { HeroInput } from "@/components/hero-input";
import { readActions } from "@/lib/draft-reader/actions";
import { Kbd } from "@/components/kbd";
import { SteamButton } from "@/components/steam-button";
import { applyAction, heroesOf, POSITION_NAMES, TEAM_SIZE, type DraftAction, type DraftEntry } from "@/lib/draft";
import { Engine } from "@/lib/engine/score";
import { loadSnapshot } from "@/lib/engine/snapshot";
import { POSITIONS, type GamesWins, type HeroInfo, type Position, type RankBracket, type Suggestion } from "@/lib/engine/types";
import { finishedDraftPlan } from "@/lib/game-plan";
import { matchupRequest } from "@/lib/matchup-games";
import { useMatchupGames } from "@/lib/use-matchup-games";
import { HeroSearch } from "@/lib/hero-search";
import { pickGain, teamWinChance } from "@/lib/win";
import { poolFirst, reactingTo, toSaved, useRankMoves, weakHere, worstMatchup } from "@/lib/pick-explain";
import { planTeam } from "@/lib/engine/plan";
import type { Party } from "@/lib/party";
import { createClient } from "@/lib/supabase/client";
import { toPlanSlots, type PlanMember } from "@/lib/party-plan";
import { perPlayerColumns } from "@/lib/per-player";
import { positionActions, resolveAllyPositions } from "@/lib/ally-positions";
import { AfterGame } from "./after-game";
import { Announcer, picksSentence } from "./announcer";
import { DraftCaptainBar } from "./draft-captain-bar";
import { PartyPlan } from "./party-plan";
import { PerPlayerView } from "./per-player-view";
import { PositionPicker } from "./position-picker";
import { ScreenshotPaste } from "./screenshot-paste";
import { useLiveParty } from "./use-live-party";
import { usePartyDraft } from "./use-party-draft";
import { TeamSeats } from "./team-seats";
import { useTeamLineup, type PlannableStack } from "./use-team-lineup";
import { StartGame } from "./start-game";
import { SuggestionRow } from "./suggestion-row";
import { useGameCheckIn } from "./use-game-check-in";
import { useCheckInActions, useDueCheckIn } from "./use-check-in";
import { CheckInCard } from "./check-in-card";
import { LastGameLine } from "./last-game-line";
import {
  type DueCheckIn,
  forgetSoloBoardKey,
  gameCheckInEnabled,
  isFullBoard,
  soloBoardKey,
  toCheckInBoard,
} from "@/lib/game-check-in";
import { isTeammate, SOLO_ME } from "@/lib/solo-queue";

/** What the signed-in player brings to their suggestions. Empty when signed out. */
export interface Player {
  /** Favorite heroes per position; 0 holds heroes for any position. */
  heroes: Record<number, number[]>;
  /** The player's Top 3 per position (1 to 5), hero ids in slot order. */
  top: Record<number, number[]>;
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

const RANKS = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];
const DRAFT_KEY = "solo-draft";
const POSITION_KEY = "solo-draft-position";
const NO_STACKS: PlannableStack[] = [];
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
  signedIn,
  party,
  userId = null,
  stacks = NO_STACKS,
}: {
  player: Player;
  /** Wide hero portraits (16:9), for the board and the Game Story. */
  portraits: Record<number, string>;
  signedIn: boolean;
  party: PartyInfo | null;
  /** The signed-in player, for the Stack lineup. */
  userId?: string | null;
  /** Stacks the player runs, to plan a draft for when they aren't in a party. */
  stacks?: PlannableStack[];
}) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [soloDraft, setSoloDraft] = useState<DraftEntry[]>([]);
  const [history, setHistory] = useState<DraftEntry[][]>([]);
  // The draft as of the last change, ahead of the next render: Watch Dota can add picks twice in a row
  // before the page renders (it is in the background while Dota is in front), and the second must build
  // on the first.
  const latestSolo = useRef<DraftEntry[]>([]);
  const [soloPosition, setMyPosition] = useState<Position>(party?.myPosition ?? player.positions[0] ?? 1);
  const shared = usePartyDraft(party?.id ?? null, party?.userId ?? null);
  const live = useLiveParty(party?.party ?? null);
  // Out of a party, the player can plan for a Stack they run, online or not. The party always wins.
  // Team: any mix of Stack mates and friends, online or not; open seats are teammates who can play any hero.
  const lineup = useTeamLineup({
    userId: party ? null : userId,
    enabled: !party,
    stacks: party ? NO_STACKS : stacks,
    myPosition: soloPosition,
    myHeroes: player.heroes,
    myTop: player.top,
    personal: player.personal,
  });
  const lineupPlan = party ? null : lineup.plan;
  // Who the plan is for: the live party, or the Stack lineup. Every member's favorite heroes, so the
  // whole party sees the planner's Team Plan.
  const pool = party ? live.pool : (lineupPlan?.pool ?? null);
  const planPlayers = party ? live.players : (lineupPlan?.players ?? {});
  const planNames = party ? party.names : (lineupPlan?.names ?? {});
  // In a lineup, the player's position is the one they have there.
  const myPosition = lineupPlan?.myPosition ?? soloPosition;
  const captainId = party ? (live.party?.captain.id ?? null) : null;
  // The planner runs the party's screen: the Draft Captain, else the leader. Everyone else watches it.
  const planner = party ? live.planner : null;
  const isPlanner = !party || planner === party.userId;
  const plannerName = planner ? (live.party?.members.find((m) => m.id === planner)?.name ?? "The planner") : null;
  // With a draft captain, only they enter the draft; everyone else watches it fill in.
  const locked = captainId !== null && captainId !== party?.userId;
  const captainName = captainId ? (live.party?.members.find((m) => m.id === captainId)?.name ?? "The captain") : null;
  const [chosenView, setView] = useState<"mine" | "players" | "team">("mine");
  // Planning for a Stack without playing yourself: there are no picks of your own to show.
  const notPlaying = lineupPlan !== null && lineupPlan.myPosition === null;
  const view = notPlaying && chosenView === "mine" ? "players" : chosenView;
  const draft = party ? shared.draft : soloDraft;
  const [soloRank, setSoloRank] = useState<RankBracket | null>(player.rank);
  const [rankError, setRankError] = useState<string | null>(null);
  // In a party every screen uses the party rank: the one the planner set, else the planner's own.
  const rank = party
    ? (live.partyRank ?? (isPlanner ? player.rank : (live.players[planner ?? ""]?.rank ?? null)))
    : soloRank;
  const setRank = async (next: RankBracket | null) => {
    if (!party) return setSoloRank(next);
    if (!isPlanner) return;
    // null goes back to the planner's own rank; the generated types can't mark the argument nullable.
    const { error } = await createClient().rpc("set_party_rank", { bracket: next as number });
    if (error) return setRankError(`Party rank not saved: ${error.message}`);
    setRankError(null);
    await live.refresh();
  };
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
        const savedDraft = readStorage(DRAFT_KEY, isDraft) ?? [];
        latestSolo.current = savedDraft;
        setSoloDraft(savedDraft);
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
  // In a party every screen holds the same lobby positions free, so everyone sees the same guesses.
  const lobbyPositions = (live.party?.members ?? party?.members ?? []).flatMap((m) => (isPosition(m.position) ? [m.position] : []));
  // Team holds the seated players' positions; teammates in open seats go where their hero fits best.
  const seatedPositions = lineup.seats.map((s) => s.position);
  const reserved = party && lobbyPositions.length ? lobbyPositions : lineupPlan ? seatedPositions : [myPosition];
  const resolved = engine ? resolveAllyPositions(allies, reserved, (id) => engine.fit(id)) : [];

  // Typing stays inside each search box, so this runs only when the draft or a setting changes.
  // Your heroes for the position come first, then the best few outside your pool. A pool hero that
  // is weak in this draft drops back and competes with the others by score.
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
          top: player.top[myPosition],
          personal: player.personal,
          count: engine.heroes.length,
        })
      : [];
  const { list: suggestions, outside, weak } = poolFirst(ranked, new Set(favorites), {
    weak: (s) => weakHere(s, engine ? worstMatchup(engine, s.heroId, enemies, myPosition, rank ?? undefined) : 0),
  });

  const allyIds = allies.map((e) => e.heroId);
  const moves = useRankMoves(
    suggestions.map((s) => s.heroId),
    JSON.stringify([allyIds, enemies, bans]),
    String(myPosition),
  );
  const bracket = rank ?? undefined;
  const chance = engine ? teamWinChance(engine, allyIds, enemies, bracket) : null;
  // Our picks by position once placed, and the live games against these enemies for the talents.
  const picksByPosition = POSITIONS.map((p) => resolved.find((a) => a.position === p)?.heroId ?? null);
  const matchups = useMatchupGames(engine ? matchupRequest(engine.data, picksByPosition, enemies) : null);

  // In a party, save the list this player sees once it settles, for the after-game card and
  // reports. The list as a string, so a re-render with the same list saves nothing.
  const shown =
    party && suggestions.length
      ? JSON.stringify({
          ...toSaved(suggestions),
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

  // Once both teams are in with every ally's position, the game plan for our side.
  const gamePlan = engine ? finishedDraftPlan(engine, picksByPosition, enemies, bracket, matchups) : null;

  // The list this player saw last before their pick, kept for the saved game.
  const shownNow = suggestions.slice(0, 8).map((s) => s.heroId);
  const [lastShown, setLastShown] = useState<number[]>([]);
  if (shownNow.length && shownNow.join() !== lastShown.join()) setLastShown(shownNow);
  // A full board is saved as a game for the check-in, while signed in and the flag is on.
  const checkInBoard =
    gameCheckInEnabled() && signedIn && isFullBoard(draft) && (!party || shared.draftId)
      ? toCheckInBoard({
          draft,
          key: party ? null : soloBoardKey(),
          partyDraftId: party ? shared.draftId : null,
          myPosition,
          myHero: mine?.heroId ?? null,
          shown: lastShown,
          storyShown: gamePlan !== null,
        })
      : null;
  const game = useGameCheckIn(checkInBoard);

  // The check-in: for this board's game once it is due (20 minutes after Start Game, or the result is in)
  // or the player pressed Game Over; on an empty board, the last unanswered game, opened by Answer Now.
  const checkInOn = gameCheckInEnabled() && signedIn;
  const dueCheckIn = useDueCheckIn(checkInOn, game.startedAt !== null);
  const checkInActions = useCheckInActions();
  const [openCheckIn, setOpenCheckIn] = useState<string | null>(null);
  const [checkInDone, setCheckInDone] = useState(false);
  const due = dueCheckIn.due;
  const thisGame: DueCheckIn | null =
    checkInBoard && game.id && game.startedAt && !game.answered
      ? due?.id === game.id
        ? due
        : {
            id: game.id,
            allies: checkInBoard.allies,
            enemies: checkInBoard.enemies,
            myHero: checkInBoard.my_hero,
            myPosition: checkInBoard.my_position,
            storyShown: checkInBoard.story_shown,
            matchId: party ? (shared.result?.matchId ?? null) : null,
            won: party ? (shared.result?.won ?? null) : null,
          }
      : null;
  const checkInGame =
    thisGame && (openCheckIn === thisGame.id || due?.id === thisGame.id)
      ? thisGame
      : !draft.length && due && openCheckIn === due.id
        ? due
        : null;
  const lastGame = !draft.length && due && openCheckIn !== due.id ? due : null;
  const openCheckInNow = (id: string) => {
    setOpenCheckIn(id);
    requestAnimationFrame(() => document.getElementById("check-in-title")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const closeCheckIn = (id: string, answered: boolean) => {
    if (id === game.id) game.markAnswered();
    setOpenCheckIn(null);
    dueCheckIn.clear();
    setCheckInDone(answered);
  };

  const change = (next: DraftEntry[]) => {
    const current = latestSolo.current;
    if (next === current) return;
    setHistory((h) => [...h.slice(-49), current]);
    latestSolo.current = next;
    setSoloDraft(next);
    writeStorage(DRAFT_KEY, next);
  };
  const act = (...actions: DraftAction[]) => {
    if (locked) return;
    if (party) void shared.act(actions);
    else change(actions.reduce(applyAction, latestSolo.current));
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
    latestSolo.current = prev;
    setSoloDraft(prev);
    writeStorage(DRAFT_KEY, prev);
  };
  const startOver = () => {
    setCheckInDone(false);
    if (party) void shared.newDraft();
    else {
      change([]);
      forgetSoloBoardKey();
    }
  };
  /** Who entered a hero in the party draft. */
  const enteredBy = (heroId: number) => {
    const actor = party ? shared.actors.get(heroId) : undefined;
    if (!party || !actor) return undefined;
    return actor === party.userId ? "You" : (party.names[actor] ?? "Left the party");
  };
  /** Puts an ally in a position, swapping with whoever held it, so no two allies share one. */
  const placeAlly = (heroId: number, position: Position | null) => act(...positionActions(resolved, heroId, position));
  const choosePosition = (p: Position) => {
    // In Team the player's seat moves too, swapping with whoever sat there.
    if (lineupPlan?.myPosition) lineup.place(SOLO_ME, p);
    setMyPosition(p);
    writeStorage(POSITION_KEY, p);
  };

  if (loadError) return <p className="notice notice-error">{loadError}. Reload the page to try again.</p>;
  if (!engine || !search) return <p className="text-sm text-muted">Loading hero data…</p>;

  const planMembers: PlanMember[] = live.party
    ? live.party.members.map((m) => ({ id: m.id, position: (m.position as Position | null) ?? null }))
    : party
      ? party.members
      : (lineupPlan?.members ?? []);
  // Team fills every position, so an ally typed without a position takes its guessed one, the
  // same as on My Team, and never a seated player's.
  const planAllies: DraftEntry[] = lineupPlan
    ? resolved.map((a) => ({ kind: "ally", heroId: a.heroId, position: a.position }))
    : allies;
  // The team plan (WCST) for the whole party, planned only while it is on screen.
  // Watchers always see the planner's Team Plan; the planner switches between it and their own picks.
  const teamPlan =
    pool && (view === "team" || !isPlanner)
      ? planTeam(engine, {
          slots: toPlanSlots(planMembers, pool, planAllies, planPlayers),
          enemies,
          bans,
          rankBracket: bracket,
        })
      : null;
  // Per Player: what each member who still has to pick should take, one hero per player.
  const playerColumns =
    pool && isPlanner && view === "players"
      ? perPlayerColumns(engine, {
          slots: toPlanSlots(planMembers, pool, planAllies, planPlayers),
          personal: Object.fromEntries(Object.entries(planPlayers).map(([id, p]) => [id, p.personal])),
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

  // Your own part of the draft: picks for your position, or your hero once it is in.
  const myPart = checkInBoard && !game.answered ? (
    <StartGame
      heroName={mine ? hero(mine.heroId).name : null}
      ready={game.id !== null}
      startedAt={game.startedAt}
      busy={game.busy}
      error={game.error}
      onStart={() => void game.start()}
      onStop={() => void game.stop()}
      onOver={() => {
        if (!game.id) return;
        // In a party, ask the job to look for the result now.
        if (party && !shared.result) void shared.findResult();
        openCheckInNow(game.id);
      }}
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
                  weakHere={weak.has(s.heroId)}
                  portrait={portraits[s.heroId]}
                  rank={i + 1}
                  position={myPosition}
                  gain={pickGain(engine, s.heroId, allyIds, enemies, bracket)}
                  onPicked={
                    locked
                      ? undefined
                      : () => {
                          placeAlly(s.heroId, myPosition);
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
          );
  const picksHeading = (
    <>
      Picks for Pos {myPosition} <span className="text-muted">{POSITION_NAMES[myPosition - 1]}</span>
    </>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4">
        <h1 className="page-title">Draft</h1>
        {party && <span className="chip chip-accent micro">Party</span>}
        <div className="flex items-center gap-2">
          <span className="label-caps" id="my-position">
            Role
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
            onChange={(e) => void setRank(e.target.value ? (Number(e.target.value) as RankBracket) : null)}
            disabled={!isPlanner}
            title={isPlanner ? undefined : `${plannerName} sets the party rank`}
            className="field btn-sm"
          >
            <option value="">{party ? "Planner's Rank" : "All ranks"}</option>
            {RANKS.map((r, i) => (
              <option key={r} value={i + 1}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {lastGame && <LastGameLine game={lastGame} heroOf={hero} portraits={portraits} onAnswer={() => openCheckInNow(lastGame.id)} />}
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

      {!party && (
        <TeamSeats
          mode={lineup.mode}
          seats={lineup.seats}
          people={lineup.people}
          pool={lineup.pool}
          myHeroes={player.heroes}
          stacks={stacks}
          signedIn={signedIn}
          notice={lineup.notice}
          hero={(id) => ({ name: engine.hero(id)?.name ?? "", image: portraits[id] })}
          onJustMe={lineup.justMe}
          onTeam={() => {
            lineup.team();
            // The teammates' picks are what Team adds, so show them straight away.
            setView("players");
          }}
          onPlace={lineup.place}
          onRemove={lineup.remove}
          onFill={lineup.fill}
        />
      )}

      {!isPlanner && (
        <section aria-labelledby="picks-title" className="flex flex-col gap-3">
          <h2 id="picks-title" ref={picksTitleRef} tabIndex={-1} className="section-title">
            {picksHeading}
          </h2>
          {myPart}
        </section>
      )}

      {!isPlanner && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface px-4 py-3">
          <Icon name="users" />
          <span className="font-semibold text-fg">Watching {plannerName}&apos;s Draft</span>
          <span className="text-sm text-muted">Their Team Plan and party rank, live. Every screen in the party shows the same numbers.</span>
        </div>
      )}

      {party && live.party && <DraftCaptainBar party={live.party} userId={party.userId} refresh={live.refresh} />}
      {rankError && (
        <p role="alert" className="notice notice-error text-sm">
          {rankError}
        </p>
      )}

      {locked ? (
        <p className="text-xs text-subtle">
          {captainName} enters every hero. Tell them which of your picks you want.
        </p>
      ) : (
        <p className="text-xs text-subtle">
          Type 2 or 3 letters and press <Kbd>Enter</Kbd>; <Kbd>Tab</Kbd> moves to the next box. Several at once work too
          (<span className="text-muted">pa sf</span>). Add a digit for an ally&apos;s position (<span className="text-muted">cm5</span>).
          <Kbd>Backspace</Kbd> in an empty box takes the last hero back out.
          {party &&
            (captainId
              ? " Your party sees each hero as you enter it."
              : " Everyone in your party sees this draft and can add to it; New draft starts a fresh one for all of you.")}
        </p>
      )}
      {!signedIn && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Sign in to use your own heroes and rank.</p>
          <SteamButton next="/draft" small />
        </div>
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
          inDraft={taken}
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
              onPick={(picked) =>
                // One act for the whole line: each act starts from the draft as this render saw it.
                act(
                  ...picked.flatMap((p) =>
                    p.position === null
                      ? [{ kind: "ally" as const, heroId: p.heroId, position: null }]
                      : positionActions(resolved, p.heroId, p.position),
                  ),
                )
              }
              onUndo={() => undoLast("ally")}
            />
          )}
          <Slots>
            {resolved.map((a) => (
              <Slot
                key={a.heroId}
                hero={hero(a.heroId)}
                portrait={portraits[a.heroId]}
                by={captainId ? undefined : enteredBy(a.heroId)}
                onRemove={locked ? undefined : () => act({ kind: "remove", heroId: a.heroId })}
              >
                <PositionPicker
                  heroName={hero(a.heroId).name}
                  position={a.position}
                  isGuess={a.isGuess}
                  onChange={locked ? undefined : (p) => placeAlly(a.heroId, p)}
                />
              </Slot>
            ))}
          </Slots>
          {resolved.some((a) => a.isGuess) && (
            <p className="text-xs text-subtle">Dashed positions are guesses. Click a number to set the real one.</p>
          )}
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

        <section
          aria-labelledby={isPlanner ? "picks-title" : "plan-title"}
          className="flex flex-col gap-3 md:col-span-2 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2
              id={isPlanner ? "picks-title" : "plan-title"}
              ref={isPlanner ? picksTitleRef : undefined}
              tabIndex={-1}
              className="section-title"
            >
              {teamPlan ? "Team Plan" : playerColumns ? "Per Player" : picksHeading}
            </h2>
            {pool && isPlanner && (
              <div className="seg" role="group" aria-label="Suggestions for">
                {!notPlaying && (
                  <button aria-pressed={view === "mine"} onClick={() => setView("mine")} className="seg-item">
                    My Picks
                  </button>
                )}
                <button aria-pressed={view === "players"} onClick={() => setView("players")} className="seg-item">
                  Per Player
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
              names={planNames}
              portrait={(id, name) => <Portrait hero={{ id, name } as HeroInfo} src={portraits[id]} size="card" />}
              onPicked={isPlanner ? (heroId, position) => placeAlly(heroId, position) : undefined}
              onBanned={isPlanner ? (heroId) => act({ kind: "ban", heroId }) : undefined}
            />
          ) : playerColumns ? (
            <PerPlayerView
              columns={playerColumns}
              names={planNames}
              draftKey={JSON.stringify([allyIds, enemies, bans])}
              heroes={engine.heroes}
              portrait={(id, name, size = "strip") => <Portrait hero={{ id, name } as HeroInfo} src={portraits[id]} size={size} />}
              onPicked={(heroId, position) => placeAlly(heroId, position)}
              onBanned={(heroId) => act({ kind: "ban", heroId })}
            />
          ) : isPlanner ? (
            myPart
          ) : (
            <p className="text-sm text-muted">Loading the Team Plan…</p>
          )}
          <Announcer
            text={
              entered +
              ((teamPlan || playerColumns) && isPlanner ? "" : mine ? `You're on ${hero(mine.heroId).name}.` : picksSentence(suggestions.map((s) => s.name)))
            }
          />
        </section>
      </div>

      {gamePlan && resolved.some((a) => a.isGuess) && (
        <p className="notice notice-warn text-sm">
          This game plan uses guessed positions for some of My Team. Set them above if they are wrong.
        </p>
      )}
      {gamePlan && (
        <GameStoryPanel
          plan={gamePlan}
          heroName={(id) => hero(id).name}
          abilities={engine.data.heroAbilities}
          items={engine.data.items}
          icons={portraits}
          playerNames={POSITIONS.map((p) => {
            const member = planMembers.find((m) => m.position === p);
            if (!member || isTeammate(member.id)) return null;
            return member.id === (party?.userId ?? SOLO_ME) ? "You" : (planNames[member.id] ?? null);
          })}
          myPosition={myPosition}
        />
      )}

      {checkInGame ? (
        <CheckInCard
          key={checkInGame.id}
          game={checkInGame}
          heroOf={hero}
          portraits={portraits}
          onSend={async (answer) => {
            const error = await checkInActions.answer(checkInGame.id, answer);
            if (!error) closeCheckIn(checkInGame.id, true);
            return error;
          }}
          onSkip={async () => {
            const error = await checkInActions.skip(checkInGame.id);
            if (!error) closeCheckIn(checkInGame.id, false);
            return error;
          }}
        />
      ) : (
        party &&
        allies.length === TEAM_SIZE && <AfterGame result={shared.result} checking={shared.checking} onFind={shared.findResult} />
      )}
      {checkInDone && (
        <p role="status" className="notice notice-done text-sm">
          Thanks. Your answers tune the picks and the Game Story.
        </p>
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

/** The team's five slots: picks in order, then empty ones, all the same size. */
function Slots({ children }: { children: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {children}
      {Array.from({ length: TEAM_SIZE - children.length }, (_, i) => (
        <li key={`empty-${i}`} aria-hidden className={`${SLOT} items-center`}>
          <span className={`${SIZES.slot.className} shrink-0 rounded-xs bg-raised`} />
          <span className="text-sm text-subtle">Open</span>
        </li>
      ))}
    </ul>
  );
}

const SLOT = "flex h-16 gap-3 rounded-sm bg-surface p-1 pr-2 ring-1 ring-inset ring-line";

/** One pick: portrait, name and Remove on top, and its controls (an ally's position) under the name. */
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
    <li className={`${SLOT} items-center`}>
      <Portrait hero={hero} src={portrait} size="slot" />
      <span className={`flex min-w-0 flex-1 flex-col gap-0.5 ${children ? "self-stretch justify-between" : ""}`}>
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-medium leading-tight text-fg">{hero.name}</span>
          {by && <span className="micro truncate text-subtle">Entered by {by}</span>}
        </span>
        {children}
      </span>
      {onRemove && (
        <button onClick={onRemove} aria-label={`Remove ${hero.name}`} className={`btn btn-icon btn-sm shrink-0 text-muted ${children ? "self-start" : ""}`}>
          ×
        </button>
      )}
    </li>
  );
}

const SIZES = {
  chip: { w: 40, h: 22, className: "h-5.5 w-10" },
  strip: { w: 64, h: 36, className: "h-9 w-16" },
  slot: { w: 96, h: 54, className: "h-13.5 w-24" },
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
  weakHere,
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
  /** One of the player's heroes, but weak in this draft. */
  weakHere?: boolean;
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
          {weakHere && <WeakHere />}
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
    <SuggestionRow
      suggestion={s}
      portrait={<Portrait hero={hero} src={portrait} size="strip" />}
      rank={rank}
      scoreText={signed(s.score)}
      badges={
        <>
          <MoveMark move={move} />
          {outsidePool && <OutsidePool />}
          {weakHere && <WeakHere />}
        </>
      }
      gainText={gainText}
      counters={counters}
      onPicked={onPicked}
      onBanned={onBanned}
    />
  );
}
