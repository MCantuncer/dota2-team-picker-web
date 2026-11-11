"use client";

import { Icon } from "@/components/icon";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { GameStoryPanel } from "@/components/game-story-panel";
import { HeroFace } from "@/components/hero-frame";
import { HeroInput } from "@/components/hero-input";
import { readActions } from "@/lib/draft-reader/actions";
import type { Side } from "@/lib/draft-reader/geometry";
import { Kbd } from "@/components/kbd";
import { SteamButton } from "@/components/steam-button";
import { heroesOf, POSITION_NAMES, TEAM_SIZE, type DraftAction, type DraftEntry } from "@/lib/draft";
import { Engine } from "@/lib/engine/score";
import { loadSnapshot } from "@/lib/engine/snapshot";
import { POSITIONS, type EnemyPositions, type GamesWins, type HeroInfo, type Position, type RankBracket } from "@/lib/engine/types";
import { finishedDraftPlan } from "@/lib/game-plan";
import { matchupRequest } from "@/lib/matchup-games";
import { useMatchupGames } from "@/lib/use-matchup-games";
import { HeroSearch } from "@/lib/hero-search";
import { edgeParts, pickGain, teamWinChance } from "@/lib/win";
import { draftEdge } from "@/lib/engine/win-chance";
import { verdicts } from "@/lib/engine/verdict";
import {
  type ListRule,
  listRule,
  outsiderText,
  ownHeroes,
  playedHeroes,
  provenOutsider,
  reactingTo,
  toSaved,
  useRankMoves,
  weakHere,
  worstMatchup,
} from "@/lib/pick-explain";
import { planTeam } from "@/lib/engine/plan";
import type { Party } from "@/lib/party";
import { createClient } from "@/lib/supabase/client";
import { toPlanSlots, type PlanMember } from "@/lib/party-plan";
import { perPlayerColumns } from "@/lib/per-player";
import { positionActions, resolveAllyPositions } from "@/lib/ally-positions";
import { AfterGame } from "./after-game";
import { Announcer, picksSentence } from "./announcer";
import { DraftCaptainBar } from "./draft-captain-bar";
import { EmptyPoolNotice } from "./empty-pool-notice";
import { SuperTeamPanel } from "./super-team";
import { TeamPlanLane } from "./team-plan";
import { PerPlayerLane } from "./per-player-view";
import { PositionPicker } from "./position-picker";
import { useDotaScreen } from "./screenshot-paste";
import { useLiveParty } from "./use-live-party";
import { usePartyDraft } from "./use-party-draft";
import { PlanForSwitch, TeamSeats } from "./team-seats";
import { BanSlot, EmptySlots, Rail, RailSlot } from "./draft-rails";
import { BetterChance, type DraftOdds } from "./better-chance";
import { useTeamLineup, type PlannableStack } from "./use-team-lineup";
import { DraftDone } from "./start-game";
import { MyPicksLane } from "./my-picks";
import { useGameCheckIn } from "./use-game-check-in";
import { useCheckInActions, useDueCheckIn } from "./use-check-in";
import { CheckInCard } from "./check-in-card";
import { CheckInPrompt } from "@/components/check-in-prompt";
import {
  type DueCheckIn,
  forgetSoloBoardKey,
  gameCheckInEnabled,
  isFullBoard,
  soloBoardKey,
  toCheckInBoard,
} from "@/lib/game-check-in";
import { isTeammate, SOLO_ME } from "@/lib/solo-queue";
import { useSoloBoard } from "./use-solo-board";
import { FollowOnPhone } from "./follow-on-phone";
import { FollowPcPanel, PhoneFollowingChip } from "./follow-pc";
import { isPhone } from "@/lib/solo-draft";

const noSubscribe = () => () => {};

