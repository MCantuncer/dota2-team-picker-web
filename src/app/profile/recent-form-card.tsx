import Link from "next/link";
import { Icon } from "@/components/icon";
import type { RecentForm } from "@/lib/recent-form";

/** The latest results as green and red squares, newest on the left, with what changed. */
export function RecentFormCard({ form }: { form: RecentForm | null }) {
  return (
    <Link href="/my-heroes/games" className="card flex min-w-0 flex-col gap-3 p-4 hover:border-line-hover">
      <span className="flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-fg">Recent Form</span>
        <span className="flex items-center gap-1 text-sm text-muted">
          Your Games
          <Icon name="chevronRight" />
        </span>
      </span>
      {form ? (
        <>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-semibold tracking-[-0.02em] text-fg">
              Won {form.wins} of {form.results.length}
            </span>
            <span className="text-sm text-muted">your latest ranked and normal games</span>
          </span>
          <span className="flex flex-wrap gap-1" title="Newest first">
            <span className="sr-only">Newest first: {form.results.map((w) => (w ? "won" : "lost")).join(", ")}</span>
            {form.results.map((w, i) => (
              <span key={i} aria-hidden className={`h-5 w-3 rounded-xs ${w ? "bg-radiant" : "bg-dire"}`} />
            ))}
          </span>
          <span
            aria-hidden
            className="micro -mt-2 flex justify-between text-subtle"
            style={{ maxWidth: `${form.results.length}rem` }}
          >
            <span>Newest</span>
            <span>Oldest</span>
          </span>
          {form.note && <span className="text-sm text-muted">{form.note}</span>}
        </>
      ) : (
        <span className="text-sm text-muted">Your latest games show here within 30 minutes of a sync.</span>
      )}
    </Link>
  );
}
