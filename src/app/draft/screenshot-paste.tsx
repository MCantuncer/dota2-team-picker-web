"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { Kbd } from "@/components/kbd";
import type { Side } from "@/lib/draft-reader/geometry";
import { loadReader, pixelsOf } from "@/lib/draft-reader/load";
import type { DraftRead, DraftReader } from "@/lib/draft-reader/reader";
import type { HeroInfo } from "@/lib/engine/types";
import { canWatch, useWatchDota, type WatchState } from "./use-watch-dota";

interface ScreenshotPasteProps {
  heroes: HeroInfo[];
  portraits: Record<number, string>;
  onRead: (read: DraftRead, mySide: Side) => void;
}

type Status = { kind: "idle" } | { kind: "reading" } | { kind: "done" | "warn" | "error"; text: string };

/**
 * Fills the draft from the Dota screen, two ways: Watch Dota shares the Dota window once and reads it
 * twice a second, or press PrtScn in Dota, come back and press Ctrl+V anywhere on the page. Both teams
 * come from the top bar and the bans from the hero grid. Nothing leaves the browser.
 */
export function ScreenshotPaste({ heroes, portraits, onRead }: ScreenshotPasteProps) {
  // Your side changes every game, so it is chosen each time rather than remembered.
  const [side, setSide] = useState<Side | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const reader = useRef<Promise<DraftReader> | null>(null);
  const watch = useWatchDota(heroes, portraits, (read) => {
    if (side) onRead(read, side);
  });
  // Known only in the browser; the server renders without the button.
  const watchable = useSyncExternalStore(noSubscribe, canWatch, () => false);

  const onPaste = useEffectEvent(async (e: ClipboardEvent) => {
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    if (!side) {
      setStatus({ kind: "warn", text: "Choose your team first (Radiant or Dire), then paste again." });
      return;
    }
    setStatus({ kind: "reading" });
    try {
      reader.current ??= loadReader(heroes, portraits);
      const [r, px] = await Promise.all([reader.current, pixelsOf(file)]);
      const read = r.read(px);
      onRead(read, side);
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

  const watchAs = (s: Side) => {
    setSide(s);
    watch.start();
  };

  return (
    <section
      aria-label="Read the Dota screen"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle"
    >
      {watchable &&
        (watch.state === "off" || watch.state === "failed" ? (
          <span className="flex items-center gap-2">
            <button onClick={() => watchAs("radiant")} className="btn btn-secondary btn-sm">
              Watch as Radiant
            </button>
            <button onClick={() => watchAs("dire")} className="btn btn-secondary btn-sm">
              Watch as Dire
            </button>
          </span>
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
                title="Saves what Watch Dota sees right now, to send us when it misses a pick"
              >
                Save frame
              </button>
            )}
          </span>
        ))}
      <span>
        Press <Kbd>PrtScn</Kbd> in Dota, then <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd> here to fill both teams and the bans.
      </span>
      <span className="flex items-center gap-2">
        <span className="font-semibold text-muted" id="my-side">
          My team
        </span>
        <span className="seg" role="group" aria-labelledby="my-side">
          {(["radiant", "dire"] as const).map((s) => (
            <button key={s} aria-pressed={side === s} onClick={() => setSide(s)} className="seg-item">
              {s === "radiant" ? "Radiant" : "Dire"}
            </button>
          ))}
        </span>
      </span>
      <span role="status" className="basis-full empty:hidden">
        {watch.state === "black" && (
          <span className="notice notice-warn text-xs">
            The Dota window looks black. Switch Dota to Borderless Window in its video settings.
          </span>
        )}
        {watch.state === "failed" && (
          <span className="notice notice-error text-xs">
            Couldn&apos;t keep reading the Dota window. Try Watch Dota again.
          </span>
        )}
        {status.kind === "reading" && <span className="text-muted">Reading the screenshot…</span>}
        {(status.kind === "done" || status.kind === "warn" || status.kind === "error") && (
          <span className={`notice notice-${status.kind} text-xs`}>{status.text}</span>
        )}
      </span>
    </section>
  );
}

const WATCH_LABEL: Record<Exclude<WatchState, "off" | "failed">, string> = {
  starting: "Starting…",
  on: "Watching Dota",
  black: "Watching Dota",
};

const noSubscribe = () => () => {};

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
