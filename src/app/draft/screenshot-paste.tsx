"use client";

import { type ReactNode, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import type { DraftEntry } from "@/lib/draft";
import type { Side } from "@/lib/draft-reader/geometry";
import { nameToFind } from "@/lib/draft-reader/draw-name";
import { loadReader, pixelsOf } from "@/lib/draft-reader/load";
import { readLooks } from "@/lib/draft-reader/looks-storage";
import type { Ink } from "@/lib/draft-reader/name";
import type { DraftRead, DraftReader } from "@/lib/draft-reader/reader";
import type { HeroInfo } from "@/lib/engine/types";
import { canWatch, useWatchDota, type WatchState } from "./use-watch-dota";

interface DotaScreenProps {
  /** Off while the player can't change the draft (a captain enters it) or the portraits haven't loaded. */
  enabled: boolean;
  heroes: HeroInfo[];
  portraits: Record<number, string>;
  /** The draft so far, to leave heroes in it alone, and to tell heroes added by hand (which Watch Dota learns the look of) from heroes it read. */
  draft: DraftEntry[];
  /** Which side the player is on this game, or null until it is known. The board lays the teams out by it. */
  side: Side | null;
  onSideChange: (side: Side) => void;
  /** The player's Steam name, which Dota writes under their slot: the reader finds their side by it. */
  steamName: string | null;
  onRead: (read: DraftRead, mySide: Side) => void;
  /** Phone Follows Your PC: heroes the phone entered (not to learn from), and a call on every frame read. */
  following?: { skipLearn?: ReadonlySet<number>; onAlive?: () => void };
}

/** The parts of reading the Dota screen, each shown where it belongs on the board. */
export interface DotaScreen {
  /** Watch Dota, or its state with Stop and Save Frame, for the toolbar. */
  watchControls: ReactNode;
  /** The Radiant or Dire switch, for the My Team rail. */
  sideSwitch: ReactNode;
  /** What the reader found or needs, a live region under the toolbar. */
  status: ReactNode;
  /** True while Watch Dota reads the Dota window. */
  watching: boolean;
}

type Status = { kind: "idle" } | { kind: "reading" } | { kind: "done" | "warn" | "error"; text: string };

/**
 * Fills the draft from the Dota screen, two ways: Watch Dota shares the Dota window once and reads it
 * twice a second, or press PrtScn in Dota, come back and press Ctrl+V anywhere on the page. Both teams
 * come from the top bar and the bans from the hero grid. Your side comes from your Steam name under
 * the top bar (and the glow Dota puts under it); you can always set it by hand. Nothing leaves the
 * browser. Returns the parts to place on the board.
 */
export function useDotaScreen({
  enabled,
  heroes,
  portraits,
  draft,
  side,
  onSideChange,
  steamName,
  onRead,
  following,
}: DotaScreenProps): DotaScreen {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Who set the side: the player by hand, or the reader from the screen. A side set by hand stands
  // until the draft is cleared for the next game.
  const [sideBy, setSideBy] = useState<"hand" | "screen" | null>(null);
  const [draftEmpty, setDraftEmpty] = useState(draft.length === 0);
  if ((draft.length === 0) !== draftEmpty) {
    setDraftEmpty(draft.length === 0);
    if (draft.length === 0 && sideBy === "hand") setSideBy(null);
  }
  const reader = useRef<Promise<DraftReader> | null>(null);
  const myName = useRef<Ink[] | null | undefined>(undefined);

  /** Your side for this read: found on the screen, unless you set it by hand. */
  const sideFor = (read: DraftRead): Side | null => {
    if (sideBy === "hand" || !read.me) return side;
    if (read.me.side !== side || sideBy !== "screen") {
      onSideChange(read.me.side);
      setSideBy("screen");
    }
    return read.me.side;
  };

  const watch = useWatchDota(heroes, portraits, draft, side, steamName, (read) => {
    const mine = sideFor(read);
    if (mine) onRead(read, mine);
  }, following);
  // Known only in the browser; the server renders without the button.
  const watchable = useSyncExternalStore(noSubscribe, canWatch, () => false);

  const onPaste = useEffectEvent(async (e: ClipboardEvent) => {
    if (!enabled) return;
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    setStatus({ kind: "reading" });
    try {
      reader.current ??= loadReader(heroes, portraits, readLooks());
      if (myName.current === undefined) myName.current = nameToFind(steamName);
      const [r, px] = await Promise.all([reader.current, pixelsOf(file)]);
      const read = r.read(px, myName.current);
      const mine = sideFor(read);
      if (!mine) {
        setStatus({ kind: "warn", text: `${notFound(steamName)} Choose your team (Radiant or Dire), then paste again.` });
        return;
      }
      onRead(read, mine);
      setStatus(summary(read));
    } catch (err) {
      reader.current = null;
      console.error("Reading the screenshot failed", err);
      setStatus({
        kind: "error",
        text: "Couldn't read that screenshot. Try again, or type the heroes in.",
      });
    }
  });

  useEffect(() => {
    const listener = (e: ClipboardEvent) => void onPaste(e);
    document.addEventListener("paste", listener);
    return () => document.removeEventListener("paste", listener);
  }, []);

  const choose = (s: Side) => {
    onSideChange(s);
    setSideBy("hand");
  };

  return {
    watching: watch.state === "on" || watch.state === "black",
    watchControls:
      enabled && watchable ? (
        watch.state === "off" || watch.state === "failed" || watch.state === "ended" ? (
          <button onClick={watch.start} className="btn btn-secondary btn-sm" aria-label="Watch Dota" title="Watch Dota">
            <span className="flex text-muted">
              <Icon name="play" />
            </span>
            <span className="max-md:hidden">Watch Dota</span>
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <span className={`chip micro ${watch.state === "on" ? "chip-accent" : ""}`}>
              {WATCH_LABEL[watch.state]}
            </span>
            <button onClick={watch.stop} className="btn btn-ghost btn-sm">
              Stop
            </button>
            {watch.state === "on" && (
              <button
                onClick={watch.saveFrame}
                className="btn btn-ghost btn-sm"
                title="Saves what Watch Dota sees now and a log of every change it read this draft, to send us when it misses a pick"
              >
                Save Frame
              </button>
            )}
          </span>
        )
      ) : null,
    sideSwitch: enabled ? (
      <span className="lane-seg lane-seg-sm" role="group" aria-label="My Side">
        {(["radiant", "dire"] as const).map((s) => (
          <button key={s} aria-pressed={side === s} onClick={() => choose(s)} className={`is-${s}`}>
            {s === "radiant" ? "Radiant" : "Dire"}
          </button>
        ))}
      </span>
    ) : null,
    status: (
      <div
        role="status"
        aria-label="Read the Dota screen"
        className="flex basis-full flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle empty:sr-only"
      >
        {enabled && side && sideBy === "screen" && (
          <span className="text-muted">
            Found {steamName ? <bdi>{steamName}</bdi> : "you"} on {side === "radiant" ? "Radiant" : "Dire"}
          </span>
        )}
        {enabled && watch.state === "on" && !side && (
          <span className="text-muted">
            {steamName ? (
              <>
                Looking for <bdi>{steamName}</bdi> under Dota&apos;s top bar. If it doesn&apos;t show, choose your team.
              </>
            ) : (
              "Choose your team so picks go to the right side."
            )}
          </span>
        )}
        {watch.state === "black" && (
          <span className="notice notice-warn text-xs">
            The Dota window looks black. Switch Dota to Borderless Window in its video settings.
          </span>
        )}
        {watch.state === "ended" && (
          <span className="notice text-xs">
            Watch Dota stopped sharing your screen after 4 minutes. Press Watch Dota for the next draft.
          </span>
        )}
        {watch.state === "failed" && (
          <span className="notice notice-error text-xs">
            Couldn&apos;t keep reading the Dota window. Try Watch Dota again.
          </span>
        )}
        {watch.learned !== null && (
          <span className="notice notice-done text-xs">
            Learned how {heroes.find((h) => h.id === watch.learned)?.name ?? "that hero"} looks on your screen. Watch
            Dota reads it by itself from now on.
          </span>
        )}
        {status.kind === "reading" && <span className="text-muted">Reading the screenshot…</span>}
        {(status.kind === "done" || status.kind === "warn" || status.kind === "error") && (
          <span className={`notice notice-${status.kind} text-xs`}>{status.text}</span>
        )}
      </div>
    ),
  };
}

const WATCH_LABEL: Record<Exclude<WatchState, "off" | "failed" | "ended">, string> = {
  starting: "Starting…",
  on: "Watching Dota",
  black: "Watching Dota",
};

const noSubscribe = () => () => {};

/** What the reader looked for and didn't find, to explain why it asks for your side. */
function notFound(steamName: string | null): string {
  return steamName ? `Couldn't find ${steamName} under Dota's top bar.` : "Couldn't find your side on Dota's top bar.";
}

function summary(read: DraftRead): Status {
  const slots = [...read.radiant, ...read.dire];
  const picks = slots.filter((s) => s.heroId !== null).length;
  const unsure = slots.filter((s) => s.unsure).length;
  if (!picks && !read.bans.length)
    return {
      kind: "warn",
      text: "Found no heroes. Paste a screenshot of Dota's hero select screen, taken full screen.",
    };
  const text = `Read ${picks} ${picks === 1 ? "pick" : "picks"} and ${read.bans.length} ${read.bans.length === 1 ? "ban" : "bans"}.`;
  if (unsure)
    return {
      kind: "warn",
      text: `${text} ${unsure} ${unsure === 1 ? "portrait" : "portraits"} not recognised: type ${unsure === 1 ? "it" : "them"} in.`,
    };
  return { kind: "done", text };
}
