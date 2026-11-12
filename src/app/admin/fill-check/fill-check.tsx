"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  type FillCheckNearMiss,
  type FillCheckPick,
  type FillCheckReport,
  percent,
  readFillReport,
  statusWords,
  strongText,
  verdictText,
} from "@/lib/fill-check";
import { createClient } from "@/lib/supabase/client";

const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_S = 24 * 60 * 60;

/** The dry run form and its results. */
export function FillCheck({ heroNames }: { heroNames: Record<number, string> }) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The run's time goes with its report, so "days ago" reads from when it ran.
  const [result, setResult] = useState<{ report: FillCheckReport; nowS: number } | null>(null);

  async function run(e: FormEvent) {
    e.preventDefault();
    const id = userId.trim();
    if (id && !UUID.test(id)) return setError("That is not a user id. Leave it empty to check your own games.");
    setRunning(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("fill-heroes", {
      body: id ? { dry_run: true, user_id: id } : { dry_run: true },
    });
    setRunning(false);
    const read = error ? null : readFillReport(data);
    if (!read) return setError("The dry run did not finish. Please try again in a minute.");
    setResult({ report: read, nowS: Date.now() / 1000 });
  }

  const name = (id: number) => heroNames[id] ?? `Hero ${id}`;

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={run} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-72 flex-1 flex-col gap-1.5">
          <span className="label-caps">Player</span>
          <input
            className="field"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Your own games, or a user id"
            spellCheck={false}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={running}>
          {running ? "Running…" : "Run Dry Run"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-dire">
          {error}
        </p>
      )}
      {result && <Results report={result.report} nowS={result.nowS} name={name} />}
    </div>
  );
}

function Results({ report, nowS, name }: { report: FillCheckReport; nowS: number; name: (id: number) => string }) {
  const { sources, coverage, fill } = report;
  return (
    <div className="flex flex-col gap-8">
      <p className={`text-base font-medium ${report.verdict === "go" ? "text-fg" : "text-dire"}`}>{verdictText(report)}</p>

      <section className="flex flex-col gap-2" aria-labelledby="sources-title">
        <h2 id="sources-title" className="section-title">
          Sources
        </h2>
        <ul className="flex flex-col gap-1 text-sm text-muted">
          <li>
            STRATZ: {sources.stratz.games} games from {sources.stratz.pages} pages, {statusWords(sources.stratz.status)}.
          </li>
          <li>
            OpenDota: {sources.openDota.games} games, {statusWords(sources.openDota.status)}.
          </li>
          <li>
            Our drafts: {sources.drafts.games} games, {statusWords(sources.drafts.status)}.
          </li>
          <li>
            Benchmarks: {sources.benchmarks.cached} cached, {sources.benchmarks.fetched} fetched, {sources.benchmarks.missing} missing.
          </li>
          <li>
            Positions from STRATZ {coverage.bySource.stratz}, OpenDota lanes {coverage.bySource.opendota}, drafts {coverage.bySource.draft},
            unknown {coverage.bySource.none} ({coverage.positioned} of {coverage.games}, {percent(coverage.positionedShare)}).
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="positions-title">
        <h2 id="positions-title" className="section-title">
          Positions
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="text-subtle">
            <tr>
              <th className="py-1 font-medium">Position</th>
              <th className="py-1 font-medium">Games</th>
              <th className="py-1 font-medium">Strong by IMP</th>
              <th className="py-1 font-medium">Strong by Stats</th>
              <th className="py-1 font-medium">Filled</th>
            </tr>
          </thead>
          <tbody className="num">
            {POSITION_NAMES.map((posName, i) => {
              const p = i + 1;
              const strong = report.strong[p];
              return (
                <tr key={p} className="border-t border-line">
                  <td className="py-1.5">
                    {posName}
                  </td>
                  <td className="py-1.5">{fill.gamesByPosition[p] ?? 0}</td>
                  <td className="py-1.5">{strong ? strongText(strong.imp) : "none"}</td>
                  <td className="py-1.5">{strong ? strongText(strong.stats) : "none"}</td>
                  <td className="py-1.5">{fill.positions.includes(p) ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {fill.state === "too_few" && <p className="text-sm text-dire">Too few games with a position: nothing would be filled.</p>}
      </section>

      <HeroList title="Would Add" rows={fill.picks} name={name} nowS={nowS} empty="No heroes would be added." />
      <HeroList title="Near Misses" rows={fill.nearMisses} name={name} nowS={nowS} empty="No near misses." />
    </div>
  );
}

function HeroList({
  title,
  rows,
  name,
  nowS,
  empty,
}: {
  title: string;
  rows: (FillCheckPick | FillCheckNearMiss)[];
  name: (id: number) => string;
  nowS: number;
  empty: string;
}) {
  const id = `${title.toLowerCase().replace(/\s+/g, "-")}-title`;
  return (
    <section className="flex flex-col gap-2" aria-labelledby={id}>
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-subtle">{empty}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li key={`${r.heroId}:${r.position}`} className="flex flex-col gap-0.5 border-t border-line py-2 text-sm">
              <span className="font-medium text-fg">
                {name(r.heroId)} <span className="text-muted">{POSITION_NAMES[r.position - 1]}</span>
                {"kind" in r && r.kind === "proven" && <span className="text-muted"> · Proven</span>}
              </span>
              <span className="num text-muted">
                {r.games} games, {r.wins} won ({percent(r.wins / r.games)}), {r.strongGames} of {r.judgedGames} strong
                {r.gamesNeeded !== null && `, needed ${r.gamesNeeded}`}, last played {Math.max(0, Math.round((nowS - r.lastPlayed) / DAY_S))} days ago
              </span>
              {"why" in r && <span className="text-subtle">{r.why}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
