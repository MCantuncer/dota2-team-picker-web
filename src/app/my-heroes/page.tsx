import type { Metadata } from "next";
import { getHeroes } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/server";
import { PositionHeroes } from "./position-heroes";
import { SteamLink } from "./steam-link";

export const metadata: Metadata = { title: "My positions and heroes · Dota 2 Team Picker" };

const STEAM_RESULTS: Record<string, string> = {
  linked: "Steam account linked. Your rank and hero record now count.",
  taken: "That Steam account already belongs to another user here.",
  failed: "Steam didn't confirm the sign-in. Please try again.",
  expired: "That took too long. Please try again.",
};

/** The positions a user plays and their heroes for each, which their captain drafts from. */
export default async function MyHeroesPage({ searchParams }: PageProps<"/my-heroes">) {
  const { welcome, steam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [heroes, { data: positions }, { data: favorites }, { data: profile }, { data: teams }] = await Promise.all([
    getHeroes(),
    supabase.from("favorite_positions").select("position").eq("user_id", user.id),
    supabase.from("favorite_heroes").select("position, hero_id").eq("user_id", user.id).gt("position", 0).order("created_at"),
    supabase.from("profiles").select("steam_id").eq("id", user.id).single(),
    supabase.from("team_members").select("teams(name)").eq("user_id", user.id),
  ]);

  const heroesByPosition: Record<number, number[]> = {};
  for (const f of favorites ?? []) (heroesByPosition[f.position] ??= []).push(f.hero_id);
  const teamNames = (teams ?? []).flatMap((t) => (t.teams ? [(t.teams as unknown as { name: string }).name] : []));
  const steamResult = typeof steam === "string" ? STEAM_RESULTS[steam] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{welcome ? "Welcome to the team" : "My positions and heroes"}</h1>
        <p className="text-sm text-zinc-400">
          Pick the positions you play, then your heroes for each one.{" "}
          {teamNames.length > 0 && <>Your captain in {teamNames.join(", ")} drafts from this list. </>}
          Changes save right away.
        </p>
      </div>
      <SteamLink linked={Boolean(profile?.steam_id)} result={steamResult} />
      <PositionHeroes
        userId={user.id}
        heroes={heroes}
        initialPositions={(positions ?? []).map((p) => p.position)}
        initialHeroes={heroesByPosition}
      />
    </main>
  );
}
