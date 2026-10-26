import type { Metadata } from "next";
import type { GamesWins, Position, RankBracket } from "@/lib/engine/types";
import { getHeroes } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/server";
import { DraftBoard, type Player } from "./draft-board";

export const metadata: Metadata = { title: "Draft · Dota 2 Team Picker" };

/** The draft screen for one player: enter both teams as they pick, get 8 heroes for your position. */
export default async function DraftPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Portraits are decoration: if OpenDota is down the screen falls back to hero names.
  const heroesPromise = getHeroes().catch(() => []);
  let player: Player = { heroes: {}, positions: [], rank: null, personal: {} };
  if (user) {
    const [{ data: positions, error: posError }, { data: favorites, error: favError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabase.from("favorite_positions").select("position").eq("user_id", user.id),
        supabase.from("favorite_heroes").select("position, hero_id").eq("user_id", user.id).order("created_at"),
        supabase.from("profiles").select("rank_tier, hero_stats").eq("id", user.id).single(),
      ]);
    const error = posError ?? favError ?? profileError;
    if (error) throw new Error(`Could not load your heroes: ${error.message}`);

    const heroes: Record<number, number[]> = {};
    for (const f of favorites ?? []) (heroes[f.position] ??= []).push(f.hero_id);
    player = {
      heroes,
      positions: (positions ?? []).map((p) => p.position as Position).sort(),
      // rank_tier is medal and star (e.g. 54 = Legend 4); the engine uses the medal.
      rank: profile?.rank_tier ? (Math.floor(profile.rank_tier / 10) as RankBracket) : null,
      personal: (profile?.hero_stats ?? {}) as unknown as Record<number, GamesWins>,
    };
  }
  const portraits = Object.fromEntries((await heroesPromise).map((h) => [h.id, h.image]));

  return (
    <main className="page flex flex-1 flex-col gap-5 py-8">
      <DraftBoard player={player} portraits={portraits} signedIn={Boolean(user)} />
    </main>
  );
}
