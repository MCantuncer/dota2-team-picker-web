import { SUPABASE_URL } from "@/lib/supabase/env";
import type { Snapshot } from "./types";

/**
 * The engine's hero data, refreshed 4 times a day by the backend's GitHub Action into the public
 * `hero-data` Supabase Storage bucket. Only this copy has STRATZ positions; the snapshot.json in the
 * backend repo is no longer updated.
 */
export const SNAPSHOT_URL = `${SUPABASE_URL}/storage/v1/object/public/hero-data/snapshot.json`;

export async function loadSnapshot(): Promise<Snapshot> {
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`Hero data download failed (${res.status})`);
  return res.json();
}
