import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { getHeroes, type Hero } from "@/lib/heroes";
import { getProof, ladderRows, percent, shortDay, signedPoints } from "@/lib/proof";
import { FourSteps, GameRows, Ladder, LaneFrame, RankRoleTiles, RivalRows, RunningLine } from "./proof-parts";

export const metadata: Metadata = {
  title: "Do Our Picks Win? · Dota 2 Team Picker",
  description:
    "How often players who took one of our top 3 picks won, checked on real ranked games the engine never saw.",
};

/** The numbers change once a day; the page is rebuilt at most once an hour. */
export const revalidate = 3600;

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-5 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

function Actions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/draft" className="btn btn-primary btn-lg">
        <Icon name="play" />
        Try a Draft
      </Link>
    </div>
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
        <Actions />
      </main>
    );
  }

  const engine = proof.rivals.engine;
  const ladder = ladderRows(proof.winRange);
  const byId = new Map(heroes.map((h) => [h.id, h]));

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-4">
          <h1 className="page-title">Do Our Picks Win?</h1>
          <p className="max-w-2xl text-lg text-fg/80">
            Players who took one of our top 3 picks won {percent(engine.top3.won)} of their games, against{" "}
            {percent(engine.other.won)} for any other hero.
          </p>
          <p className="max-w-2xl text-muted">
            {engine.lift !== null && engine.margin !== null
              ? `That is ${signedPoints(engine.lift)} points, give or take ${(engine.margin * 100).toFixed(1)}. `
              : ""}
            Checked on {proof.games.toLocaleString("en-US")} ranked games from {shortDay(proof.from)} to{" "}
            {shortDay(proof.to)} that the engine never saw.
          </p>
          <Actions />
        </div>
        <LaneFrame lift={engine} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Against Simple Rules">
          <RivalRows rivals={proof.rivals} />
        </Panel>
        <Panel title="Over Time">
          <RunningLine running={proof.running} />
        </Panel>
      </div>

      <Panel title="By Rank and Role">
        <RankRoleTiles byRank={proof.byRank} byRole={proof.byRole} />
      </Panel>

      <div className={`grid gap-4 ${ladder.length ? "lg:grid-cols-2" : ""}`}>
        {ladder.length > 0 && (
          <Panel title="Win Chance Check">
            <Ladder rows={ladder} />
          </Panel>
        )}
        <Panel title="How We Test">
          <FourSteps proof={proof} />
        </Panel>
      </div>

      {proof.examples.length > 0 && byId.size > 0 && (
        <Panel title="Real Games">
          <GameRows examples={proof.examples} heroes={byId} />
        </Panel>
      )}
    </main>
  );
}
