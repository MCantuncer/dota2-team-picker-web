import type { Metadata } from "next";
import Link from "next/link";
import { getHeroes } from "@/lib/heroes";
import { PLAYER_FEEDBACK_SELECT, readPlayerFeedback } from "@/lib/player-feedback";
import { GAMES_PER_PAGE, PLAYER_GAMES_SELECT, readFilters, readGameRow } from "@/lib/player-games";
import { type PlayerRecord, playerRecord, RECORD_DAYS, RECORD_SELECT } from "@/lib/player-record";
import { ResultSquares } from "@/components/result-squares";
import { HeroRender } from "@/components/hero-render";
import { createClient } from "@/lib/supabase/server";
import { FeedbackView, MIN_GAMES } from "./feedback-view";
import { type HeroArt, PreviousGames } from "./previous-games";
import { RecordStrip } from "./record-strip";

export const metadata: Metadata = { title: "Your Games · Dota 2 Team Picker" };

/** How many results the squares row shows. */
const LATEST_GAMES = 20;
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** What the feedback is worked out from, with the real count and dates when there are games. */
function introText(record: PlayerRecord | null) {
  const start = "What you do well and what costs you games, worked out from your";
  if (!record?.games || !record.firstAt || !record.lastAt) {
    return `${start} ranked and normal games of the last ${RECORD_DAYS} days.`;
  }
  const first = dateFormat.format(new Date(record.firstAt));
  const last = dateFormat.format(new Date(record.lastAt));
  const span = first === last ? `on ${first}` : `between ${first} and ${last}`;
  return `${start} ${record.games} ranked and normal ${record.games === 1 ? "game" : "games"} ${span}.`;
}

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
  const topHero = record?.topHero ? art.get(record.topHero.id) : undefined;

  let body: React.ReactNode;
  if (profile.error || feedbackRow.error || gameRows.error || records.error) {
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

  const showRecord = Boolean(profile.data?.steam_id) && record !== null && record.games > 0;
  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <section aria-labelledby="your-games-title" className="relative isolate flex min-h-60 flex-col gap-5">
        {showRecord && (
          <HeroRender
            portrait={topHero?.image}
            className="absolute -right-16 -top-4 -z-10 w-[min(26rem,70vw)] opacity-70 sm:-right-4 sm:opacity-100"
          />
        )}
        <div className="flex flex-col gap-1.5">
          <Link href="/my-heroes" className="link w-fit text-sm">
            My Heroes
          </Link>
          <h1 id="your-games-title" className="page-title">
            Your Games
          </h1>
          <p className="max-w-xl text-sm text-muted">{introText(showRecord ? record : null)}</p>
        </div>
        {showRecord && record && <RecordStrip record={record} hero={topHero} />}
        {showRecord && record && record.latest.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm text-subtle">
              Last {record.latest.length} results: won {record.latest.filter(Boolean).length}
            </span>
            <ResultSquares results={record.latest} />
          </div>
        )}
      </section>
      {body}
    </main>
  );
}
