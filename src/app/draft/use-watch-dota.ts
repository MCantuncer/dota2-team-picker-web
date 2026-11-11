"use client";

import { useEffect, useRef, useState } from "react";
import type { DraftEntry } from "@/lib/draft";
import { LiveReads } from "@/lib/draft-reader/actions";
import type { Side } from "@/lib/draft-reader/geometry";
import { loadReaderHeroes } from "@/lib/draft-reader/load";
import { addLook, forgetHero, type Look } from "@/lib/draft-reader/looks";
import { readLooks, saveLooks } from "@/lib/draft-reader/looks-storage";
import type { DraftRead } from "@/lib/draft-reader/reader";
import type { WatchReply, WatchRequest } from "@/lib/draft-reader/watch.worker";
import type { HeroInfo } from "@/lib/engine/types";

/** Chrome's reader for a video track's frames (missing from TypeScript's page types). */
declare const MediaStreamTrackProcessor: new (init: { track: MediaStreamTrack }) => {
  readable: ReadableStream<VideoFrame>;
};

export type WatchState = "off" | "starting" | "on" | "black" | "failed";

/** Window sharing plus reading frames in a worker: Chrome and Edge on a computer. */
export function canWatch(): boolean {
  return (
    typeof window !== "undefined" &&
    // Dota runs on a desktop with a mouse; phones and tablets have no Dota window to share.
    window.matchMedia("(pointer: fine)").matches &&
    "MediaStreamTrackProcessor" in window &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function"
  );
}

/**
 * Live read: the player shares the Dota window once, and a worker reads the picks and bans off it
 * twice a second. Only new, steady heroes (and your side, once steady) are passed to onRead. A hero the player adds by hand while
 * watching teaches the reader how that hero looks on their screen (a persona or other cosmetic art),
 * so it reads that hero itself next time. Nothing leaves the browser.
 */
export function useWatchDota(
  heroes: HeroInfo[],
  portraits: Record<number, string>,
  draft: DraftEntry[],
  /** The player's side this game, to know which top bar team a hero added by hand is in. */
  side: Side | null,
  /** Your Steam name, to find your side by; null without one. */
  steamName: string | null,
  onRead: (read: DraftRead) => void,
  following: {
    /** Heroes the player's phone entered: the reader didn't miss them, so it must not learn a look from them. */
    skipLearn?: ReadonlySet<number>;
    /** Called on every frame the worker reads (or finds black), so the phone knows the PC is still reading. */
    onAlive?: () => void;
  } = {},
) {
  const inDraft = new Set(draft.map((e) => e.heroId));
  const [state, setState] = useState<WatchState>("off");
  /** The hero whose look was learned last, to tell the player. */
  const [learned, setLearned] = useState<number | null>(null);
  const session = useRef<{ stream: MediaStream; worker: Worker } | null>(null);
  // Replies arrive long after the render that started watching; they must reach the latest draft.
  const latestOnRead = useRef(onRead);
  const latestFollowing = useRef(following);
  const latestInDraft = useRef(inDraft);
  const live = useRef<LiveReads | null>(null);
  // Heroes the reader passed on this session, and those of them it read by a learned look.
  const offered = useRef(new Set<number>());
  const byLook = useRef(new Set<number>());
  // Every hero that has been on a team this session, by its team, to spot heroes added or removed by hand.
  const teams = useRef(new Map<number, "ally" | "enemy">());
  useEffect(() => {
    latestOnRead.current = onRead;
    latestFollowing.current = following;
    latestInDraft.current = inDraft;
    live.current?.saw(inDraft);
    const worker = session.current?.worker;
    const now = new Map(draft.flatMap((e) => (e.kind === "ban" ? [] : [[e.heroId, e.kind] as const])));
    if (worker && side) {
      const removed = [...teams.current.keys()].filter((id) => !now.has(id));
      for (const [heroId, kind] of now) {
        if (teams.current.has(heroId) || offered.current.has(heroId) || following.skipLearn?.has(heroId)) continue;
        // Added by hand: the reader missed it, so it learns how it looks on this screen.
        const team = kind === "ally" ? side : side === "radiant" ? "dire" : "radiant";
        worker.postMessage({ learn: { heroId, side: team, removed } } satisfies WatchRequest);
      }
      for (const heroId of removed) {
        if (!byLook.current.has(heroId)) continue;
        // Read by a learned look and taken out by hand: that look was wrong.
        byLook.current.delete(heroId);
        worker.postMessage({ forget: heroId } satisfies WatchRequest);
        saveLooks(forgetHero(readLooks(), heroId));
      }
    }
    for (const [heroId, kind] of now) teams.current.set(heroId, kind);
  });

  const stop = () => {
    session.current?.stream.getTracks().forEach((t) => t.stop());
    session.current?.worker.terminate();
    session.current = null;
  };

  const handle = (reply: WatchReply, live: LiveReads) => {
    if ("error" in reply) {
      console.error("Watching Dota failed", reply.error);
      stop();
      setState("failed");
    } else if ("black" in reply) {
      setState("black");
      latestFollowing.current.onAlive?.();
    }
    else if ("frame" in reply) download(reply.frame);
    else if ("learned" in reply) {
      saveLooks(addLook(readLooks(), reply.learned));
      setLearned(reply.learned.heroId);
    } else {
      setState("on");
      latestFollowing.current.onAlive?.();
      const read = live.next(reply.read, latestInDraft.current);
      for (const slot of [...read.radiant, ...read.dire]) {
        if (slot.heroId === null) continue;
        offered.current.add(slot.heroId);
        if (slot.learned) byLook.current.add(slot.heroId);
      }
      latestOnRead.current(read);
    }
  };

  const start = async () => {
    stop();
    setState("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false });
    } catch {
      // The player closed the browser's prompt.
      setState("off");
      return;
    }
    try {
      const worker = new Worker(new URL("../../lib/draft-reader/watch.worker.ts", import.meta.url), { type: "module" });
      session.current = { stream, worker };
      const reads = new LiveReads();
      reads.saw(latestInDraft.current);
      offered.current = new Set();
      byLook.current = new Set();
      teams.current = new Map(draft.flatMap((e) => (e.kind === "ban" ? [] : [[e.heroId, e.kind] as const])));
      setLearned(null);
      live.current = reads;
      worker.onmessage = ({ data }: MessageEvent<WatchReply>) => handle(data, reads);
      worker.onerror = (e) => handle({ error: e.message }, reads);
      const [track] = stream.getVideoTracks();
      track.addEventListener("ended", () => {
        stop();
        setState("off");
      });
      const looks: Look[] = readLooks();
      worker.postMessage({ heroes: await loadReaderHeroes(heroes, portraits), looks, name: steamName } satisfies WatchRequest);
      const { readable } = new MediaStreamTrackProcessor({ track });
      worker.postMessage({ frames: readable } satisfies WatchRequest, [readable]);
    } catch (err) {
      console.error("Watching Dota failed", err);
      stop();
      setState("failed");
    }
  };

  useEffect(() => stop, []);

  return {
    state,
    learned,
    start: () => void start(),
    /** Downloads the last frame read, for reporting a pick it missed. */
    saveFrame: () => session.current?.worker.postMessage({ save: true } satisfies WatchRequest),
    stop: () => {
      stop();
      setState("off");
    },
  };
}

function download(frame: Blob) {
  const url = URL.createObjectURL(frame);
  const link = document.createElement("a");
  link.href = url;
  link.download = `watch-dota-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
