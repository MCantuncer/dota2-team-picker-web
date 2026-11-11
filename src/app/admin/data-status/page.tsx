import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BACKFILL_HOURS,
  BACKFILL_MINUTE,
  fillStatus,
  HEROES_PER_POSITION,
  nextRun,
  patchVersion,
  readFill,
  readSnapshot,
  REFRESH_HOURS,
  REFRESH_MINUTE,
  twoPathStatus,
} from "@/lib/admin-data-status";
import type { Snapshot } from "@/lib/engine/types";
import { getHeroes } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/server";
import { FillLanes, JobCard } from "./data-status";

export const metadata: Metadata = { title: "Data Status · Dota 2 Team Picker", robots: { index: false } };

/** Admins only: how far the two-path builds and the matchup backfill have come, with run times. */
export default async function DataStatusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
  // Fail closed: anyone we can't confirm as an admin sees the normal 404. The database checks again.
  if (error || profile.user_type !== "admin") notFound();

  const [snapshot, heroes] = await Promise.all([readSnapshot(), getHeroes()]);
  const version = snapshot ? patchVersion(snapshot) : 0;
  const fillResult = version > 0 ? await supabase.rpc("admin_matchup_fill", { version }) : null;
  if (fillResult?.error) console.error("Admin matchup fill:", fillResult.error.message);
  const rows = fillResult && !fillResult.error ? readFill(fillResult.data) : null;
  const nowMs = renderedAt();

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="page-title">Data Status</h1>
        <p className="text-sm text-muted">How far the slow STRATZ jobs have come. Turkey time. GitHub often starts scheduled runs late.</p>
      </div>

      {!snapshot || !rows ? (
        <p role="alert" className="notice notice-error">
          Couldn&apos;t load the data status. Please refresh the page.
        </p>
      ) : (
        <Status snapshot={snapshot} rows={rows} heroes={heroes} nowMs={nowMs} />
      )}
    </main>
  );
}

function Status({
  snapshot,
  rows,
  heroes,
  nowMs,
}: {
  snapshot: Snapshot;
  rows: NonNullable<ReturnType<typeof readFill>>;
  heroes: { id: number; name: string; icon: string }[];
  nowMs: number;
}) {
  const paths = twoPathStatus(snapshot, nowMs);
  const fill = fillStatus(snapshot, rows);
  return (
    <>
      <JobCard
        title="Two-Path Builds"
        unit="hero builds"
        progress={paths}
        facts={[{ label: "With a Late Path", value: `${paths.withPath} of ${paths.done} done` }]}
        timing={{ last: snapshot.generatedAt, next: nextRun(nowMs, REFRESH_HOURS, REFRESH_MINUTE), nowMs }}
      />
      <JobCard
        title="Matchup Fill"
        unit="matchups"
        progress={fill}
        facts={[{ label: "Plan", value: `Top ${HEROES_PER_POSITION} heroes of each position against every hero` }]}
        timing={{ last: fill.lastFetched, next: nextRun(nowMs, BACKFILL_HOURS, BACKFILL_MINUTE), nowMs }}
      >
        <FillLanes fill={fill} heroes={new Map(heroes.map((h) => [h.id, { name: h.name, icon: h.icon }]))} />
      </JobCard>
    </>
  );
}

/** A server component renders once per request, so reading the clock here is stable for that render. */
function renderedAt(): number {
  return Date.now();
}
