import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageTour } from "@/components/page-tour";
import { getHeroes } from "@/lib/heroes";
import { PLAYER_FEEDBACK_SELECT, readPlayerFeedback } from "@/lib/player-feedback";
import { GAMES_PER_PAGE, PLAYER_GAMES_SELECT, readFilters, readGameRow } from "@/lib/player-games";
import { playerRecord, RECORD_DAYS, RECORD_SELECT } from "@/lib/player-record";
import { ResultSquares } from "@/components/result-squares";
import { PageStage } from "@/components/page-stage";
import { gamesVerdict } from "@/lib/games-verdict";
import { createClient } from "@/lib/supabase/server";
import { FeedbackView, MIN_GAMES } from "./feedback-view";
import { type HeroArt, PreviousGames } from "./previous-games";
import { RecordStrip } from "./record-strip";

export const metadata: Metadata = { title: "Your Games · Dota 2 Team Picker" };

/** How many results the squares row shows. */
const LATEST_GAMES = 20;

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

  const [profile, feedbackRow, gameRows, records, heroes] = await Promise.all([
    supabase.from("profiles").select("steam_id").eq("id", user.id).single(),
    supabase.from("player_feedback").select(PLAYER_FEEDBACK_SELECT).eq("user_id", user.id).maybeSingle(),
    games.order("started_at", { ascending: false }).range(from, from + GAMES_PER_PAGE - 1),
    supabase.from("player_game_facts").select(RECORD_SELECT).eq("user_id", user.id),
    // Art is an extra: without it the list shows hero names.
    getHeroes().catch(() => []),
  ]);

  const art = new Map<number, HeroArt>(heroes.map((h) => [h.id, { name: h.name, icon: h.icon, image: h.image }]));
  const record = records.data ? playerRecord(records.data, new Date(), LATEST_GAMES) : null;

  let body: React.ReactNode;
  if (profile.error || feedbackRow.error || gameRows.error || records.error) {
    body = (
      <p role="alert" className="notice notice-error">
        Could not load your games. Reload the page to try again.
      </p>
    );
  } else if (!profile.data.steam_id) {
    body = (
      <div role="status" className="notice items-center">
        <p className="min-w-0 flex-1">Feedback comes from your real games, so it needs your Steam account.</p>
        <Link href="/my-heroes" className="btn btn-secondary btn-sm">
          Connect Steam
        </Link>
      </div>
    );
  } else {
    const feedback = readPlayerFeedback(feedbackRow.data);
    const summary =
      feedback && feedback.games >= MIN_GAMES ? (
        <FeedbackView feedback={feedback} />
      ) : (
        <p role="status" className="notice">
          Feedback shows once we have read {MIN_GAMES} of your ranked or normal games from the last {RECORD_DAYS} days
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
          heroes={art}
          heroOptions={[...new Set(records.data.map((r) => r.hero_id))]}
        />
      </>
    );
  }

  const linked = Boolean(profile.data?.steam_id);
  const showRecord = linked && record !== null && record.games > 0;
  // Without Steam, or when the games could not be read, there is no record to speak of.
  const verdict = gamesVerdict(linked ? record : null, (id) => art.get(id)?.name);
  return (
    <main className="page flex flex-1 flex-col gap-8 overflow-x-clip py-10">
      <div className="flex flex-col gap-5">
        {/* Back on the left, the page's ? on the right, each in its own column. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6">
          <Link href="/my-heroes" className="btn btn-ghost btn-sm -ml-3 justify-self-start text-muted">
            <Icon name="chevronLeft" />
            Back to My Heroes
          </Link>
          <PageTour tour="your-games" />
        </div>
        <PageStage name="Your Games" facts={<span>{verdict.facts}</span>} title={verdict.title} portrait={verdict.heroId ? art.get(verdict.heroId)?.image : undefined}>
          {verdict.line}
        </PageStage>
        {showRecord && record && <RecordStrip record={record} />}
        {showRecord && record && record.latest.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">
              Last {record.latest.length} results: won {record.latest.filter(Boolean).length}
            </span>
            <ResultSquares results={record.latest} />
          </div>
        )}
      </div>
      {body}
    </main>
  );
}
