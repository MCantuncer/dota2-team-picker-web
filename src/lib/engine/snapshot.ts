import type { Snapshot } from "./types";

/** The engine's hero data, refreshed daily on the backend repo's main branch. */
export const SNAPSHOT_URL =
  "https://raw.githubusercontent.com/MCantuncer/dota2-team-picker/main/services/engine/data/snapshot.json";

export async function loadSnapshot(): Promise<Snapshot> {
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`Hero data download failed (${res.status})`);
  return res.json();
}
