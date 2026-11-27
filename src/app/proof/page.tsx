import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { PageStage } from "@/components/page-stage";
import { SponsorBand } from "@/components/sponsor-band";
import { VerdictHead } from "@/components/verdict-head";
import { getHeroes, type Hero } from "@/lib/heroes";
import { getProof, ladderRows, percent, proofVerdict, rankRoleTitle, rivalsTitle, runningTitle, shortDay } from "@/lib/proof";
import { sponsorFor } from "@/lib/sponsors";
import { FourSteps, GameRows, Ladder, LaneFrame, RankRoleTiles, RivalRows, RunningLine } from "./proof-parts";

export const metadata: Metadata = {
  title: "Do Our Picks Win? · Dota 2 Team Picker",
  description:
    "How often players who took one of our top 3 picks won, checked on real ranked games the engine never saw.",
};

/** The numbers change once a day; the page is rebuilt at most once an hour. */
export const revalidate = 3600;

function Panel({ title, facts, finding, children }: { title: string; facts?: string; finding?: string | null; children: ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-5 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <VerdictHead label={title} facts={facts} finding={finding} />
      {children}
    </section>
  );
}

function TryDraft() {
  return (
    <Link href="/draft" className="btn btn-primary btn-lg">
      <Icon name="play" />
      Try a Draft
    </Link>
  );
}

export default async function ProofPage() {
  const [proof, heroes] = await Promise.all([getProof().catch(() => null), getHeroes().catch(() => [] as Hero[])]);

  if (!proof) {
    return (
      <main className="page flex flex-1 flex-col gap-6 py-10">
        <h1 className="page-title">Do Our Picks Win?</h1>
        <p className="max-w-2xl text-muted">
          The numbers are being built from the newest ranked games. Check back tomorrow.
        </p>
        <div className="flex flex-wrap gap-2">
          <TryDraft />
        </div>
      </main>
    );
  }

  const engine = proof.rivals.engine;
  const ladder = ladderRows(proof.winRange);
  const byId = new Map(heroes.map((h) => [h.id, h]));

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <PageStage
        name="Do Our Picks Win?"
        title={proofVerdict(engine)}
        facts={
          <span className="text-pretty">
            {proof.games.toLocaleString("en-US")} ranked games the engine never saw, {shortDay(proof.from)} to{" "}
            {shortDay(proof.to)}
          </span>
        }
        figure={<LaneFrame lift={engine} />}
        actions={<TryDraft />}
      >
        Players who took one of our top 3 picks won {percent(engine.top3.won)} of their games, against{" "}
        {percent(engine.other.won)} for any other hero.
        {engine.margin !== null && ` Give or take ${(engine.margin * 100).toFixed(1)} points.`}
      </PageStage>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Against Simple Rules" finding={rivalsTitle(proof.rivals)}>
          <RivalRows rivals={proof.rivals} />
        </Panel>
        <Panel title="Over Time" finding={runningTitle(proof.running)}>
          <RunningLine running={proof.running} />
        </Panel>
      </div>

      <SponsorBand sponsor={sponsorFor("proof")} />

      <Panel title="By Rank and Role" finding={rankRoleTitle(proof.byRank, proof.byRole)}>
        <RankRoleTiles byRank={proof.byRank} byRole={proof.byRole} />
      </Panel>

      {ladder.length > 0 && (
        <Panel title="Win Chance Check">
          <Ladder rows={ladder} />
        </Panel>
      )}

      <Panel title="How We Test">
        <FourSteps proof={proof} />
      </Panel>

      {proof.examples.length > 0 && byId.size > 0 && (
        <Panel title="Real Games with Our First Choice">
          <GameRows examples={proof.examples} heroes={byId} />
        </Panel>
      )}
    </main>
  );
}
