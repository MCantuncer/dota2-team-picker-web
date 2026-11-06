import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHeroes } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/server";
import { FillCheck } from "./fill-check";

export const metadata: Metadata = { title: "Fill Check · Dota 2 Team Picker", robots: { index: false } };

/** Admins only: runs the My Heroes fill on a player's real games without saving anything. */
export default async function FillCheckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
  // Fail closed: anyone we can't confirm as an admin sees the normal 404.
  if (error || profile.user_type !== "admin") notFound();

  const heroes = await getHeroes();
  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="page-title">Fill Check</h1>
        <p className="text-sm text-muted">Runs the My Heroes fill on the last 6 months of real games. Nothing is saved.</p>
      </div>
      <FillCheck heroNames={Object.fromEntries(heroes.map((h) => [h.id, h.name]))} />
    </main>
  );
}
