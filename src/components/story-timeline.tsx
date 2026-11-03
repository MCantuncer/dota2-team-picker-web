import Image from "next/image";
import type { Chapter, Spike, Story } from "@/lib/engine/story";
import type { ItemInfo } from "@/lib/engine/types";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
/** Minutes drawn for the last chapter, which has no end. */
const LAST_SPAN = 15;
/** The closest two item marks in one row may sit, in percent of the axis, so their art doesn't overlap. */
const MIN_GAP = 12;

export interface StoryTimelineProps {
  story: Story;
  /** Square hero icons by hero name, for the heroes in this draft. */
  heroIcons: Record<string, string>;
  /** Shop items, to find each spike's art by item name. */
  items?: Record<string, ItemInfo>;
}

/**
 * The Story as a minute line (accepted C board, 2026-11-03): one column per chapter, our key items above
 * the line in green, theirs below in red, a copper mark where our team is ready to fight, and the one
 * thing to do in each chapter under it. Wider than a phone, so it scrolls sideways inside its own box.
 */
export function StoryTimeline({ story, heroIcons, items }: StoryTimelineProps) {
  const chapters = story.chapters;
  const width = 100 / Math.max(chapters.length, 1);
  const at = (minute: number) => {
    const i = chapters.findIndex((c) => minute >= c.from && (c.to === null || minute < c.to));
    const c = chapters[i];
    if (!c) return minute < (chapters[0]?.from ?? 0) ? 0 : 100;
    const span = (c.to ?? c.from + LAST_SPAN) - c.from;
    return Math.min(100, i * width + (width * (minute - c.from)) / span);
  };
  const itemImg = itemArt(items);
  const ours = spread(chapters.flatMap((c) => c.ours).map((s) => ({ spike: s, left: at(s.minute) })));
  const theirs = spread(chapters.flatMap((c) => c.theirs).map((s) => ({ spike: s, left: at(s.minute) })));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[57.5rem]">
        <div className="relative h-60" role="img" aria-label={timelineLabel(story)}>
          {chapters.map((c, i) => (
            <div
              key={c.phase}
              className={`absolute inset-y-0 ${i ? "border-l border-line pl-2.5" : ""}`}
              style={{ left: `${i * width}%`, width: `${width}%` }}
            >
              <span className="whitespace-nowrap text-sm text-subtle">{when(c)}</span>
            </div>
          ))}
          <div className="absolute inset-x-0 top-32 h-px bg-line-strong" />
          {chapters.slice(1).map((c, i) => (
            <span key={c.phase} className="num absolute top-[8.25rem] -translate-x-1/2 text-xs text-subtle" style={{ left: `${(i + 1) * width}%` }}>
              {c.from}
            </span>
          ))}
          {ours.map(({ spike, left }) => (
            <SpikeMark key={`us-${spike.hero}-${spike.item}`} spike={spike} left={left} side="us" heroIcon={heroIcons[spike.hero]} itemImg={itemImg(spike.item)} />
          ))}
          {theirs.map(({ spike, left }) => (
            <SpikeMark key={`them-${spike.hero}-${spike.item}`} spike={spike} left={left} side="them" heroIcon={heroIcons[spike.hero]} itemImg={itemImg(spike.item)} />
          ))}
          {story.ready !== undefined && (
            <div className="absolute top-28 h-8 w-0.5 bg-accent" style={{ left: `${at(story.ready)}%` }}>
              <span className="absolute left-2 top-1.5 whitespace-nowrap text-xs font-semibold text-accent">Ready to fight</span>
            </div>
          )}
        </div>
        <ol className="grid" style={{ gridTemplateColumns: `repeat(${chapters.length}, minmax(0, 1fr))` }}>
          {chapters.map((c) => (
            <li key={c.phase} className="flex items-start gap-2.5 border-t border-line pr-3 pt-3 text-[0.9375rem] font-medium leading-snug text-fg">
              <Faces names={Object.keys(heroIcons).filter((name) => c.action.includes(name))} heroIcons={heroIcons} />
              <span>{c.action}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SpikeMark({ spike, left, side, heroIcon, itemImg }: { spike: Spike; left: number; side: "us" | "them"; heroIcon?: string; itemImg?: string }) {
  return (
    <div
      className={`absolute grid -translate-x-1/2 justify-items-center gap-0.5 whitespace-nowrap text-center ${side === "us" ? "top-7" : "top-[9.5rem]"}`}
      style={{ left: `${left}%` }}
    >
      <div className="mb-1 flex items-center gap-1">
        {heroIcon && <Image src={heroIcon} alt={spike.hero} width={64} height={36} className="h-9 w-16 rounded-xs object-cover" />}
        {itemImg && <Image src={ITEM_CDN + itemImg} alt={spike.item} width={44} height={32} className="h-8 w-11 rounded-xs object-cover" />}
      </div>
      <span className={`num text-sm font-semibold leading-tight ${side === "us" ? "text-radiant" : "text-dire"}`}>
        {spike.around ? "~" : ""}
        {spike.minute}
      </span>
      <span className="text-xs leading-tight text-muted">{spike.item}</span>
    </div>
  );
}

function Faces({ names, heroIcons }: { names: string[]; heroIcons: Record<string, string> }) {
  if (!names.length) return null;
  return (
    <span className="flex flex-none gap-0.5 pt-px">
      {names.map((name) => {
        const icon = heroIcons[name];
        return icon ? <Image key={name} src={icon} alt="" width={40} height={22} className="h-[1.375rem] w-10 rounded-xs object-cover" /> : null;
      })}
    </span>
  );
}

/** Marks in one row, moved right where two would overlap and back left from the end. */
function spread<T extends { left: number }>(marks: T[]): T[] {
  const sorted = [...marks].sort((a, b) => a.left - b.left);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev && cur && cur.left - prev.left < MIN_GAP) sorted[i] = { ...cur, left: prev.left + MIN_GAP };
  }
  // Keep the art inside the axis: the last marks step back left if the push ran past the end.
  const edge = 100 - MIN_GAP / 2;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const cur = sorted[i];
    const limit = edge - (sorted.length - 1 - i) * MIN_GAP;
    if (cur && cur.left > limit) sorted[i] = { ...cur, left: limit };
  }
  return sorted;
}

function itemArt(items: Record<string, ItemInfo> | undefined): (name: string) => string | undefined {
  const byName = new Map(Object.values(items ?? {}).map((item) => [item.name, item.img]));
  return (name) => byName.get(name);
}

function when(c: Chapter): string {
  return c.to === null ? `${c.from} min on` : `${c.from} to ${c.to} min`;
}

/** The timeline for screen readers: the same items and minutes as one line. */
function timelineLabel(story: Story): string {
  const spikes = story.chapters.flatMap((c) => [
    ...c.ours.map((s) => `our ${s.hero} ${s.item} at ${s.minute}`),
    ...c.theirs.map((s) => `their ${s.hero} ${s.item} at ${s.minute}`),
  ]);
  const ready = story.ready !== undefined ? `, ready to fight at ${story.ready}` : "";
  return `Item timings: ${spikes.join(", ") || "none"}${ready}.`;
}
