/** The fewest squares wide enough for Newest and Oldest to stand under the two ends without touching. */
const BOTH_ENDS = 7;

/**
 * Won and lost games as green and red squares, newest on the left, with Newest and Oldest under the ends. A short
 * row has no room for both words, so it says Newest First, and one square says nothing.
 */
export function ResultSquares({ results }: { results: boolean[] }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap gap-1" title="Newest first">
        <span className="sr-only">Newest first: {results.map((w) => (w ? "won" : "lost")).join(", ")}</span>
        {results.map((w, i) => (
          <span key={i} aria-hidden className={`h-5 w-3 rounded-xs ${w ? "bg-radiant" : "bg-dire"}`} />
        ))}
      </span>
      {results.length >= BOTH_ENDS ? (
        <span aria-hidden className="micro flex justify-between text-muted" style={{ maxWidth: `${results.length}rem` }}>
          <span>Newest</span>
          <span>Oldest</span>
        </span>
      ) : (
        results.length > 1 && (
          <span aria-hidden className="micro text-muted">
            Newest First
          </span>
        )
      )}
    </span>
  );
}
