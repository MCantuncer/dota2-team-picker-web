import type { Metadata } from "next";
import { getHeroes, type Hero } from "@/lib/heroes";
import { ItemCardProvider } from "@/components/item-card";
import { getItems } from "@/lib/items";
import { extrasItemIds, getMeta, patchDay, shownRelease } from "@/lib/meta";
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

  // A fresh letter patch (7.42a) is named with its own day: the rates weigh its games most.
  const { name, day } = meta ? shownRelease(meta, new Date()) : { name: "", day: 0 };
  // Names and pictures of the items the extras show; the item list is cached for a day.
  const items = meta?.extras ? await getItems().catch(() => new Map()) : new Map();
  const art = Object.fromEntries(
    (meta?.extras ? extrasItemIds(meta.extras) : []).flatMap((id) => {
      const it = items.get(id);
      return it ? [[String(id), { name: it.name, image: it.image }]] : [];
    }),
  );
  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      {meta && heroes.length > 0 ? (
        <ItemCardProvider items={meta.extras?.items} neutrals={meta.extras?.neutralItems}>
          <MetaBoard
            meta={meta}
            heroes={heroes.map(({ id, name, image, icon }) => ({ id, name, image, icon }))}
            art={art}
            release={{
              name,
              day,
              isNew: day <= NEW_PATCH_DAYS,
              reach: meta.days.length >= patchDay(meta, new Date()) ? "so far" : `in the last ${meta.days.length} days`,
            }}
          />
        </ItemCardProvider>
      ) : (
        <>
          <h1 className="page-title">Meta</h1>
          <p className="max-w-2xl text-muted">The numbers for this patch are being counted. Check back in a few hours.</p>
        </>
      )}
    </main>
  );
}
