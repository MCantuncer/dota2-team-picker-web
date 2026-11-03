import type { Metadata } from "next";
import Link from "next/link";
import { PLAYER_FEEDBACK_SELECT, readPlayerFeedback } from "@/lib/player-feedback";
import { createClient } from "@/lib/supabase/server";
import { FeedbackView, MIN_GAMES } from "./feedback-view";

export const metadata: Metadata = { title: "Your Games · Dota 2 Team Picker" };

/** What the player does well and what costs them games, from their own recent matches. */
export default async function YourGamesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, feedbackRow] = await Promise.all([
    supabase.from("profiles").select("steam_id").eq("id", user.id).single(),
    supabase.from("player_feedback").select(PLAYER_FEEDBACK_SELECT).eq("user_id", user.id).maybeSingle(),
  ]);

  let body: React.ReactNode;
  if (profile.error || feedbackRow.error) {
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
    body =
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
