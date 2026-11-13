import type { Metadata } from "next";
import { getHeroes } from "@/lib/heroes";
import { liveCards, poolCardsEnabled, type PoolCard } from "@/lib/pool-cards";
import { createClient } from "@/lib/supabase/server";
import { PoolCardsSwitch } from "./pool-cards-switch";
import { PositionHeroes } from "./position-heroes";
import { rankName } from "@/lib/rank";
import { type SteamAccount, SteamCard } from "./steam-card";
import { YourGamesCard } from "./your-games-card";
import { PageTour } from "@/components/page-tour";
import { type FillAdded, FillButton, FillCard, FillProvider } from "./hero-fill";
import { type FillNumbers, fillNumbers, topByPosition } from "@/lib/top-heroes";
import { type PlayerRecord, playerRecord, RECORD_SELECT } from "@/lib/player-record";
import { readSupportCopy } from "@/lib/support-copy";

export const metadata: Metadata = { title: "My Heroes · Dota 2 Team Picker" };

/** SteamID64 of account id 0. */
const STEAM_ID_BASE = BigInt("76561197960265728");
const STEAM_AVATAR = "https://avatars.steamstatic.com/";

interface GamesWins {
  games: number;
  wins: number;
}

/** The positions a user plays and their heroes for each, which their captain drafts from. */
export default async function MyHeroesPage({ searchParams }: PageProps<"/my-heroes">) {
  const { welcome } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [heroes, { data: positions }, { data: favorites }, { data: profile }, { data: teams }] = await Promise.all([
    getHeroes(),
    supabase.from("favorite_positions").select("position").eq("user_id", user.id),
    supabase.from("favorite_heroes").select("position, hero_id, top_slot, copied_from").eq("user_id", user.id).gt("position", 0).order("created_at"),
    supabase
      .from("profiles")
      .select(
        "steam_id, steam_name, avatar_url, rank_tier, hero_stats, synced_at, pool_suggestions_off, trends_state, support_copy, support_copy_from, hero_fill_state, hero_fill_at, hero_fill_games, hero_fill_next_at",
      )
      .eq("id", user.id)
      .single(),
    supabase.from("team_members").select("teams(name)").eq("user_id", user.id),
  ]);

  const heroesByPosition: Record<number, number[]> = {};
  const copiedFrom: Record<string, number> = {};
  for (const f of favorites ?? []) {
    (heroesByPosition[f.position] ??= []).push(f.hero_id);
    if (f.copied_from) copiedFrom[`${f.position}:${f.hero_id}`] = f.copied_from;
  }
  const topHeroes = topByPosition(favorites ?? []);
  const teamNames = (teams ?? []).flatMap((t) => (t.teams ? [(t.teams as unknown as { name: string }).name] : []));

  const showCards = Boolean(profile?.steam_id) && poolCardsEnabled();
  let suggestions: PoolCard[] = [];
  if (showCards && !profile?.pool_suggestions_off) {
    const { data, error } = await supabase
      .from("pool_suggestions")
      .select("id, hero_id, position, status, question, reason, snooze_until")
      .eq("user_id", user.id)
      .in("status", ["open", "snoozed"])
      .order("created_at", { ascending: false });
    // Suggestions are extra: without them the page still works.
    if (error) console.error("My Heroes pool cards:", error.message);
    else suggestions = liveCards(data);
  }

  // Your Games card: extra, so a failed read only leaves its numbers out.
  let gamesRecord: PlayerRecord | null = null;
  const feedbackCounts = { strengths: 0, problems: 0 };
  if (profile?.steam_id) {
    const [games, feedback] = await Promise.all([
      supabase.from("player_game_facts").select(RECORD_SELECT).eq("user_id", user.id),
      supabase.from("player_feedback").select("findings").eq("user_id", user.id).maybeSingle(),
    ]);
    if (games.error) console.error("My Heroes games record:", games.error.message);
    else gamesRecord = playerRecord(games.data, new Date());
    if (feedback.error) console.error("My Heroes feedback:", feedback.error.message);
    else if (Array.isArray(feedback.data?.findings)) {
      for (const f of feedback.data.findings as { tone?: unknown }[]) {
        if (f?.tone === "strength") feedbackCounts.strengths += 1;
        if (f?.tone === "problem") feedbackCounts.problems += 1;
      }
    }
  }

  // The heroes the fill added that are still listed, for the summary card and each hero's card. Extra: a failed
  // read hides the card and the numbers.
  const added: FillAdded = { count: 0, heroes: [] };
  let filled: Record<string, FillNumbers> = {};
  if (profile?.steam_id && profile.hero_fill_state) {
    const { data, error } = await supabase
      .from("hero_fill_picks")
      .select("position, hero_id, games, wins, last_played")
      .eq("user_id", user.id);
    if (error) console.error("My Heroes fill picks:", error.message);
    else {
      filled = fillNumbers(data);
      const heroById = new Map(heroes.map((h) => [h.id, h]));
      added.count = data.length;
      // A hero filled on two positions shows once.
      const seen = new Set<number>();
      for (const p of [...data].sort((a, b) => b.games - a.games)) {
        const hero = heroById.get(p.hero_id);
        if (!hero || seen.has(hero.id) || seen.size === 3) continue;
        seen.add(hero.id);
        added.heroes.push({ id: hero.id, name: hero.name, image: hero.image });
      }
    }
  }
  const fillRow = {
    hero_fill_state: profile?.hero_fill_state ?? null,
    hero_fill_at: profile?.hero_fill_at ?? null,
    hero_fill_games: profile?.hero_fill_games ?? null,
    hero_fill_next_at: profile?.hero_fill_next_at ?? null,
  };

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
    };
  }

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      {/* The ? gets its own column, so the intro wraps beside it and never runs under it. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="page-title">{welcome ? "Welcome to the Team" : "My Heroes"}</h1>
          <p className="text-sm text-muted">
            Pick the positions you play, then your heroes for each one.{" "}
            {teamNames.length > 0 && <>Your captain in {teamNames.join(", ")} drafts from this list. </>}
            Changes save right away.
          </p>
        </div>
        <PageTour tour="my-heroes" />
      </div>
      <FillProvider row={fillRow} steamLinked={Boolean(profile?.steam_id)}>
        <FillCard added={added} />
        {steamAccount && <SteamCard account={steamAccount} />}
        {steamAccount && (
          <YourGamesCard record={gamesRecord} strengths={feedbackCounts.strengths} problems={feedbackCounts.problems} />
        )}
        <PositionHeroes
          // A fresh list after the switch changes or a fill finishes, since the lists are copied into state.
          key={`${suggestions.map((s) => s.id).join(",")}|${fillRow.hero_fill_state === "done" ? fillRow.hero_fill_at : ""}`}
          suggestions={suggestions}
          options={
            showCards && (
              <PoolCardsSwitch initialOn={!profile?.pool_suggestions_off} gamesHidden={profile?.trends_state === "hidden"} />
            )
          }
          userId={user.id}
          heroes={heroes}
          initialPositions={(positions ?? []).map((p) => p.position)}
          initialHeroes={heroesByPosition}
          initialSupportCopy={readSupportCopy(profile?.support_copy, profile?.support_copy_from)}
          headingAction={<FillButton />}
          initialTop={topHeroes}
          fillNumbers={filled}
          initialCopiedFrom={copiedFrom}
        />
      </FillProvider>
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
