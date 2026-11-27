/**
 * Shown the moment Meta is opened, while the server reads this patch's numbers and builds the page (about a second
 * live, longer on a cold start). Before this, a click on Meta seemed to do nothing until the whole page was ready.
 * The page name, the room for its opening finding and the role tiles sit where the page puts them, so little jumps
 * when it arrives.
 */
export default function MetaLoading() {
  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <div className="grid gap-8">
        <div className="grid content-start gap-3 lg:min-h-44">
          <h1 className="text-sm font-semibold text-fg">Meta</h1>
          <div aria-hidden className="h-8 w-full max-w-md rounded-md bg-surface sm:h-11" />
          <div aria-hidden className="h-12 w-full max-w-2xl rounded-md bg-surface max-sm:h-18" />
        </div>
        <div aria-hidden className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[86px] rounded-lg bg-surface ring-1 ring-inset ring-line" />
          ))}
        </div>
        <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:p-6">
          <p className="text-sm text-muted" role="status">
            Loading this patch&apos;s numbers…
          </p>
          <div aria-hidden className="sweep-track">
            <div className="sweep-bar" />
          </div>
        </div>
      </div>
    </main>
  );
}
