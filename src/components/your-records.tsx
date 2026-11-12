import { POSITION_NAMES } from "@/lib/draft";
import { bestPair, type Records, recordText, type SuggestionBucket } from "@/lib/records";

const BUCKET_NAMES: Record<SuggestionBucket, string> = {
  top3: "Picked from the top 3 suggestions",
  in8: "Picked from suggestions 4 to 8",
  not_shown: "Picked a hero we didn't suggest",
  no_list: "No suggestions saved for the pick",
};

/** Teammates shown; the rest are in the totals only. */
const MAX_TEAMMATES = 5;

/**
 * The player's records from reported games: how picks from the suggestions did, and how they
 * do with each teammate. Rates show from 10 games; below that only the count.
 */
export function YourRecords({ records }: { records: Records }) {
  const picks = records.suggestions.filter((s) => s.games > 0);
  const teammates = records.teammates.slice(0, MAX_TEAMMATES);

  return (
    <section aria-labelledby="your-records" className="flex flex-col gap-3 border-t border-line pt-6">
      <h2 id="your-records" className="section-title">
        Your Records
      </h2>
      {picks.length === 0 ? (
        <p className="text-sm text-muted">
          Records start after your first reported party game in All Pick, Ranked All Pick or Captains Mode.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <h3 className="label-caps text-muted">Your Picks</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {picks.map((s) => (
                <li key={s.bucket}>
                  {BUCKET_NAMES[s.bucket]}: <span className="num">{recordText(s)}</span>.
                </li>
              ))}
            </ul>
          </div>
          {teammates.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="label-caps text-muted">With Teammates</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {teammates.map((mate) => {
                  const pair = bestPair(mate);
                  return (
                    <li key={mate.id}>
                      {mate.name}: <span className="num">{recordText(mate)}</span>.
                      {pair && (
                        <span className="text-muted">
                          {" "}
                          Best as {POSITION_NAMES[pair.mine - 1]} with them as {POSITION_NAMES[pair.theirs - 1]}:{" "}
                          <span className="num">{recordText(pair)}</span>.
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
