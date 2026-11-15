import { SUPABASE_URL } from "@/lib/supabase/env";
import type { Snapshot } from "./types";

/**
 * The engine's hero data, refreshed 4 times a day by the backend's GitHub Action into the public
 * `hero-data` Supabase Storage bucket. Only this copy has STRATZ positions; the snapshot.json in the
 * backend repo is no longer updated.
 */
export const SNAPSHOT_URL = `${SUPABASE_URL}/storage/v1/object/public/hero-data/snapshot.json`;

/** The download in flight or done, shared by every board on the page, so a remount (New Draft, a party) reuses it. */
let pending: Promise<Snapshot> | null = null;

/**
 * The hero data, downloaded once per page load. The Draft page asks the browser to start this download while the
 * server is still building the page (see draft/loading.tsx), so the fetch here usually finds it already done.
 */
export function loadSnapshot(): Promise<Snapshot> {
  pending ??= download().catch((error: unknown) => {
    // A failed download is tried again on the next call, not kept.
    pending = null;
    throw error;
  });
  return pending;
}

async function download(): Promise<Snapshot> {
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`Hero data download failed (${res.status})`);
  return res.json();
}