/** What the signed-in player brings to their suggestions. Empty when signed out. */
export interface Player {
  /** Favorite heroes per position; 0 holds heroes for any position. */
  heroes: Record<number, number[]>;
  /** The player's Top 5 per position (1 to 5), hero ids in slot order. */
  top: Record<number, number[]>;
  positions: Position[];
  rank: RankBracket | null;
  personal: Record<number, GamesWins>;
  /** The player's Steam name, as Dota writes it under their slot, to find their side on Watch Dota. */
  steamName?: string | null;
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
const POSITION_KEY = "solo-draft-position";
const NO_STACKS: PlannableStack[] = [];

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
  // Out of a party: your own draft, on the server while signed in so a phone can follow it.
  const solo = useSoloBoard(signedIn && !party ? userId : null);
  // Known only in the browser; the server renders the PC layout.
  const phone = useSyncExternalStore(noSubscribe, isPhone, () => false);
  // Your side changes every game, so it is chosen each time rather than remembered.
  const [partySide, setPartySide] = useState<Side | null>(null);
  const mySide = party ? partySide : solo.side;
  const setMySide = party ? setPartySide : solo.setSide;
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
  const draft = party ? shared.draft : solo.draft;
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
  // Heroes the screen reader put in My team (newest last), and those the player said aren't theirs.
  const [screenAllies, setScreenAllies] = useState<number[]>([]);
  const [notMine, setNotMine] = useState<ReadonlySet<number>>(new Set());
  // The reader found your own slot (by your Steam name or its glow), so it knows which hero is yours.
  const [ownSlotFound, setOwnSlotFound] = useState(false);
  // In a party every screen holds the same lobby positions free, so everyone sees the same guesses.
  const lobbyPositions = (live.party?.members ?? party?.members ?? []).flatMap((m) => (isPosition(m.position) ? [m.position] : []));
  // Team holds the seated players' positions; teammates in open seats go where their hero fits best.
  const seatedPositions = lineup.seats.map((s) => s.position);
  const reserved = party && lobbyPositions.length ? lobbyPositions : lineupPlan ? seatedPositions : [myPosition];
  const resolved = engine ? resolveAllyPositions(allies, reserved, (id) => engine.fit(id)) : [];
  // Enemies get the same picker: the engine's guess dashed, and only the positions a player set count as known.
  const resolvedEnemies = engine ? resolveAllyPositions(draft.filter((e) => e.kind === "enemy"), [], (id) => engine.fit(id)) : [];
  const enemyPositions: EnemyPositions = Object.fromEntries(resolvedEnemies.flatMap((e) => (e.isGuess ? [] : [[e.heroId, e.position]])));
  // The screen shows heroes but not who plays them, so a hero read into My team goes to a guessed position and your
  // picks go on. Until you have a hero, ask about the newest one read whose position nobody set.
  const askPick = mine || ownSlotFound
    ? undefined
    : screenAllies.findLast((id) => !notMine.has(id) && resolved.some((a) => a.heroId === id && a.isGuess));

  // Typing stays inside each search box, so this runs only when the draft or a setting changes.
  // Your heroes for the position and the heroes you have played, best first; a weak one keeps its place and gets a label.
  const favorites = [...(player.heroes[myPosition] ?? []), ...(player.heroes[0] ?? [])];
  const ranked =
    engine && !mine
      ? engine.suggest({
          myPosition,
          allies: allies.map((e) => ({ heroId: e.heroId, position: e.position ?? undefined })),
          enemies,
          enemyPositions,
          bans,
          rankBracket: rank ?? undefined,
          favorites,
          top: player.top[myPosition],
          personal: player.personal,
          count: engine.heroes.length,
        })
      : [];
  const poolIds = new Set(favorites);
  const picks = ownHeroes(ranked, poolIds, {
    played: engine ? playedHeroes(player.personal, (id) => engine.fit(id), myPosition, poolIds) : undefined,
    weak: (s) => weakHere(s, engine ? worstMatchup(engine, s.heroId, enemies, myPosition, rank ?? undefined, enemyPositions) : 0),
  });
  const { list: suggestions, weak, played, fromAll } = picks;
  // Each listed hero against the first: is it a clear best pick, and why is every other one behind it.
  const verdictOf = new Map(engine ? verdicts(suggestions, (id) => engine.hero(id).name, myPosition).map((v) => [v.heroId, v]) : []);
  // Shown after the list and never saved with it: the saved list is the list above.
  const outsider = provenOutsider(ranked, poolIds, picks);

