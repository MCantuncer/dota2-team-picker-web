import { DraftReader, type DraftRead, type ReaderHero } from "./reader";

/** Sent to the watcher: first the heroes, then the shared window's frames. */
export type WatchRequest = { heroes: ReaderHero[] } | { frames: ReadableStream<VideoFrame> };
/** Sent back about once a second. */
export type WatchReply = { read: DraftRead } | { black: true } | { error: string };

/** One read a second is plenty: a pick takes several seconds to lock in. */
const READ_EVERY_MS = 1000;
/** Frames are scaled down to this height first; the reader works at any height. */
const READ_HEIGHT = 1080;

/** The worker's global scope; the site's TypeScript setup knows only the page's. */
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WatchRequest>) => void) | null;
  postMessage(reply: WatchReply): void;
};
let reader: DraftReader | null = null;

scope.onmessage = ({ origin, data }) => {
  // A dedicated worker only hears from the page that started it, and those messages have an empty
  // origin. Anything else did not come from that page, so it is ignored, as is any unexpected shape.
  if (origin !== "" || typeof data !== "object" || data === null) return;
  if ("heroes" in data && Array.isArray(data.heroes)) reader = new DraftReader(data.heroes);
  else if ("frames" in data && data.frames instanceof ReadableStream) void watch(data.frames);
};

/**
 * Reads the shared Dota window in the background. Runs in a worker so the page keeps reading while
 * Dota is in front.
 */
async function watch(frames: ReadableStream<VideoFrame>) {
  const stream = frames.getReader();
  let canvas: OffscreenCanvas | null = null;
  let last = 0;
  try {
    for (;;) {
      const { value: frame, done } = await stream.read();
      if (done) return;
      const now = performance.now();
      if (reader && now - last >= READ_EVERY_MS) {
        last = now;
        const scale = Math.min(1, READ_HEIGHT / frame.displayHeight);
        const w = Math.round(frame.displayWidth * scale);
        const h = Math.round(frame.displayHeight * scale);
        if (!canvas || canvas.width !== w || canvas.height !== h) canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("This browser can't read the shared window");
        ctx.drawImage(frame, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h);
        scope.postMessage((isBlack(px) ? { black: true } : { read: reader.read(px) }) satisfies WatchReply);
      }
      frame.close();
    }
  } catch (err) {
    scope.postMessage({ error: err instanceof Error ? err.message : String(err) } satisfies WatchReply);
  }
}

/** Exclusive fullscreen games share as a black window. */
function isBlack(px: ImageData): boolean {
  let sum = 0,
    n = 0;
  for (let i = 0; i < px.data.length; i += 4 * 997) {
    sum += px.data[i] + px.data[i + 1] + px.data[i + 2];
    n++;
  }
  return sum / (3 * n) < 4;
}
