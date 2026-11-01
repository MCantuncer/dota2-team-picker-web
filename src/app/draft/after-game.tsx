"use client";

import { useState } from "react";

/** A match ID as Dota shows it: digits only. */
const MATCH_ID = /^\d{6,12}$/;

/**
 * After the game: finds the match the party draft became and shows whether the party won. The
 * result is saved with the draft for the party's reports. Players without Steam, or with a
 * hidden Dota profile, paste the match ID instead.
 */
export function AfterGame({
  result,
  checking,
  onFind,
}: {
  result: { matchId: number; won: boolean } | null;
  checking: boolean;
  /** Returns a message to show when no result was saved. */
  onFind: (matchId?: number) => Promise<string | null>;
}) {
  const [matchId, setMatchId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const find = async (id?: number) => setMessage(await onFind(id));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = matchId.trim();
    if (!MATCH_ID.test(id)) return setMessage("A match ID is a number, like 8012345678.");
    void find(Number(id));
  };

  return (
    <section aria-labelledby="after-game-title" className="card flex flex-col gap-3 p-4">
      <h2 id="after-game-title" className="section-title">
        After the game
      </h2>
      {result ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`chip micro ${result.won ? "text-radiant" : "text-dire"}`}>{result.won ? "Won" : "Lost"}</span>
          <a href={`https://www.opendota.com/matches/${result.matchId}`} target="_blank" rel="noopener noreferrer" className="underline">
            Match <span className="num">{result.matchId}</span> on OpenDota
          </a>
          <span className="text-muted">Saved for your party&apos;s reports.</span>
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">When the game ends, find its result. It is saved for your party&apos;s reports.</p>
          <div className="flex flex-wrap items-end gap-3">
            <button onClick={() => void find()} disabled={checking} className="btn btn-primary btn-sm">
              {checking ? "Checking…" : "Find result"}
            </button>
            <form onSubmit={submit} className="flex items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Or paste the match ID
                <input value={matchId} onChange={(e) => setMatchId(e.target.value)} inputMode="numeric" autoComplete="off" className="field w-40" />
              </label>
              <button type="submit" disabled={checking} className="btn btn-secondary btn-sm">
                Check
              </button>
            </form>
          </div>
          {message && (
            <p role="status" className="notice notice-warn text-sm">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
