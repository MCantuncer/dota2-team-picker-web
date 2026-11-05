import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getHeroes } from "@/lib/heroes";
import { RankMedal } from "@/components/rank-medal";
import { rankName } from "@/lib/rank";
import { createClient } from "@/lib/supabase/server";
import { NameForm } from "./name-form";
import { ShareHeroesSwitch } from "./share-heroes-switch";
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

  const [{ data: profile }, heroes] = await Promise.all([
    supabase.from("profiles").select("display_name, steam_id, rank_tier, hero_stats, synced_at, share_heroes_with_friends").eq("id", user.id).single(),
    getHeroes(),
  ]);

  const isSteam = Boolean(profile?.steam_id);
  const rank = rankName(profile?.rank_tier ?? null);
  const heroById = new Map(heroes.map((h) => [h.id, h]));
  const stats = Object.entries((profile?.hero_stats ?? {}) as unknown as Record<string, GamesWins>)
    .map(([id, s]) => ({ hero: heroById.get(Number(id)), ...s }))
    .filter((s) => s.hero)
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);

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
            {stats.length > 0 && (
              <ul aria-label="Most played heroes" className="grid max-w-2xl divide-y divide-line border-y border-line">
                {stats.map((s) => (
                  <li key={s.hero!.id} className="flex items-center gap-3 py-2 text-sm">
                    <Image src={s.hero!.image} alt="" width={64} height={36} unoptimized className="rounded-xs" />
                    <span className="flex-1 font-medium text-fg">{s.hero!.name}</span>
                    <span className="num text-muted">{s.games} games</span>
                    <span className="num w-24 text-right text-fg">Won {Math.round((100 * s.wins) / s.games)}%</span>
                  </li>
                ))}
              </ul>
            )}
            <SyncButton />
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

      <section aria-labelledby="privacy-heading" className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 id="privacy-heading" className="section-title">
          Privacy
        </h2>
        {/* Until the profile loads, show sharing as off rather than claim it is on. */}
        <ShareHeroesSwitch initialOn={profile?.share_heroes_with_friends ?? false} />
      </section>

      <section aria-labelledby="heroes-heading" className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 id="heroes-heading" className="section-title">
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