  const allyIds = allies.map((e) => e.heroId);
  const moves = useRankMoves(
    suggestions.map((s) => s.heroId),
    JSON.stringify([allyIds, enemies, enemyPositions, bans]),
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
          rule: listRule(picks),
        })
      : null;
  const { saveSuggestions } = shared;
  useEffect(() => {
    if (!shown) return;
    const { heroes, scores, chance, rule } = JSON.parse(shown) as { heroes: number[]; scores: number[]; chance: number | null; rule: ListRule };
    const timer = setTimeout(() => void saveSuggestions(myPosition, heroes, scores, chance, rule), 1500);
    return () => clearTimeout(timer);
  }, [shown, myPosition, saveSuggestions]);

  // Once both teams are in with every ally's position, the game plan for our side.
  const gamePlan = engine ? finishedDraftPlan(engine, picksByPosition, enemies, bracket, matchups, enemyPositions) : null;

  // The list this player saw last before their pick, kept for the saved game.
  const shownNow = suggestions.slice(0, 8).map((s) => s.heroId);
  const [lastShown, setLastShown] = useState<number[]>([]);
  if (shownNow.length && shownNow.join() !== lastShown.join()) setLastShown(shownNow);
  // A full board is saved as a game for the check-in, while signed in and the flag is on.
  const checkInBoard =
    gameCheckInEnabled() && signedIn && isFullBoard(draft) && (!party || shared.draftId)
      ? toCheckInBoard({
          draft,
          key: party ? null : (solo.boardKey ?? soloBoardKey()),
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

  const act = (...actions: DraftAction[]) => {
    if (locked) return;
    if (party) void shared.act(actions);
    else solo.act(actions);
  };
  // In a party, Undo takes back your own latest entry; the rest of the party keeps theirs.
  const canUndo = party ? shared.lastMine !== null : solo.canUndo;
  const undo = () => {
    if (party) {
      if (shared.lastMine !== null) act({ kind: "remove", heroId: shared.lastMine });
      return;
    }
    solo.undo();
  };
  const startOver = () => {
    setCheckInDone(false);
    setScreenAllies([]);
    setNotMine(new Set());
    setOwnSlotFound(false);
    if (party) void shared.newDraft();
    else {
      void solo.startOver();
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
  /** Sets where an enemy plays, swapping with the enemy set there, so the engine stops guessing it. */
  const placeEnemy = (heroId: number, position: Position | null) =>
    act(...positionActions(resolvedEnemies, heroId, position, "enemy"));
  const choosePosition = (p: Position) => {
    // In Team the player's seat moves too, swapping with whoever sat there.
    if (lineupPlan?.myPosition) lineup.place(SOLO_ME, p);
    setMyPosition(p);
    writeStorage(POSITION_KEY, p);
  };

  const taken = new Set(draft.map((e) => e.heroId));
  const [showKeys, setShowKeys] = useState(false);
  const screen = useDotaScreen({
    enabled: !locked && Object.keys(portraits).length > 0,
    heroes: engine?.heroes ?? [],
    portraits,
    draft,
    side: mySide,
    onSideChange: setMySide,
    steamName: player.steamName ?? null,
    following: party ? undefined : { skipLearn: solo.elsewhere, onAlive: () => solo.beat(true) },
    onRead: (read, side) => {
      // With your own slot found, the hero in it goes to your position; without it, ask which hero is yours.
      const actions = readActions(read, side, taken, mine ? null : myPosition);
      if (actions.length) act(...actions);
      if (read.me) {
        if (!ownSlotFound) setOwnSlotFound(true);
        return;
      }
      const allies = actions.flatMap((a) => (a.kind === "ally" ? [a.heroId] : []));
      if (allies.length) setScreenAllies((ids) => [...ids, ...allies]);
    },
  });
  // When Watch Dota stops, the phone hears it at once instead of after the beats run out.
  const watching = screen.watching;
  const soloBeat = solo.beat;
  useEffect(() => {
    if (!watching) soloBeat(false);
  }, [watching, soloBeat]);
  // Start Over on the other device: this tab's notes about the old board go too.
  const [boardKey, setBoardKey] = useState(solo.boardKey);
  if (solo.boardKey !== boardKey) {
    setBoardKey(solo.boardKey);
    setScreenAllies([]);
    setNotMine(new Set());
    setOwnSlotFound(false);
    setCheckInDone(false);
  }

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
  const planSlots = pool ? toPlanSlots(planMembers, pool, planAllies, planPlayers) : null;
  // Positions whose player has heroes saved for it, so Team Plan labels only real outsiders.
  const pooled = new Set((planSlots ?? []).flatMap((s) => (s.favorites?.length ? [s.position] : [])));
  // The team plan (WCST) for the whole party, planned only while it or Per Player is on screen (Per Player marks
  // the plan's hero per seat and its Pick First). Watchers always see the planner's Team Plan; the planner switches
  // between it, Per Player and their own picks.
  const plan =
    planSlots && (view === "team" || view === "players" || !isPlanner)
      ? planTeam(engine, {
          slots: planSlots,
          enemies,
          enemyPositions,
          bans,
          rankBracket: bracket,
        })
      : null;
  const teamPlan = view === "team" || !isPlanner ? plan : null;
  // Per Player: what each member who still has to pick should take, one hero per player.
  const playerColumns =
    planSlots && isPlanner && view === "players"
      ? perPlayerColumns(engine, {
          slots: planSlots,
          personal: Object.fromEntries(Object.entries(planPlayers).map(([id, p]) => [id, p.personal])),
          enemies,
          enemyPositions,
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

  // The picks list itself, rather than Start Game or your hero: its title hides behind the view tabs.
  const showsPicks = !isFullBoard(draft) && !mine;
  const picksHeading = (
    <>
      Picks for Pos {myPosition} <span className="text-muted">{POSITION_NAMES[myPosition - 1]}</span>
    </>
  );

  // On Dire the Enemy (Radiant) comes first, as in the top bar in Dota. The DOM follows the screen, so Tab goes
  // from box to box left to right.
  const enemyFirst = mySide === "dire";
  const anyGuess = resolved.some((a) => a.isGuess) || resolvedEnemies.some((e) => e.isGuess);
  const secondRail = "border-line max-lg:border-t lg:border-l";
  const myTeamPanel = (
    <Rail
      title="My Team"
      count={`${allies.length}/5`}
      side={mySide ?? "radiant"}
      isSideKnown={mySide !== null}
      className={enemyFirst ? secondRail : ""}
      aside={screen.sideSwitch}
      input={
        !locked &&
        allies.length < TEAM_SIZE && (
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
        )
      }
    >
      {resolved.map((a) => (
        <RailSlot
          key={a.heroId}
          name={hero(a.heroId).name}
          portrait={portraits[a.heroId]}
          side={mySide ?? "radiant"}
          by={captainId ? undefined : enteredBy(a.heroId)}
          onRemove={locked ? undefined : () => act({ kind: "remove", heroId: a.heroId })}
        >
          <PositionPicker
            heroName={hero(a.heroId).name}
            position={a.position}
            isGuess={a.isGuess}
            onChange={locked ? undefined : (p) => placeAlly(a.heroId, p)}
          />
        </RailSlot>
      ))}
      <EmptySlots filled={resolved.length} />
    </Rail>
  );
  const enemyPanel = (
    <Rail
      title="Enemy"
      count={`${enemies.length}/5`}
      side={mySide === "dire" ? "radiant" : "dire"}
      isSideKnown={mySide !== null}
      className={enemyFirst ? "" : secondRail}
      aside={anyGuess && <span className="micro text-subtle">Dashed Is a Guess</span>}
      input={
        !locked &&
        enemies.length < TEAM_SIZE && (
          <HeroInput
            id="enemy"
            placeholder="Enemy pick, e.g. sf2"
            search={search}
            exclude={taken}
            withPosition
            onPick={(picked) =>
              act(
                ...picked.flatMap((p) =>
                  p.position === null
                    ? [{ kind: "enemy" as const, heroId: p.heroId, position: null }]
                    : positionActions(resolvedEnemies, p.heroId, p.position, "enemy"),
                ),
              )
            }
            onUndo={() => undoLast("enemy")}
          />
        )
      }
    >
      {resolvedEnemies.map((e) => (
        <RailSlot
          key={e.heroId}
          name={hero(e.heroId).name}
          portrait={portraits[e.heroId]}
          side={mySide === "dire" ? "radiant" : "dire"}
          by={captainId ? undefined : enteredBy(e.heroId)}
          onRemove={locked ? undefined : () => act({ kind: "remove", heroId: e.heroId })}
        >
          <PositionPicker
            heroName={hero(e.heroId).name}
            position={e.position}
            isGuess={e.isGuess}
            onChange={locked ? undefined : (p) => placeEnemy(e.heroId, p)}
          />
        </RailSlot>
      ))}
      <EmptySlots filled={resolvedEnemies.length} />
    </Rail>
  );
  // The head of the picks section: its title and the view tabs. On the Team Plan and My Picks it heads the lane,
  // where the selected tab names the view, so the title is only read out; players watching see it, having no tabs.
  const hasTabs = Boolean(pool && isPlanner);
  const viewHead = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      <h2
        id={isPlanner ? "picks-title" : "plan-title"}
        ref={isPlanner ? picksTitleRef : undefined}
        tabIndex={-1}
        className={hasTabs && (teamPlan || playerColumns || showsPicks) ? "sr-only" : "section-title"}
      >
        {teamPlan ? "Team Plan" : playerColumns ? "Per Player" : picksHeading}
      </h2>
      {hasTabs && (
        <div className="lane-seg max-md:w-full max-md:[&>button]:flex-1" role="group" aria-label="Suggestions for">
          {!notPlaying && (
            <button aria-pressed={view === "mine"} onClick={() => setView("mine")}>
              My Picks
            </button>
          )}
          <button aria-pressed={view === "players"} onClick={() => setView("players")}>
            Per Player
          </button>
          <button aria-pressed={view === "team"} onClick={() => setView("team")}>
            Team Plan
          </button>
        </div>
      )}
    </div>
  );
  const planHero = (id: number) => ({ name: hero(id).name, portrait: portraits[id] });

  // Your own part of the draft: picks for your position, or your hero once it is in. Its head is the view tabs for
  // the planner and the picks title for players watching: the picks start their lane beside it.
  const myHead = isPlanner ? (
    viewHead
  ) : (
    <h2 id="picks-title" ref={picksTitleRef} tabIndex={-1} className="section-title">
      {picksHeading}
    </h2>
  );
  // All 10 heroes in: both teams in position order as Dota's loading screen shows them, with Start Game when signed in.
  const byPosition = <T extends { position: Position | null }>(list: T[]) =>
    [...list].sort((a, b) => (a.position ?? 6) - (b.position ?? 6));
  const draftDone = isFullBoard(draft) ? (
    <DraftDone
      ours={byPosition(resolved).map((a) => {
        const isYou = a.position === myPosition;
        const playerId = a.position ? teamPlan?.slots.find((slot) => slot.position === a.position)?.playerId : undefined;
        return {
          id: a.heroId,
          name: hero(a.heroId).name,
          portrait: portraits[a.heroId],
          isYou,
          player: !isYou && playerId ? (planNames[playerId] ?? null) : null,
        };
      })}
      theirs={byPosition(resolvedEnemies).map((e) => ({ id: e.heroId, name: hero(e.heroId).name, portrait: portraits[e.heroId] }))}
      isDire={mySide === null ? null : mySide === "dire"}
      edge={draftEdge(engine, allyIds, enemies, bracket)}
      game={
        checkInBoard && !game.answered
          ? {
              ready: game.id !== null,
              startedAt: game.startedAt,
              busy: game.busy,
              error: game.error,
              onStart: () => void game.start(),
              onStop: () => void game.stop(),
              onOver: () => {
                if (!game.id) return;
                // In a party, ask the job to look for the result now.
                if (party && !shared.result) void shared.findResult();
                openCheckInNow(game.id);
              },
            }
          : null
      }
    />
  ) : null;
  const myPart =
    draftDone ? (
      <>
        {myHead}
        {draftDone}
      </>
    ) : mine ? (
      <>
        {myHead}
        <p className="text-sm text-muted">
          You&apos;re on <span className="text-fg">{hero(mine.heroId).name}</span>. Good luck!
        </p>
      </>
    ) : (
      <MyPicksLane
        head={myHead}
        notices={[
          askPick !== undefined && !locked && (
            <DidYouPick
              key="did-you-pick"
              hero={hero(askPick)}
              portrait={portraits[askPick]}
              position={myPosition}
              onYes={() => placeAlly(askPick, myPosition)}
              onNo={() => setNotMine((s) => new Set([...s, askPick]))}
            />
          ),
          signedIn && fromAll && suggestions.length > 0 && (
            <EmptyPoolNotice key="empty-pool" position={myPosition} reason={fromAll} />
          ),
        ].filter((n): n is React.JSX.Element => Boolean(n))}
        picks={suggestions.map((s) => ({
          suggestion: s,
          move: moves.get(s.heroId),
          isWeak: weak.has(s.heroId),
          verdict: verdictOf.get(s.heroId),
          playedGames: played.has(s.heroId) ? (player.personal[s.heroId]?.games ?? null) : null,
          gain: pickGain(engine, s.heroId, allyIds, enemies, bracket),
        }))}
        outsider={
          outsider && {
            entry: { suggestion: outsider.pick, gain: pickGain(engine, outsider.pick.heroId, allyIds, enemies, bracket) },
            text: outsiderText(outsider),
          }
        }
        reacting={reactingTo({
          enemies: enemies.map(hero).map((h) => h.name),
          allies: allyIds.map(hero).map((h) => h.name),
          bans: bans.length,
        })}
        position={myPosition}
        hero={planHero}
        heroes={engine.heroes}
        enemies={enemies}
        onPicked={
          locked
            ? undefined
            : (heroId) => {
                placeAlly(heroId, myPosition);
                refocus("ally");
              }
        }
        onBanned={
          locked
            ? undefined
            : (heroId) => {
                act({ kind: "ban", heroId });
                refocus("bans");
              }
        }
      />
    );

  // Who Has the Better Chance: the draft now, and with the Team Plan's five when there is a plan.
  const oddsOf = (ours: number[]): DraftOdds => ({
    edge: draftEdge(engine, ours, enemies, bracket),
    parts: edgeParts(engine, ours, enemies, bracket),
    chance: teamWinChance(engine, ours, enemies, bracket),
  });

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-line pb-5">
        {/* Two rows that never interleave: the title with the page's actions, then the draft's settings. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl leading-8 font-semibold tracking-tight text-fg">Draft</h1>
            {party && <span className="chip chip-accent micro">Party</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {screen.watchControls}
            {!party && !phone && solo.phoneFollowing && <PhoneFollowingChip />}
            {!party && !phone && signedIn && !solo.phoneFollowing && <FollowOnPhone />}
            <button
              onClick={() => setShowKeys(!showKeys)}
              aria-expanded={showKeys}
              aria-controls="draft-keys"
              aria-label="Keyboard Shortcuts"
              title="Keyboard Shortcuts"
              className="btn btn-secondary btn-sm btn-icon max-md:hidden"
            >
              <Icon name="keyboard" />
            </button>
            {!locked && (
              <>
                <button onClick={undo} disabled={!canUndo} className="btn btn-secondary btn-sm">
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
              </>
            )}
          </div>
        </div>
        {/* Both rows share the same left and right edges: Role and Rank sit under the title and Plan For
            ends under New Draft, so nothing on the action row starts part way across a settings group. On a
            phone the settings stack, so their labels share one width and the controls line up. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 max-sm:[&_.micro]:w-14 max-sm:[&_.micro]:shrink-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="micro text-subtle" id="my-position">
                Role
              </span>
              <div className="lane-seg lane-seg-sm max-sm:[&>button]:px-2.5" role="group" aria-labelledby="my-position">
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    aria-pressed={myPosition === p}
                    title={POSITION_NAMES[p - 1]}
                    onClick={() => choosePosition(p)}
                  >
                    Pos {p}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2">
              <span className="micro text-subtle">Rank</span>
              <select
                value={rank ?? ""}
                onChange={(e) => void setRank(e.target.value ? (Number(e.target.value) as RankBracket) : null)}
                disabled={!isPlanner}
                title={isPlanner ? undefined : `${plannerName} sets the party rank`}
                className="field h-8 w-auto text-sm"
              >
                <option value="">{party ? "Planner's Rank" : "All ranks"}</option>
                {RANKS.map((r, i) => (
                  <option key={r} value={i + 1}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!party && (
            <div>
              <PlanForSwitch
                mode={lineup.mode}
                onJustMe={lineup.justMe}
                onTeam={() => {
                  lineup.team();
                  // The teammates' picks are what Team adds, so show them straight away.
                  setView("players");
                }}
              />
            </div>
          )}
        </div>
        {screen.status}
      </div>

      {!party && phone && solo.synced && solo.ready && (
        <FollowPcPanel
          live={solo.pcWatching}
          stopped={solo.pcStopped}
          empty={!draft.length}
          side={mySide}
          justRead={solo.freshHero !== null ? (hero(solo.freshHero)?.name ?? null) : null}
          onAddByHand={() => allyRef.current?.focus()}
        />
      )}

      {!isPlanner && (
        <section aria-labelledby="picks-title" className="flex flex-col gap-3">
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
        showKeys && (
          <p id="draft-keys" className="text-xs text-subtle">
            Type 2 or 3 letters and press <Kbd>Enter</Kbd>; <Kbd>Tab</Kbd> moves to the next box. Several at once work too
            (<span className="text-muted">pa sf</span>). Add a digit for a hero&apos;s position (<span className="text-muted">cm5</span>, <span className="text-muted">sf2</span>).
            <Kbd>Backspace</Kbd> in an empty box takes the last hero back out. Press <Kbd>PrtScn</Kbd> in Dota, then{" "}
            <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd> here to fill both teams and the bans.
            {party &&
              (captainId
                ? " Your party sees each hero as you enter it."
                : " Everyone in your party sees this draft and can add to it; New draft starts a fresh one for all of you.")}
          </p>
        )
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

      <section
        aria-label="Picks and Bans"
        className="grid rounded-xl bg-surface ring-1 ring-line ring-inset lg:grid-cols-2"
      >
        {enemyFirst ? enemyPanel : myTeamPanel}
        {enemyFirst ? myTeamPanel : enemyPanel}
        <Rail
          title="Bans"
          count={String(bans.length)}
          headingId="bans-title"
          className="border-t border-line"
          isWide
          isSlotsLeft={enemyFirst}
          input={
            !locked && (
              <HeroInput
                id="bans"
                inputRef={bansRef}
                placeholder="Bans, several at once: pa sf am"
                search={search}
                exclude={taken}
                onPick={(picked) => act(...picked.map(({ heroId }) => ({ kind: "ban" as const, heroId })))}
                onUndo={() => undoLast("ban")}
              />
            )
          }
        >
          {bans.map((id) => (
            <BanSlot
              key={id}
              name={hero(id).name}
              portrait={portraits[id]}
              onUnban={locked ? undefined : () => act({ kind: "remove", heroId: id })}
            />
          ))}
        </Rail>
      </section>

      <BetterChance
        now={oddsOf(allyIds)}
        plan={teamPlan ? oddsOf(teamPlan.slots.map((slot) => slot.heroId)) : null}
        picked={allyIds.length + enemies.length}
        side={mySide ?? "radiant"}
      />

      {!party && (
        <TeamSeats
          mode={lineup.mode}
          seats={lineup.seats}
          people={lineup.people}
          stacks={stacks}
          signedIn={signedIn}
          notice={lineup.notice}
          hero={(id) => ({ name: engine.hero(id)?.name ?? "", image: portraits[id] })}
          heroAt={(p) => picksByPosition[p - 1] ?? teamPlan?.slots.find((slot) => slot.position === p)?.heroId ?? null}
          onPlace={lineup.place}
          onRemove={lineup.remove}
          onFill={lineup.fill}
        />
      )}

      <section
        aria-labelledby={isPlanner ? "picks-title" : "plan-title"}
        className={teamPlan ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem]" : "flex flex-col gap-3"}
      >
        {teamPlan ? (
          <>
            <TeamPlanLane
              plan={teamPlan}
              head={viewHead}
              hero={planHero}
              names={planNames}
              myId={party?.userId ?? SOLO_ME}
              pooled={pooled}
              enemies={enemies}
              onPicked={isPlanner ? (heroId, position) => placeAlly(heroId, position) : undefined}
              onBanned={isPlanner ? (heroId) => act({ kind: "ban", heroId }) : undefined}
              onUndo={isPlanner && !locked ? (heroId) => act({ kind: "remove", heroId }) : undefined}
            />
            {/* Beside the lane on a wide screen, level with the first card; under it on smaller ones. */}
            <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-4 xl:pt-[3.375rem]">
              <SuperTeamPanel plan={teamPlan} hero={planHero} enemies={enemies} />
            </aside>
          </>
        ) : playerColumns ? (
          <PerPlayerLane
            head={viewHead}
            columns={playerColumns}
            names={planNames}
            myId={party?.userId ?? SOLO_ME}
            plan={plan}
            draftKey={JSON.stringify([allyIds, enemies, enemyPositions, bans])}
            hero={planHero}
            heroes={engine.heroes}
            enemies={enemies}
            gamesOf={(playerId, heroId) => planPlayers[playerId]?.personal[heroId]?.games ?? null}
            gainOf={(heroId) => pickGain(engine, heroId, allyIds, enemies, bracket)}
            onPicked={(heroId, position) => placeAlly(heroId, position)}
            onBanned={(heroId) => act({ kind: "ban", heroId })}
          />
        ) : !isPlanner ? (
          <>
            {viewHead}
            <p className="text-sm text-muted">Loading the Team Plan…</p>
          </>
        ) : (
          myPart
        )}
        <Announcer
          text={
            entered +
            ((teamPlan || playerColumns) && isPlanner ? "" : mine ? `You're on ${hero(mine.heroId).name}.` : picksSentence(suggestions.map((s) => s.name)))
          }
        />
      </section>

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
      {/* The last game still waiting for its answer: the corner card the other pages show, out of the board's order. */}
      {lastGame && (
        <CheckInPrompt
          key={lastGame.id}
          game={lastGame}
          heroName={lastGame.myHero !== null ? hero(lastGame.myHero).name : null}
          heroImage={lastGame.myHero !== null ? (portraits[lastGame.myHero] ?? null) : null}
          isOnDraft
          onDone={dueCheckIn.clear}
        />
      )}
    </>
  );
}

/**
 * Asks whether a hero the screen reader put in My team is your own pick. Dota's top bar shows heroes, not who
 * plays them, so without an answer the hero takes a guessed position and your picks go on.
 */
export function DidYouPick({
  hero,
  portrait,
  position,
  onYes,
  onNo,
}: {
  hero: HeroInfo;
  portrait?: string;
  position: Position;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div
      role="group"
      aria-labelledby="did-you-pick"
      className="flex flex-wrap items-center gap-x-4 gap-y-4 rounded-xl bg-surface p-5 ring-1 ring-inset ring-line"
    >
      {/* Face and question stay side by side; the buttons go under them when the column is narrow. */}
      <span className="flex min-w-0 flex-1 basis-80 items-center gap-4">
        {portrait && <HeroFace portrait={portrait} name={hero.name} size={48} isDecorative />}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id="did-you-pick" className="font-medium leading-tight text-fg">
            Did you pick {hero.name}?
          </span>
          <span className="text-sm text-muted">
            Read from your Dota screen into My Team. If it&apos;s yours, it takes your Pos {position} spot.
          </span>
        </span>
      </span>
      {/* Secondary, not copper: copper is only for the Best pick. */}
      <span className="flex shrink-0 gap-2">
        <button onClick={onYes} className="btn btn-secondary btn-sm">
          Yes, My Pick
        </button>
        <button onClick={onNo} className="btn btn-secondary btn-sm">
          Not Me
        </button>
      </span>
    </div>
  );
}
