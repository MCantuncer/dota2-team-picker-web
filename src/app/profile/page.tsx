import { redirect } from "next/navigation";
import { getHeroes } from "@/lib/heroes";
import { rankName } from "@/lib/rank";
import { createClient } from "@/lib/supabase/server";
import { FavoritePicker } from "./favorite-picker";
import { NameForm } from "./name-form";
import { SyncButton } from "./sync-button";

export const metadata = { title: "Profile · Dota 2 Team Picker" };

interface GamesWins {
  games: number;
  wins: number;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const [{ data: profile }, { data: favorites }, heroes] = await Promise.all([
    supabase.from("profiles").select("display_name, steam_id, rank_tier, hero_stats, synced_at").eq("id", user.id).single(),
    supabase.from("favorite_heroes").select("hero_id").eq("user_id", user.id),
    getHeroes(),
  ]);

  const isSteam = Boolean(profile?.steam_id);
  const rank = rankName(profile?.rank_tier ?? null);
  const heroById = new Map(heroes.map((h) => [h.id, h]));
  const stats = Object.entries((profile?.hero_stats ?? {}) as Record<string, GamesWins>)
    .map(([id, s]) => ({ hero: heroById.get(Number(id)), ...s }))
    .filter((s) => s.hero)
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <NameForm name={profile?.display_name ?? ""} />
        <p className="text-sm text-zinc-500">
          {isSteam ? "Signed in with Steam." : `Signed in with ${user.email}.`}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rank</h2>
        {isSteam ? (
          <>
            <p className="text-3xl font-bold text-red-400">{rank ?? "Unknown"}</p>
            {!rank && (
              <p className="max-w-prose text-sm text-zinc-400">
                OpenDota could not see your rank. In Dota 2, turn on Settings &gt; Options &gt; Social &gt;{" "}
                <em>Expose Public Match Data</em>, play a match, then refresh.
              </p>
            )}
            {stats.length > 0 && (
              <ul className="flex flex-wrap gap-3 text-sm text-zinc-300">
                {stats.map((s) => (
                  <li key={s.hero!.id} className="rounded-md bg-zinc-900 px-3 py-1.5">
                    {s.hero!.name}: {s.games} games, {Math.round((100 * s.wins) / s.games)}% won
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-3">
              <SyncButton />
              {profile?.synced_at && (
                <span className="text-xs text-zinc-500">
                  Last updated {new Date(profile.synced_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="max-w-prose text-sm text-zinc-400">
            Email accounts get suggestions from all ranks. Sign in with Steam instead to have suggestions tuned to
            your rank and the heroes you win with.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Favorite heroes</h2>
        <p className="text-sm text-zinc-400">Suggestions lean toward heroes you like to play.</p>
        <FavoritePicker heroes={heroes} favorites={(favorites ?? []).map((f) => f.hero_id)} />
      </section>
    </main>
  );
}
