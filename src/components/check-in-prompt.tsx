"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { POSITION_NAMES } from "@/lib/draft";
import { type DueCheckIn, PICKS_FEELS, type PicksFeel } from "@/lib/game-check-in";
import { isPoolCardHidden } from "@/lib/pool-cards";
import { createClient } from "@/lib/supabase/client";
import { ANSWER_TILE, PICK_ICONS } from "./answer-tile";
import { Icon } from "./icon";

/** How long the thank-you note stays before the card goes. */
const DONE_MS = 4000;

/**
 * "How did your last game go?" bottom right on any page but the sign in and join flows (the Draft page shows
 * it itself, only while the board is empty, since it has the full check-in for the game being drafted): the result, then one tap on Good, Okay or Bad for the picks. Without
 * a found result the player says Victory or Defeat first, or Didn't Play It. The close button and Escape
 * mean Not Now (hidden for 2 hours, at most twice). Waits while an urgent prompt is up.
 */
export function CheckInPrompt({
  game,
  heroName,
  heroImage,
  isOnDraft = false,
  onDone,
}: {
  game: DueCheckIn;
  heroName: string | null;
  heroImage: string | null;
  /** Rendered by the Draft page; the site-wide one stays off it. */
  isOnDraft?: boolean;
  /** Called once the card is gone: answered, snoozed or not played. */
  onDone?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [state, setState] = useState<"open" | "thanks" | "gone">("open");
  const [won, setWon] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const found = game.won !== null;

  useEffect(() => {
    if (state !== "thanks") return;
    const timer = setTimeout(() => setState("gone"), DONE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state === "gone") onDone?.();
  }, [state, onDone]);

  if (state === "gone" || (!isOnDraft && isPoolCardHidden(pathname))) return null;

  const call = async (run: () => PromiseLike<{ error: { message: string } | null }>, after: "thanks" | "gone") => {
    setBusy(true);
    const { error } = await run();
    setBusy(false);
    if (error) {
      console.error("Game check-in:", error.message);
      return setError("Your answer wasn't saved. Try again.");
    }
    setError(null);
    setState(after);
  };
  const notNow = () => call(() => supabase.rpc("snooze_check_in", { check_in: game.id }), "gone");
  const didntPlay = () => call(() => supabase.rpc("answer_check_in", { check_in: game.id, played: false }), "gone");
  const answer = (picks: PicksFeel) => {
    if (!found && won === null) return setError("Tell us if you won or lost first.");
    void call(
      () =>
        supabase.rpc("answer_check_in", {
          check_in: game.id,
          played: true,
          picks,
          ...(!found && won !== null && { did_win: won }),
        }),
      "thanks",
    );
  };

  return (
    <section
      aria-labelledby="check-in-prompt-title"
      onKeyDown={(e) => {
        if (e.key === "Escape" && state === "open" && !busy) void notNow();
      }}
      className="fixed bottom-4 left-4 right-4 z-40 flex flex-col gap-4 rounded-lg border border-line-strong bg-surface p-4 shadow-lg sm:left-auto sm:w-95 [body:has([data-urgent-prompt])_&]:hidden"
    >
      <div className="flex items-center gap-3">
        {heroImage && (
          <Image src={heroImage} alt="" width={96} height={54} className="h-13.5 w-24 shrink-0 rounded-xs object-cover" />
        )}
        <div className="flex min-w-0 grow flex-col gap-1">
          <h2
            id="check-in-prompt-title"
            className={`section-title ${found ? (game.won ? "text-radiant" : "text-dire") : ""}`}
          >
            {found ? (game.won ? "Victory" : "Defeat") : "How Did It Go?"}
          </h2>
          <p className="text-sm text-muted">
            {heroName ? `${heroName}, ${POSITION_NAMES[game.myPosition - 1]}` : `Your last game, ${POSITION_NAMES[game.myPosition - 1]}`}
          </p>
        </div>
        {state === "open" && (
          <button
            onClick={() => void notNow()}
            disabled={busy}
            aria-label="Not now"
            className="btn btn-ghost btn-icon btn-sm -mr-1 self-start"
          >
            <Icon name="x" />
          </button>
        )}
      </div>

      {state === "thanks" ? (
        <p role="status" className="text-sm text-muted">
          Thanks. Your answer tunes the picks.
        </p>
      ) : (
        <>
          {!found && (
            <div role="group" aria-label="Result" className="flex flex-wrap items-center gap-2">
              <button
                aria-pressed={won === true}
                onClick={() => setWon(won === true ? null : true)}
                className="btn grow border-radiant-strong bg-radiant-tint text-radiant aria-pressed:ring-2 aria-pressed:ring-radiant"
              >
                Victory
              </button>
              <button
                aria-pressed={won === false}
                onClick={() => setWon(won === false ? null : false)}
                className="btn grow border-dire-strong bg-dire-tint text-dire aria-pressed:ring-2 aria-pressed:ring-dire"
              >
                Defeat
              </button>
              <button onClick={() => void didntPlay()} disabled={busy} className="btn btn-ghost">
                Didn&apos;t Play It
              </button>
            </div>
          )}
          <div role="group" aria-labelledby="check-in-prompt-picks" className="flex flex-col gap-2">
            <span id="check-in-prompt-picks" className="text-sm text-muted">
              The Picks
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PICKS_FEELS.map((f) => (
                <button key={f.value} onClick={() => answer(f.value)} disabled={busy} className={ANSWER_TILE}>
                  <span className={PICK_ICONS[f.value].tone}>
                    <Icon name={PICK_ICONS[f.value].icon} large />
                  </span>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-dire">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
