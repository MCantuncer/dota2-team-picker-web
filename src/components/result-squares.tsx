/** Won and lost games as green and red squares, newest on the left, with Newest and Oldest under the ends. */
export function ResultSquares({ results }: { results: boolean[] }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap gap-1" title="Newest first">
        <span className="sr-only">Newest first: {results.map((w) => (w ? "won" : "lost")).join(", ")}</span>
        {results.map((w, i) => (
          <span key={i} aria-hidden className={`h-5 w-3 rounded-xs ${w ? "bg-radiant" : "bg-dire"}`} />
        ))}
      </span>
      <span aria-hidden className="micro flex justify-between text-subtle" style={{ maxWidth: `${results.length}rem` }}>
        <span>Newest</span>
        <span>Oldest</span>
      </span>
    </span>
  );
}
