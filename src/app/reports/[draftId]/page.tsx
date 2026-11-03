import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHeroes } from "@/lib/heroes";
import { getItems } from "@/lib/items";
import { getRecords } from "@/lib/records";
import { getReport, type Report } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { YourRecords } from "@/components/your-records";
import { type ReportArt, ReportView } from "./report-view";

export const metadata: Metadata = { title: "Game report · Dota 2 Team Picker" };

/** The post-game report of a party draft the signed-in player played. */
export default async function ReportPage({ params }: PageProps<"/reports/[draftId]">) {
  const { draftId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let report: Report | null;
  try {
    report = await getReport(supabase, draftId);
  } catch {
    return (
      <ReportPageShell>
        <p role="alert" className="notice notice-error">
          Could not load the report. Reload the page to try again.
        </p>
      </ReportPageShell>
    );
  }
  // No report, or not a game this player played: the database shows them nothing either way.
  if (!report) notFound();

  if (!report.facts) {
    return (
      <ReportPageShell>
        <p role="status" className="notice">
          {emptyMessage(report)}
        </p>
      </ReportPageShell>
    );
  }

  // Art, the You tag and the records are extras: without them the report still shows every name and number.
  const [heroes, items, mine, records] = await Promise.all([
    getHeroes().catch(() => []),
    getItems().catch(() => new Map()),
    supabase.from("draft_players").select("hero_id").eq("draft_id", report.draftId).eq("user_id", user.id).maybeSingle(),
    getRecords(supabase).catch(() => null),
  ]);
  const art: ReportArt = { heroes: new Map(heroes.map((h) => [h.id, { name: h.name, image: h.image }])), items };
  const myHeroId = mine.error ? null : (mine.data?.hero_id ?? null);

  return (
    <ReportPageShell>
      {report.status === "waiting_parse" && (
        <p className="notice text-sm">
          From the match summary. Lanes, fights and damage come once OpenDota parses the replay, usually within a few hours.
        </p>
      )}
      {report.status === "basic" && (
        <p className="notice text-sm">OpenDota didn&apos;t parse this replay, so lanes, fights and damage are left out.</p>
      )}
      <ReportView facts={report.facts} art={art} myHeroId={myHeroId} />
      {records && <YourRecords records={records} />}
      <p className="text-xs text-muted">The match data behind this report is kept for 90 days.</p>
    </ReportPageShell>
  );
}

/** What to say while a report has no facts to show. */
function emptyMessage(report: Report): string {
  if (report.isUnreadable) return "This report was made in a newer format. Reload the page to see it.";
  if (report.status === "failed") return "We couldn't build this report. OpenDota may not have this match.";
  return "The report is on its way. It is usually ready within 10 minutes of the game being found.";
}

function ReportPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="page flex flex-1 flex-col gap-6 py-10">
      <h1 className="page-title">Game Report</h1>
      {children}
    </main>
  );
}
