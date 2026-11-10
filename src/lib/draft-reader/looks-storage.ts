import { decodeLooks, encodeLooks, type Look } from "./looks";

/** Where this browser keeps the looks Watch Dota learned. */
const KEY = "watch-dota-looks";

/** The looks learned in this browser; none when storage is blocked or holds something unreadable. */
export function readLooks(): Look[] {
  try {
    return decodeLooks(localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/** Keeps the looks for next time. Storage may be full or blocked; reading still works without it. */
export function saveLooks(looks: Look[]) {
  try {
    localStorage.setItem(KEY, encodeLooks(looks));
  } catch {
    // Learned looks only save typing next game; nothing to tell the player.
  }
}
