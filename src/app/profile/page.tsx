import Link from "next/link";
import { redirect } from "next/navigation";
import { getHeroes } from "@/lib/heroes";
import { RankMedal } from "@/components/rank-medal";
import { heroInsights, type HeroSort } from "@/lib/hero-insights";
import { rankName } from "@/lib/rank";
import { FORM_GAMES, recentForm } from "@/lib/recent-form";
import { createClient } from "@/lib/supabase/server";
import { HeroInsightsView } from "./hero-insights-view";
import { NameForm } from "./name-form";
import { RecentFormCard } from "./recent-form-card";
import { ShareHeroesSwitch } from "./share-heroes-switch";
import { SyncButton } from "./sync-button";

export const metadata = { title: "Profile · Dota 2 Team Picker" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const sort: HeroSort = (await searchParams).sort === "won" ? "won" : "games";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const [{ data: profile }, heroes, pool, games] = await Promise.all([
    supabase.from("profiles").select("display_name, steam_id, rank_tier, hero_stats, synced_at, share_heroes_with_friends").eq("id", user.id).single(),
    getHeroes(),
    // Extras: without them the heroes still show, just without pool positions or recent form.
    supabase.from("favorite_heroes").select("position, hero_id").eq("user_id", user.id).gt("position", 0),
    supabase
      .from("player_game_facts")
      .select("is_win, started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(FORM_GAMES),
  ]);

  const isSteam = Boolean(profile?.steam_id);
  const rank = rankName(profile?.rank_tier ?? null);
  const heroById = new Map(heroes.map((h) => [h.id, { name: h.name, image: h.image }]));
  const insights = heroInsights(profile?.hero_stats, sort);
  const positions = new Map<number, number[]>();
  if (pool.error) console.error("Profile pool:", pool.error.message);
  for (const f of pool.data ?? []) positions.set(f.hero_id, [...(positions.get(f.hero_id) ?? []), f.position].sort());
  if (games.error) console.error("Profile recent form:", games.error.message);
  const form = games.error ? null : recentForm(games.data);

  return (
    <main className="page flex flex-col gap-10 py-10">
      <section className="flex flex-col gap-3">
        <h1 className="page-title">Your Profile</h1>
        <NameForm name={profile?.display_name ?? ""} />
        <p className="text-sm text-subtle">{isSteam ? "Signed in with Steam." : `Signed in with ${user.email}.`}</p>
      </section>

      <section aria-labelledby="rank-heading" className="flex flex-col gap-4 border-t border-line pt-6">
        <h2 id="rank-heading" className="section-title">
          Rank
        </h2>
        {isSteam ? (
          <>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  {profile?.rank_tier ? <RankMedal rankTier={profile.rank_tier} size={72} /> : null}
                  <div className="flex flex-col gap-1">
                    <p className="text-3xl font-semibold tracking-[-0.02em] text-fg">{rank ?? "Unknown"}</p>
                    {profile?.synced_at && (
                      <span className="text-xs text-subtle">
                        Last updated {new Date(profile.synced_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                      </span>
                    )}
                  </div>
                </div>
                {!rank && (
                  <p className="max-w-prose text-sm text-muted">
                    OpenDota could not see your rank. In Dota 2, turn on Settings &gt; Options &gt; Social &gt;{" "}
                    <em>Expose Public Match Data</em>, play a match, then refresh.
                  </p>
                )}
                <SyncButton />
              </div>
              <RecentFormCard form={form} />
            </div>
          </>
        ) : (
          <p className="max-w-prose text-sm text-muted">
            Email accounts get suggestions from all ranks.{" "}
            <Link href="/my-heroes" className="link">
              Link your Steam account
            </Link>{" "}
            to have suggestions tuned to your rank and the heroes you win with.
          </p>
        )}
      </section>

      {isSteam && insights && <HeroInsightsView insights={insights} heroes={heroById} pool={positions} sort={sort} />}

      <section aria-labelledby="privacy-heading" className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 id="privacy-heading" className="section-title">
          Privacy
        </h2>
        {/* Until the profile loads, show sharing as off rather than claim it is on. */}
        <ShareHeroesSwitch initialOn={profile?.share_heroes_with_friends ?? false} />
      </section>

      <section aria-labelledby="pool-heading" className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 id="pool-heading" className="section-title">
          Positions and Heroes
        </h2>
        <p className="text-sm text-muted">
          Suggestions lean toward the heroes you pick for each position on{" "}
          <Link href="/my-heroes" className="link">
            My Heroes
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
