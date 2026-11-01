import type { DraftAction } from "@/lib/draft";
import type { Side } from "./geometry";
import type { DraftRead } from "./reader";

/**
 * The draft changes a screenshot read adds: your side's heroes to your team, the other side's to
 * the enemy, then the bans. Heroes already in the draft are left alone, so typed positions stay.
 */
export function readActions(read: DraftRead, mySide: Side, inDraft: Set<number>): DraftAction[] {
  const ids = (slots: DraftRead["radiant"]) => slots.flatMap((s) => (s.heroId === null ? [] : [s.heroId]));
  const mine = mySide === "radiant" ? read.radiant : read.dire;
  const theirs = mySide === "radiant" ? read.dire : read.radiant;
  const actions: DraftAction[] = [
    ...ids(mine).map((heroId) => ({ kind: "ally" as const, heroId })),
    ...ids(theirs).map((heroId) => ({ kind: "enemy" as const, heroId })),
    ...read.bans.map((heroId) => ({ kind: "ban" as const, heroId })),
  ];
  return actions.filter((a) => !inDraft.has(a.heroId));
}
