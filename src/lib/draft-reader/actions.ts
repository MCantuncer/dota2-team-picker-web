import type { DraftAction } from "@/lib/draft";
import type { Side } from "./geometry";
import type { SideRead } from "./name";
import type { DraftRead } from "./reader";

const meKey = (me: SideRead) => `${me.side}${me.slot}`;

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

/**
 * Turns a stream of live reads into what is safe to add. A hero counts once it shows in two reads in
 * a row, so a portrait caught mid animation is skipped. It is offered on every read until it reaches
 * the draft, so a pick lost on the way (the page was busy, or two picks landed together) is added
 * half a second later. Once a hero has been in the draft it is not offered again, so a hero you
 * remove by hand (a wrong read) stays out. Your own side is passed on once two reads in a row agree.
 */
export class LiveReads {
  private last = new Set<string>();
  private lastMe = "";
  private landed = new Set<number>();

  /**
   * Notes every hero in the draft as landed. Called on each draft change too, so a hero added and
   * removed by hand between two reads still counts as landed and stays out.
   */
  saw(inDraft: Set<number>) {
    for (const id of inDraft) this.landed.add(id);
  }

  next(read: DraftRead, inDraft: Set<number>): DraftRead {
    this.saw(inDraft);
    const keys = new Set<string>();
    const keep = (key: string, heroId: number) => {
      keys.add(key);
      return this.last.has(key) && !this.landed.has(heroId);
    };
    const slots = (side: "radiant" | "dire") =>
      read[side].map((s, i) =>
        s.heroId !== null && keep(`${side}${i}:${s.heroId}`, s.heroId) ? s : { heroId: null, unsure: s.unsure },
      );
    const stable: DraftRead = {
      radiant: slots("radiant"),
      dire: slots("dire"),
      bans: read.bans.filter((id) => keep(`ban:${id}`, id)),
      // Your side counts once two reads in a row agree on it, like a hero.
      me: read.me && this.lastMe === meKey(read.me) ? read.me : null,
    };
    this.last = keys;
    this.lastMe = read.me ? meKey(read.me) : "";
    return stable;
  }
}
