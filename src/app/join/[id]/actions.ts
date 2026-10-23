"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

/** Finishes the quick sign up for an invited friend and joins the team. */
export async function joinTeam(_prev: FormState, form: FormData): Promise<FormState> {
  const invite = String(form.get("invite") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Pick a name your team will see." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your sign-in expired. Open the link in your email again." };

  if (password) {
    const { error } = await supabase.auth.updateUser({ password, data: { password_set: true } });
    if (error) return { error: error.message };
  }
  const { error: nameError } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  if (nameError) return { error: nameError.message };

  const { error } = await supabase.rpc("accept_team_invite", { invite });
  if (error) return { error: error.message };
  redirect("/my-heroes?welcome=1");
}
