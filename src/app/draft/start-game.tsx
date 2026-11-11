"use client";

import { useEffect, useState } from "react";
import { HeroArt, HeroFace, HeroStage } from "@/components/hero-frame";
import { Icon } from "@/components/icon";
import { startedAgo } from "@/lib/game-check-in";

/** One hero of the finished draft, in position order. */
export interface DoneHero {
  id: number;
  name: string;
  portrait?: string;
  /** The teammate playing it, when the plan knows; never set on the enemy side. */
  player?: string | null;
  isYou?: boolean;
}

/** Start Game and its In Game state, for a signed-in player's saved board. */
export interface GameControls {
  /** False until the full board is saved. */
  ready: boolean;
  startedAt: string | null;
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  /** Opens the check-in now; without it there is no Game Over button. */
  onOver?: () => void;
}

/**
 * All 10 heroes are in: the two teams as Dota's loading screen shows them (Radiant on the left), the player's hero
 * ringed green, and the final draft edge between the teams. With `game`, Start Game marks the board as a game the
 * player is playing, so we look for its result and ask how it went afterwards; after the start it shows how long ago
 * the game started, with Game Over (ask now) and Not Playing It (undo the start). The board stays editable either way.
 */
export function DraftDone({
  ours,
  theirs,
  isDire,
  edge,
  game,
}: {
  ours: DoneHero[];
  theirs: DoneHero[];
  /** The player's side; null when unknown, so the teams are named Your Team and Enemy. */
  isDire: boolean | null;
  /** The draft edge in points, positive for the player's team. */
  edge: number;
  game: GameControls | null;
}) {
  const now = useNow(Boolean(game?.startedAt));
  const ourName = isDire === null ? "Your Team" : isDire ? "Dire" : "Radiant";
  const theirName = isDire === null ? "Enemy" : isDire ? "Radiant" : "Dire";
  const ourTeam = <Team key="ours" name={ourName} heroes={ours} />;
  const theirTeam = (
    <Team key="theirs" name={theirName} heroes={theirs} isEnemy />
  );
  // Radiant on the left, as in Dota.
  const [left, right] = isDire ? [theirTeam, ourTeam] : [ourTeam, theirTeam];
  const isAhead = edge >= 0;

  return (
    <section
      aria-labelledby="draft-done-title"
      className="card flex flex-col gap-6 p-5 sm:p-6"
    >
      <h3 id="draft-done-title" className="section-title">
        All 10 Heroes Are In
      </h3>
      <div className="grid grid-cols-2 gap-x-5 gap-y-6 lg:flex lg:items-start">
        {left}
        {/* The mid lane between the teams, with the final edge on it. */}
        <div className="order-last col-span-2 flex items-center justify-center gap-3 lg:order-none lg:w-28 lg:shrink-0 lg:flex-col lg:self-stretch lg:pt-8">
          <LaneStroke />
          <p className="flex flex-col items-center gap-0.5">
            <span
              className={`num text-2xl font-semibold ${isAhead ? "text-radiant" : "text-dire"}`}
            >
              {isAhead ? "+" : "−"}
              {Math.abs(edge).toFixed(1)}
            </span>
            <span className="micro text-subtle">
              {isAhead ? "Points to You" : "Points to Enemy"}
            </span>
          </p>
          <LaneStroke />
        </div>
        {right}
      </div>
      {game && <GameRow game={game} now={now} />}
    </section>
  );
}

function LaneStroke() {
  return (
    <svg
      width="24"
      height="56"
      viewBox="0 0 24 56"
      aria-hidden
      className="hidden text-subtle lg:block"
    >
      <path d="M2 54 22 2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** One team: render tiles in a row of five on a wide screen, a list of faces on a phone. */
function Team({
  name,
  heroes,
  isEnemy = false,
}: {
  name: string;
  heroes: DoneHero[];
  isEnemy?: boolean;
}) {
  const isRadiant = name === "Radiant" || (name === "Your Team" && !isEnemy);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <p
        className={`micro font-semibold ${isRadiant ? "text-radiant" : "text-dire"}`}
      >
        {name}
      </p>
      <ul
        aria-label={name}
        className="flex min-w-0 flex-col gap-3 sm:grid sm:grid-cols-5 sm:gap-2.5"
      >
        {heroes.map((h) => (
          <li
            key={h.id}
            className="flex min-w-0 items-center gap-3 sm:flex-col sm:items-stretch sm:gap-2"
          >
            <span className="sm:hidden">
              {h.portrait ? (
                <HeroFace
                  portrait={h.portrait}
                  name={h.name}
                  size={36}
                  isEnemy={isEnemy}
                  isDecorative
                />
              ) : (
                <span className="block size-9 rounded-md bg-raised" />
              )}
            </span>
            <HeroStage
              size={120}
              isEnemy={isEnemy}
              className={`aspect-[3/4] w-full max-sm:hidden ${h.isYou ? "lane-cut-you" : ""}`}
            >
              {h.portrait && (
                <HeroArt
                  heroId={h.id}
                  portrait={h.portrait}
                  placement={{ width: 250, at: [0.5, 0.3] }}
                />
              )}
            </HeroStage>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-semibold text-fg">{h.name}</span>
              {h.isYou ? (
                <span className="micro w-fit rounded-full bg-radiant px-2 leading-5 font-semibold text-bg">
                  You
                </span>
              ) : (
                h.player && (
                  <span className="text-xs text-muted">{h.player}</span>
                )
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GameRow({ game, now }: { game: GameControls; now: number }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {game.startedAt ? (
          <>
            <span className="flex items-center gap-3">
              <span className="live-dot text-radiant" aria-hidden />
              <span className="font-semibold text-fg">In Game</span>
              <span className="text-muted">
                {startedAgo(game.startedAt, now)}
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              {game.onOver && (
                <button onClick={game.onOver} className="btn btn-secondary">
                  <Icon name="check" />
                  Game Over
                </button>
              )}
              <button
                onClick={game.onStop}
                disabled={game.busy}
                className="btn btn-secondary"
              >
                <Icon name="x" />
                Not Playing It
              </button>
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-3 text-sm text-muted">
              <Icon name="clock" />
              Start it when the loading screen shows
            </span>
            <button
              onClick={game.onStart}
              disabled={!game.ready || game.busy}
              className="btn btn-primary"
            >
              <Icon name="play" />
              Start Game
            </button>
          </>
        )}
      </div>
      {game.error && (
        <p role="status" className="notice notice-error text-sm">
          {game.error}
        </p>
      )}
    </div>
  );
}

/** The time now, ticking once a minute while `on`. */
function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [on]);
  return now;
}
