"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { startedAgo } from "@/lib/game-check-in";

/**
 * Once all 10 heroes are in: Start Game marks the board as a game the player is playing, so we look
 * for its result and ask how it went afterwards. The board stays editable either way. After the start
 * it shows how long ago the game started, with Game Over (ask now) and Not Playing It (undo the start).
 */
export function StartGame({
  heroName,
  ready,
  startedAt,
  busy,
  error,
  onStart,
  onStop,
  onOver,
}: {
  /** The player's own hero, when they have one. */
  heroName: string | null;
  /** False until the full board is saved. */
  ready: boolean;
  startedAt: string | null;
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  /** Opens the check-in now; without it there is no Game Over button. */
  onOver?: () => void;
}) {
  const now = useNow(startedAt !== null);

  if (startedAt) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-radiant-strong bg-radiant-tint px-4 py-3">
          <span className="live-dot text-radiant" aria-hidden />
          <span className="section-title">In Game</span>
          <span className="text-muted">{startedAgo(startedAt, now)}</span>
        </div>
        <p className="text-muted">
          Fix a hero any time. When the game ends we find the result on OpenDota and ask you two quick questions.
        </p>
        <div className="flex flex-wrap gap-2">
          {onOver && (
            <button onClick={onOver} className="btn btn-secondary">
              Game Over
            </button>
          )}
          <button onClick={onStop} disabled={busy} className="btn btn-ghost">
            Not Playing It
          </button>
        </div>
        {error && (
          <p role="status" className="notice notice-error text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="section-title">All 10 Heroes Are In</h3>
        {heroName && (
          <p className="text-muted">
            You&apos;re on <span className="text-fg">{heroName}</span>. Good luck!
          </p>
        )}
      </div>
      <button onClick={onStart} disabled={!ready || busy} className="btn btn-primary btn-lg w-full">
        <Icon name="play" large />
        Start Game
      </button>
      <p className="text-sm text-muted">Press it when the loading screen shows. You can still fix a hero or a position after.</p>
      {error && (
        <p role="status" className="notice notice-error text-sm">
          {error}
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
