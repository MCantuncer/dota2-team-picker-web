import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGE_SIZE, readPlayers, readStats } from "@/lib/admin-players";
import { createClient } from "@/lib/supabase/server";
import { NewestPlayers } from "./newest-players";
import { SignupChart, SignupStrip } from "./signup-chart";

export const metadata: Metadata = { title: "Players · Dota 2 Team Picker", robots: { index: false } };

/** Admins only: how many players have signed in with Steam, per day, and who joined last. */
export default async function PlayersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
  // Fail closed: anyone we can't confirm as an admin sees the normal 404. The database checks again.
  if (error || profile.user_type !== "admin") notFound();

  const [statsResult, playersResult] = await Promise.all([
    supabase.rpc("admin_signup_stats"),
    supabase.rpc("admin_newest_players", { max_rows: PAGE_SIZE }),
  ]);
  if (statsResult.error) console.error("Admin signup stats:", statsResult.error.message);
  if (playersResult.error) console.error("Admin newest players:", playersResult.error.message);
  const stats = statsResult.error ? null : readStats(statsResult.data);
  const players = playersResult.error ? null : readPlayers(playersResult.data);
  // One time for every row, so the server and the browser agree on "Today".
  const nowMs = renderedAt();

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="page-title">Players</h1>
        <p className="text-sm text-muted">Everyone who signed in with Steam. Times are Turkey time.</p>
      </div>

      {!stats || !players ? (
        <p role="alert" className="notice notice-error">
          Couldn&apos;t load the player numbers. Please refresh the page.
        </p>
      ) : (
        <>
          <SignupStrip stats={stats} />
          <section aria-labelledby="per-day" className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="per-day" className="section-title">
                Signups per Day
              </h2>
              <span className="text-sm text-muted">Last 14 days</span>
            </div>
            <SignupChart stats={stats} />
          </section>
          <section aria-labelledby="newest" className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="newest" className="section-title">
                Newest Players
              </h2>
              <span className="text-sm text-muted">Newest first</span>
            </div>
            <NewestPlayers initial={players} nowMs={nowMs} />
          </section>
        </>
      )}
    </main>
  );
}

/** A server component renders once per request, so reading the clock here is stable for that render. */
function renderedAt(): number {
  return Date.now();
}
