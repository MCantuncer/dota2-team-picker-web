import Image from "next/image";
import type { Chapter, Spike, Story } from "@/lib/engine/story";
import type { ItemInfo } from "@/lib/engine/types";
import { axisPosition, minuteText, spreadMarks, timelineLabel } from "@/lib/story-axis";
import { ItemBand, ItemButton } from "./item-card";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

export interface StoryTimelineProps {
  story: Story;
  /** Square hero icons by hero name, for the heroes in this draft. */
  heroIcons: Record<string, string>;
  /** Shop items, to find each spike's art by item name. */
  items?: Record<string, ItemInfo>;
  /** The viewer's checkpoint: their key item's late minute and what to do if it is late, drawn as a flag. */
  checkpoint?: Checkpoint;
}

/** "No Blink Dagger by 20 min?" at minute 20, with the rest of the fallback line. */
export interface Checkpoint {
  minute: number;
  question: string;
  answer: string;
}

/** The race the headline names, as a band on the axis: a fight window when we are ready first, else a hold zone. */
export function raceBand(story: Story): { from: number; to: number; label: string; fight: boolean } | undefined {
  const race = story.race;
  if (!race) return undefined;
  const theirs = race.theirs.minute;
  if (race.ready < theirs) return { from: race.ready, to: theirs, label: `Fight Here, ${race.ready} to ${theirs}`, fight: true };
  if (race.ready > theirs) return { from: theirs, to: race.ready, label: `Hold Until ${race.ready}`, fight: false };
  return undefined;
}

/**
 * The Story as a minute line (accepted C board, 2026-11-03): one column per chapter, our key items above
 * the line in green, theirs below in red, and a copper mark where our team is ready to fight. What each chapter
 * means is in the chapter cards under it (chapter-cards.tsx). Wider than a phone, so it scrolls sideways inside
 * its own box.
 */
export function StoryTimeline({ story, heroIcons, items, checkpoint }: StoryTimelineProps) {
  const chapters = story.chapters;
  if (!chapters.length) return null;
  const width = 100 / chapters.length;
  const at = (minute: number) => axisPosition(chapters, minute);
  const itemImg = itemArt(items);
  const ours = spreadMarks(chapters.flatMap((c) => c.ours).map((s) => ({ spike: s, left: at(s.minute) })));
  const theirs = spreadMarks(chapters.flatMap((c) => c.theirs).map((s) => ({ spike: s, left: at(s.minute) })));
  const band = raceBand(story);
  const flag = checkpoint && Math.min(97, Math.max(3, at(checkpoint.minute)));
  return (
    // On phones the box scrolls sideways, so it takes keyboard focus to scroll with the arrow keys.
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Story timeline">
      {/* 12% of the axis is the gap between marks: at 62rem that holds a hero and an item side by side. */}
      <div className="min-w-[62rem]">
        <div className={`relative ${checkpoint ? "h-[19rem]" : "h-60"}`} role="group" aria-label={`${timelineLabel(story)}${band ? ` ${band.label}.` : ""}${checkpoint ? ` ${checkpoint.question}` : ""}`}>
          {band && (
            <div
              className={`absolute top-[7.25rem] h-6 rounded-xs border-x ${band.fight ? "border-accent/60 bg-accent/15" : "border-dire/50 bg-dire/10"}`}
              style={{ left: `${at(band.from)}%`, width: `${at(band.to) - at(band.from)}%` }}
            />
          )}
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
              {/* Near the end of the axis the label sits left of the mark so it stays inside. */}
              {/* The label sits on the axis line, so it gets the page colour behind it: the line never runs through it. */}
              <span
                className={`absolute top-1 whitespace-nowrap rounded-xs bg-bg px-1.5 py-0.5 text-xs font-semibold text-accent ${at(story.ready) > 85 ? "right-1.5" : "left-1.5"}`}
              >
                {band?.fight ? band.label : "Ready to fight"}
              </span>
            </div>
          )}
          {checkpoint && flag !== undefined && (
            <div className="absolute bottom-0 top-[7.25rem] w-0 border-l border-dashed border-warn" style={{ left: `${flag}%` }}>
              <span className={`absolute bottom-0 flex w-60 flex-col gap-1 ${flag > 70 ? "right-2 items-end text-right" : "left-2 items-start"}`}>
                <span className="chip h-6 whitespace-nowrap bg-warn-tint px-2 text-[0.8125rem] font-medium text-warn shadow-none">{checkpoint.question}</span>
                <span className="whitespace-normal text-xs leading-snug text-muted">{checkpoint.answer}</span>
              </span>
            </div>
          )}
        </div>
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
        {/* The axis has its own label, so its art carries no names of its own; the item opens its card. */}
        {heroIcon && <Image src={heroIcon} alt="" width={64} height={36} className="h-9 w-16 rounded-xs object-cover" />}
        {itemImg && (
          <ItemButton
            label={`${side === "us" ? "" : "Enemy "}${spike.hero}: ${spike.item}`}
            card={{
              name: spike.item,
              img: itemImg,
              band: (
                <ItemBand
                  timing={{ minute: spike.minute, around: spike.around, side: side === "us" ? "ally" : "enemy" }}
                  chip={{ text: side === "us" ? spike.hero : `Enemy ${spike.hero}`, enemy: side === "them", faces: [{ name: spike.hero, portrait: heroIcon }] }}
                />
              ),
            }}
            className="rounded-xs"
          >
            <Image src={ITEM_CDN + itemImg} alt="" width={44} height={32} className="block h-8 w-11 rounded-xs object-cover" />
          </ItemButton>
        )}
      </div>
      <span className={`num text-sm font-semibold leading-tight ${side === "us" ? "text-radiant" : "text-dire"}`}>
        {minuteText(spike)}
      </span>
      <span className="text-xs leading-tight text-muted">{spike.item}</span>
    </div>
  );
}

/** Item art by display name. Recipes share their item's name, so the first non-recipe with a name wins. */
export function itemArt(items: Record<string, ItemInfo> | undefined): (name: string) => string | undefined {
  const byName = new Map<string, string>();
  for (const item of Object.values(items ?? {})) {
    if (!item.key.startsWith("recipe_") && !byName.has(item.name)) byName.set(item.name, item.img);
  }
  return (name) => byName.get(name);
}

function when(c: Chapter): string {
  return c.to === null ? `${c.from} min on` : `${c.from} to ${c.to} min`;
}
