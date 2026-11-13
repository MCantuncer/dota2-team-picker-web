import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { getHeroes } from "@/lib/heroes";
import { PLAYER_GAME_SELECT, readGameDetail, readMatchId } from "@/lib/player-game";
import { createClient } from "@/lib/supabase/server";
import { GameView } from "./game-view";

export const metadata: Metadata = { title: "Game Feedback · Dota 2 Team Picker" };

/** One of the player's previous games with its own feedback. Row level security keeps it to their own games. */
export default async function GamePage({ params }: PageProps<"/my-heroes/games/[matchId]">) {
  const matchId = readMatchId((await params).matchId);
  if (matchId === null) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [row, heroes] = await Promise.all([
    supabase.from("player_game_facts").select(PLAYER_GAME_SELECT).eq("user_id", user.id).eq("match_id", matchId).maybeSingle(),
    // Art is an extra: without it the page shows hero names.
    getHeroes().catch(() => []),
  ]);

  let body: React.ReactNode;
  if (row.error) {
    body = (
      <>
        <h1 className="page-title">Game Feedback</h1>
        <p role="alert" className="notice notice-error">
          Could not load this game. Reload the page to try again.
        </p>
      </>
    );
  } else {
    const game = readGameDetail(row.data);
    if (!game) notFound();
    body = <GameView game={game} heroes={new Map(heroes.map((h) => [h.id, { name: h.name, icon: h.icon, image: h.image }]))} />;
  }

  return (
    <main className="page flex flex-1 flex-col gap-6 overflow-x-clip py-10">
      <Link href="/my-heroes/games" className="btn btn-ghost btn-sm -mb-2 -ml-3 self-start">
        <Icon name="chevronLeft" />
        Back to Your Games
      </Link>
      {body}
    </main>
  );
}
