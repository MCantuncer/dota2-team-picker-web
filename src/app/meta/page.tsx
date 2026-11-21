import type { Metadata } from "next";
import { getHeroes, type Hero } from "@/lib/heroes";
import { getMeta, patchDay, sliceGames } from "@/lib/meta";
import { MetaBoard } from "./meta-board";

export const metadata: Metadata = {
  title: "Meta · Dota 2 Team Picker",
  description: "Which heroes ranked players pick and win with in this patch, and who rose or fell since the last one.",
};

/** The numbers change with each refresh, four times a day; the page is rebuilt at most every 10 minutes. */
export const revalidate = 600;

/** A patch is called new for its first two weeks, as on the Draft page. */
const NEW_PATCH_DAYS = 14;

export default async function MetaPage() {
  const [meta, heroes] = await Promise.all([
    getMeta().catch((err: unknown) => {
      console.error("Meta numbers:", err);
      return null;
    }),
    getHeroes().catch(() => [] as Hero[]),
  ]);

  const day = meta ? patchDay(meta, new Date()) : 0;
  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-2">
          <h1 className="page-title">Meta</h1>
          <p className="text-muted">What ranked players pick and win with in this patch.</p>
        </div>
        {meta && (
          <div className="grid grid-cols-[auto_auto] items-center gap-x-4 rounded-xl bg-surface p-3 pr-5 ring-1 ring-inset ring-line">
            <span className="num row-span-2 flex size-12 items-center justify-center rounded-lg bg-accent-tint text-base text-accent ring-1 ring-inset ring-accent-deep">
              {meta.patch.name}
            </span>
            <span className="font-semibold text-fg">
              {day <= NEW_PATCH_DAYS ? "New Patch" : "Patch"}, Day {day}
            </span>
            <span className="text-sm text-muted">
              <span className="num text-fg">{sliceGames(meta, 0).toLocaleString("en-US")}</span> ranked games{" "}
              {meta.days.length >= day ? "so far" : `in the last ${meta.days.length} days`}
            </span>
          </div>
        )}
      </div>
      {meta && heroes.length > 0 ? (
        <MetaBoard meta={meta} heroes={heroes.map(({ id, name, image, icon }) => ({ id, name, image, icon }))} />
      ) : (
        <p className="max-w-2xl text-muted">The numbers for this patch are being counted. Check back in a few hours.</p>
      )}
    </main>
  );
}
