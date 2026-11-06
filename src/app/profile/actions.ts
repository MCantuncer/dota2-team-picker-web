"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

/** Asks the backend to read the user's rank and hero record from OpenDota again. */
export async function syncRank(): Promise<string | null> {
  const { supabase } = await signedIn();
  const { error } = await supabase.functions.invoke("sync-profile", { method: "POST" });
  // The header shows the Steam name too, which a sync can change.
  revalidatePath("/", "layout");
  return error ? "Could not refresh from OpenDota, try again in a few minutes." : null;
}

/** Deletes the account for good once the player typed "delete". Their Stacks and open party pass to other players. */
export async function deleteAccount(_prev: string | null, form: FormData): Promise<string | null> {
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete") return "Type delete to confirm.";
  const { supabase } = await signedIn();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return "Could not delete your account. Please try again.";
  // The sessions went with the account, so this only clears the cookies here.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
