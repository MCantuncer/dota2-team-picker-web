import { SUPABASE_URL } from "@/lib/supabase/env";
import type { Snapshot } from "./types";

/** The engine's hero data, refreshed daily by the backend's GitHub Action into Supabase Storage. */
export const SNAPSHOT_URL = `${SUPABASE_URL}/storage/v1/object/public/hero-data/snapshot.json`;

export async function loadSnapshot(): Promise<Snapshot> {
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`Hero data download failed (${res.status})`);
  return res.json();
}
