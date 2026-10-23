"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Reads the user's rank and hero record from OpenDota again. */
export async function syncSteam(): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("sync-profile", { method: "POST" });
  // The header shows the rank and Steam picture too.
  revalidatePath("/", "layout");
  return error ? "Could not reach OpenDota. Try again in a few minutes." : null;
}

/** Removes the Steam account and everything copied from it. Steam-only accounts can't do this. */
export async function disconnectSteam(): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("steam-unlink", { method: "POST" });
  revalidatePath("/", "layout");
  return error ? "Could not disconnect Steam. Please try again." : null;
}
