import type { PatchNotice } from "@/lib/patch-notice";

/**
 * Under the Draft header while a patch is young: the patch number on a copper tile, its day, how many of its own
 * games the picks use, and a bar of how much of the pick data is from this patch. Item and skill builds come from
 * STRATZ, whose windows still reach back past the patch, so the line says so.
 */
export function NewPatchNotice({ notice }: { notice: PatchNotice }) {
  const percent = Math.round(notice.share * 100);
  return (
    <section
      aria-label={`New Patch ${notice.name}`}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-xl bg-surface p-3 ring-1 ring-inset ring-line sm:grid-cols-[auto_minmax(0,1fr)_14rem]"
    >
      <span className="num flex size-12 items-center justify-center rounded-lg bg-accent-tint text-base font-semibold text-accent ring-1 ring-inset ring-accent-deep">
        {notice.name}
      </span>
      <p className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <span className="font-semibold text-fg">
          New Patch, Day {notice.day}
        </span>
        <span className="text-sm text-muted">
          Picks use{" "}
          <span className="num text-fg">
            {notice.patchGames.toLocaleString("en-US")}
          </span>{" "}
          ranked games from {notice.name}. Item and skill builds still include
          older games.
        </span>
      </p>
      <div className="flex flex-col gap-1.5 max-sm:col-span-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="micro text-subtle">
            Pick Data from {notice.name}
          </span>
          <span className="num text-sm font-semibold text-fg">{percent}%</span>
        </div>
        <span
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={`Pick data from ${notice.name}`}
          className="relative h-1.5 overflow-hidden rounded-xs bg-raised"
        >
          <span
            className="absolute inset-y-0 left-0 bg-accent"
            style={{ width: `${percent}%` }}
          />
        </span>
      </div>
    </section>
  );
}
