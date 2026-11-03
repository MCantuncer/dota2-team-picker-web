import Image from "next/image";
import type { Chapter, Spike, Story } from "@/lib/engine/story";
import type { ItemInfo } from "@/lib/engine/types";
import { axisPosition, minuteText, namedHeroes, spreadMarks, timelineLabel } from "@/lib/story-axis";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

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
  if (!chapters.length) return null;
  const width = 100 / chapters.length;
  const at = (minute: number) => axisPosition(chapters, minute);
  const itemImg = itemArt(items);
  const ours = spreadMarks(chapters.flatMap((c) => c.ours).map((s) => ({ spike: s, left: at(s.minute) })));
  const theirs = spreadMarks(chapters.flatMap((c) => c.theirs).map((s) => ({ spike: s, left: at(s.minute) })));
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
            <SpikeMark key={`us-${spike.hero}-${spike.item}-${spike.minute}`} spike={spike} left={left} side="us" heroIcon={heroIcons[spike.hero]} itemImg={itemImg(spike.item)} />
          ))}
          {theirs.map(({ spike, left }) => (
            <SpikeMark key={`them-${spike.hero}-${spike.item}-${spike.minute}`} spike={spike} left={left} side="them" heroIcon={heroIcons[spike.hero]} itemImg={itemImg(spike.item)} />
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
              <Faces names={namedHeroes(c.action, Object.keys(heroIcons))} heroIcons={heroIcons} />
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
        {/* The axis is one image with its own label, so its art carries no names of its own. */}
        {heroIcon && <Image src={heroIcon} alt="" width={64} height={36} className="h-9 w-16 rounded-xs object-cover" />}
        {itemImg && <Image src={ITEM_CDN + itemImg} alt="" width={44} height={32} className="h-8 w-11 rounded-xs object-cover" />}
      </div>
      <span className={`num text-sm font-semibold leading-tight ${side === "us" ? "text-radiant" : "text-dire"}`}>
        {minuteText(spike)}
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

/** Item art by display name. Recipes share their item's name, so the first non-recipe with a name wins. */
function itemArt(items: Record<string, ItemInfo> | undefined): (name: string) => string | undefined {
  const byName = new Map<string, string>();
  for (const item of Object.values(items ?? {})) {
    if (!item.key.startsWith("recipe_") && !byName.has(item.name)) byName.set(item.name, item.img);
  }
  return (name) => byName.get(name);
}

function when(c: Chapter): string {
  return c.to === null ? `${c.from} min on` : `${c.from} to ${c.to} min`;
}
