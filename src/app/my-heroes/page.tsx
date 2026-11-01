import type { Metadata } from "next";
import { getHeroes } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/server";
import { PositionHeroes } from "./position-heroes";
import { rankName } from "@/lib/rank";
import { type SteamAccount, SteamLink } from "./steam-link";

export const metadata: Metadata = { title: "My positions and heroes · Dota 2 Team Picker" };

const STEAM_RESULTS: Record<string, { text: string; ok: boolean }> = {
  linked: { text: "Steam linked. Your rank and hero record now count in suggestions and your captain's draft.", ok: true },
  taken: { text: "That Steam account already belongs to another user here.", ok: false },
  failed: { text: "Steam didn't confirm the sign-in. Please try again.", ok: false },
  expired: { text: "That took too long. Please try again.", ok: false },
};

/** SteamID64 of account id 0. */
const STEAM_ID_BASE = BigInt("76561197960265728");
const STEAM_AVATAR = "https://avatars.steamstatic.com/";

interface GamesWins {
  games: number;
  wins: number;
}

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
    supabase
      .from("profiles")
      .select("steam_id, steam_name, avatar_url, rank_tier, hero_stats, synced_at")
      .eq("id", user.id)
      .single(),
    supabase.from("team_members").select("teams(name)").eq("user_id", user.id),
  ]);

  const heroesByPosition: Record<number, number[]> = {};
  for (const f of favorites ?? []) (heroesByPosition[f.position] ??= []).push(f.hero_id);
  const teamNames = (teams ?? []).flatMap((t) => (t.teams ? [(t.teams as unknown as { name: string }).name] : []));
  const steamResult = typeof steam === "string" ? STEAM_RESULTS[steam] : undefined;

  let steamAccount: SteamAccount | null = null;
  if (profile?.steam_id) {
    const heroById = new Map(heroes.map((h) => [h.id, h]));
    const stats = Object.entries((profile.hero_stats ?? {}) as unknown as Record<string, GamesWins>);
    steamAccount = {
      steamId: profile.steam_id,
      accountId: Number(BigInt(profile.steam_id) - STEAM_ID_BASE),
      name: profile.steam_name,
      avatarUrl: profile.avatar_url?.startsWith(STEAM_AVATAR) ? profile.avatar_url : null,
      rank: rankName(profile.rank_tier),
      games: stats.reduce((sum, [, s]) => sum + s.games, 0),
      topHeroes: stats
        .sort(([, a], [, b]) => b.games - a.games)
        .flatMap(([id, s]) => {
          const hero = heroById.get(Number(id));
          return hero ? [{ id: hero.id, name: hero.name, image: hero.image, games: s.games }] : [];
        })
        .slice(0, 3),
      syncedAgo: profile.synced_at ? timeAgo(new Date(profile.synced_at)) : null,
      steamOnly: !user.email || user.email.endsWith("@steam.invalid"),
    };
  }

  return (
    <main className="page flex flex-1 flex-col gap-5 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">{welcome ? "Welcome to the team" : "My positions and heroes"}</h1>
        <p className="text-sm text-muted">
          Pick the positions you play, then your heroes for each one.{" "}
          {teamNames.length > 0 && <>Your captain in {teamNames.join(", ")} drafts from this list. </>}
          Changes save right away.
        </p>
      </div>
      <SteamLink account={steamAccount} result={steamResult} />
      <PositionHeroes
        userId={user.id}
        heroes={heroes}
        initialPositions={(positions ?? []).map((p) => p.position)}
        initialHeroes={heroesByPosition}
      />
    </main>
  );
}

function timeAgo(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
