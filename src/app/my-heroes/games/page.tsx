import type { Metadata } from "next";
import Link from "next/link";
import { getHeroes } from "@/lib/heroes";
import { PLAYER_FEEDBACK_SELECT, readPlayerFeedback } from "@/lib/player-feedback";
import { GAMES_PER_PAGE, PLAYER_GAMES_SELECT, readFilters, readGameRow } from "@/lib/player-games";
import { createClient } from "@/lib/supabase/server";
import { FeedbackView, MIN_GAMES } from "./feedback-view";
import { PreviousGames } from "./previous-games";

export const metadata: Metadata = { title: "Your Games · Dota 2 Team Picker" };

/** What the player does well and what costs them games, then each previous game. */
export default async function YourGamesPage({ searchParams }: PageProps<"/my-heroes/games">) {
  const filters = readFilters(await searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let games = supabase.from("player_game_facts").select(PLAYER_GAMES_SELECT, { count: "exact" }).eq("user_id", user.id);
  if (filters.heroId) games = games.eq("hero_id", filters.heroId);
  if (filters.position) games = games.eq("position", filters.position);
  if (filters.result) games = games.eq("is_win", filters.result === "won");
  const from = (filters.page - 1) * GAMES_PER_PAGE;

  const [profile, feedbackRow, gameRows, heroIds, heroes] = await Promise.all([
    supabase.from("profiles").select("steam_id").eq("id", user.id).single(),
    supabase.from("player_feedback").select(PLAYER_FEEDBACK_SELECT).eq("user_id", user.id).maybeSingle(),
    games.order("started_at", { ascending: false }).range(from, from + GAMES_PER_PAGE - 1),
    supabase.from("player_game_facts").select("hero_id").eq("user_id", user.id),
    // Art is an extra: without it the list shows hero names.
    getHeroes().catch(() => []),
  ]);

  let body: React.ReactNode;
  if (profile.error || feedbackRow.error || gameRows.error || heroIds.error) {
    body = (
      <p role="alert" className="notice notice-error">
        Could not load your games. Reload the page to try again.
      </p>
    );
  } else if (!profile.data.steam_id) {
    body = (
      <p role="status" className="notice">
        Feedback comes from your real games, so it needs your Steam account.{" "}
        <Link href="/my-heroes" className="link">
          Connect Steam on My Heroes
        </Link>
      </p>
    );
  } else {
    const feedback = readPlayerFeedback(feedbackRow.data);
    const summary =
      feedback && feedback.games >= MIN_GAMES ? (
        <FeedbackView feedback={feedback} />
      ) : (
        <p role="status" className="notice">
          Feedback shows once we have read {MIN_GAMES} of your ranked or normal games from the last 14 days
          {feedback ? (
            <>
              . We have <span className="num">{feedback.games}</span> so far.
            </>
          ) : (
            ". We read new games every 30 minutes."
          )}
        </p>
      );
    body = (
      <>
        {summary}
        <PreviousGames
          rows={gameRows.data.flatMap((r) => readGameRow(r) ?? [])}
          total={gameRows.count ?? 0}
          filters={filters}
          heroes={new Map(heroes.map((h) => [h.id, { name: h.name, icon: h.icon }]))}
          heroOptions={[...new Set(heroIds.data.map((r) => r.hero_id))]}
        />
      </>
    );
  }

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <div className="flex flex-col gap-1.5">
        <Link href="/my-heroes" className="link w-fit text-sm">
          My Heroes
        </Link>
        <h1 className="page-title">Your Games</h1>
        <p className="text-sm text-muted">What you do well and what costs you games, worked out from your own matches.</p>
      </div>
      {body}
    </main>
  );
}
