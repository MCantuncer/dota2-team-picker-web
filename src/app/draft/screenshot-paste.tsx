"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Kbd } from "@/components/kbd";
import type { Side } from "@/lib/draft-reader/geometry";
import { loadReader, pixelsOf } from "@/lib/draft-reader/load";
import type { DraftRead, DraftReader } from "@/lib/draft-reader/reader";
import type { HeroInfo } from "@/lib/engine/types";

const SIDE_KEY = "solo-draft-side";

interface ScreenshotPasteProps {
  heroes: HeroInfo[];
  portraits: Record<number, string>;
  onRead: (read: DraftRead, mySide: Side) => void;
}

type Status = { kind: "idle" } | { kind: "reading" } | { kind: "done" | "warn" | "error"; text: string };

/**
 * Fills the draft from a Dota screenshot: press PrtScn in Dota, come back and press Ctrl+V anywhere
 * on the page. Both teams come from the top bar and the bans from the hero grid. The image never
 * leaves the browser.
 */
export function ScreenshotPaste({ heroes, portraits, onRead }: ScreenshotPasteProps) {
  // The draft board renders only in the browser (after the hero data loads), so storage is there.
  const [side, setSide] = useState<Side>(savedSide);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const reader = useRef<Promise<DraftReader> | null>(null);

  const onPaste = useEffectEvent(async (e: ClipboardEvent) => {
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
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

  const chooseSide = (s: Side) => {
    setSide(s);
    try {
      localStorage.setItem(SIDE_KEY, s);
    } catch {
      // Not remembering the side in this browser is fine.
    }
  };

  return (
    <section aria-label="Read a screenshot" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle">
      <span>
        Press <Kbd>PrtScn</Kbd> in Dota, then <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd> here to fill both teams and the bans.
      </span>
      <span className="flex items-center gap-2">
        <span className="label-caps" id="my-side">
          My team
        </span>
        <span className="seg" role="group" aria-labelledby="my-side">
          {(["radiant", "dire"] as const).map((s) => (
            <button key={s} aria-pressed={side === s} onClick={() => chooseSide(s)} className="seg-item">
              {s === "radiant" ? "Radiant" : "Dire"}
            </button>
          ))}
        </span>
      </span>
      <span role="status" className="basis-full empty:hidden">
        {status.kind === "reading" && <span className="text-muted">Reading the screenshot…</span>}
        {(status.kind === "done" || status.kind === "warn" || status.kind === "error") && (
          <span className={`notice notice-${status.kind} text-xs`}>{status.text}</span>
        )}
      </span>
    </section>
  );
}

function savedSide(): Side {
  try {
    return localStorage.getItem(SIDE_KEY) === "dire" ? "dire" : "radiant";
  } catch {
    return "radiant";
  }
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
