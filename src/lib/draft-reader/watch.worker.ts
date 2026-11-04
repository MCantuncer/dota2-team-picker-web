import { slotRects } from "./geometry";
import { DraftReader, type DraftRead, type ReaderHero } from "./reader";
import { logLine, WatchLog } from "./watch-log";

/** Sent to the watcher: first the heroes, then the shared window's frames. */
export type WatchRequest = { heroes: ReaderHero[] } | { frames: ReadableStream<VideoFrame> } | { save: true };
/** Sent back about twice a second, and the last frame read plus the watch log when asked to save it. */
export type WatchReply = { read: DraftRead } | { black: true } | { error: string } | { frame: Blob };

/** Two reads a second: a hero needs two reads in a row, so a pick shows within about a second. */
const READ_EVERY_MS = 500;
/** Frames are scaled down to this height first; the reader works at any height. */
const READ_HEIGHT = 1080;

/** The worker's global scope; the site's TypeScript setup knows only the page's. */
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WatchRequest>) => void) | null;
  postMessage(reply: WatchReply): void;
};
let reader: DraftReader | null = null;
let names = new Map<number, string>();
/** The last frame read, exactly as the reader saw it, kept so the player can save it for a bug report. */
let canvas: OffscreenCanvas | null = null;
/**
 * The top bar each time what the reader saw there changed, with what it read, so one save after the
 * draft shows every pick it caught or missed and why. Nobody has a hand free for screenshots mid draft.
 */
let log = new WatchLog<Promise<ImageBitmap>>();
let started = 0;

scope.onmessage = ({ origin, data }) => {
  // A dedicated worker only hears from the page that started it, and those messages have an empty
  // origin. Anything else did not come from that page, so it is ignored, as is any unexpected shape.
  if (origin !== "" || typeof data !== "object" || data === null) return;
  if ("heroes" in data && Array.isArray(data.heroes)) {
    reader = new DraftReader(data.heroes);
    names = new Map(data.heroes.map((h) => [h.id, h.name]));
  }
  else if ("frames" in data && data.frames instanceof ReadableStream) void watch(data.frames);
  else if ("save" in data && data.save === true) void save();
};

/** Gap and text height of a watch log row, in pixels. */
const ROW_GAP = 6;
const TEXT_H = 22;

/** The last frame read, then the watch log under it: each row the time, what was read, and the top bar. */
async function save() {
  if (!canvas) return;
  const bars = await Promise.all(log.rows.map((r) => r.bar));
  const barH = Math.max(0, ...bars.map((b) => b.height));
  const out = new OffscreenCanvas(canvas.width, canvas.height + log.rows.length * (TEXT_H + barH + ROW_GAP));
  const ctx = out.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  let y = canvas.height;
  log.rows.forEach((row, i) => {
    const s = Math.round(row.seconds);
    ctx.fillText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}  ${row.line}`, 8, y + 3);
    ctx.drawImage(bars[i]!, 0, y + TEXT_H);
    y += TEXT_H + barH + ROW_GAP;
  });
  scope.postMessage({ frame: await out.convertToBlob({ type: "image/png" }) } satisfies WatchReply);
}

/**
 * Reads the shared Dota window in the background. Runs in a worker so the page keeps reading while
 * Dota is in front.
 */
async function watch(frames: ReadableStream<VideoFrame>) {
  const stream = frames.getReader();
  let last = 0;
  log = new WatchLog();
  started = performance.now();
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
        if (isBlack(px)) scope.postMessage({ black: true } satisfies WatchReply);
        else {
          const read = reader.read(px);
          scope.postMessage({ read } satisfies WatchReply);
          keep(read, canvas, now);
        }
      }
      frame.close();
    }
  } catch (err) {
    scope.postMessage({ error: err instanceof Error ? err.message : String(err) } satisfies WatchReply);
  }
}

/** Adds the top bar to the watch log when what was read there changed. */
function keep(read: DraftRead, frame: OffscreenCanvas, now: number) {
  const first = slotRects("radiant", frame.width, frame.height)[0]!;
  const end = slotRects("dire", frame.width, frame.height)[4]!;
  const x = Math.max(0, first.x - first.w / 2);
  const w = Math.min(frame.width, end.x + end.w * 1.5) - x;
  const h = Math.min(frame.height, end.y + end.h * 1.4);
  log.add((now - started) / 1000, logLine(read, (id) => names.get(id) ?? `#${id}`), () =>
    createImageBitmap(frame, Math.round(x), 0, Math.round(w), Math.round(h)),
  );
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
