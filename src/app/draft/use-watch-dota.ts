"use client";

import { useEffect, useRef, useState } from "react";
import { LiveReads } from "@/lib/draft-reader/actions";
import { loadReaderHeroes } from "@/lib/draft-reader/load";
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
 * twice a second. Only new, steady heroes (and your side, once steady) are passed to onRead. Nothing
 * leaves the browser.
 */
export function useWatchDota(
  heroes: HeroInfo[],
  portraits: Record<number, string>,
  inDraft: Set<number>,
  /** Your Steam name, to find your side by; null without one. */
  steamName: string | null,
  onRead: (read: DraftRead) => void,
) {
  const [state, setState] = useState<WatchState>("off");
  const session = useRef<{ stream: MediaStream; worker: Worker } | null>(null);
  // Replies arrive long after the render that started watching; they must reach the latest draft.
  const latestOnRead = useRef(onRead);
  const latestInDraft = useRef(inDraft);
  const live = useRef<LiveReads | null>(null);
  useEffect(() => {
    latestOnRead.current = onRead;
    latestInDraft.current = inDraft;
    live.current?.saw(inDraft);
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
    } else if ("black" in reply) setState("black");
    else if ("frame" in reply) download(reply.frame);
    else {
      setState("on");
      latestOnRead.current(live.next(reply.read, latestInDraft.current));
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
      live.current = reads;
      worker.onmessage = ({ data }: MessageEvent<WatchReply>) => handle(data, reads);
      worker.onerror = (e) => handle({ error: e.message }, reads);
      const [track] = stream.getVideoTracks();
      track.addEventListener("ended", () => {
        stop();
        setState("off");
      });
      worker.postMessage({ heroes: await loadReaderHeroes(heroes, portraits), name: steamName } satisfies WatchRequest);
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
