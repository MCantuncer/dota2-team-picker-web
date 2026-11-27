import Image from "next/image";
import type { Spike, Story } from "@/lib/engine/story";
import type { ItemInfo } from "@/lib/engine/types";
import { minuteText, rulerAt, rulerSpan, rulerStep, timelineLabel } from "@/lib/story-axis";
import { HeroFace } from "./hero-frame";
import { ItemBand, ItemButton } from "./item-card";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
/** Roshan's Aegis is not a shop item, so its art is not in the snapshot's items. */
export const AEGIS = "/apps/dota2/images/dota_react/items/aegis.png";

/** A label past this share of the ruler opens to the left of its line, so it stays inside. */
const FLIP_AT = 0.45;
/** An item mark past this share puts its minute on the left of the art, so it stays inside. */
const MARK_FLIP_AT = 0.8;

export interface StoryTimelineProps {
  story: Story;
  /** Hero portraits by hero name, for the heroes in this draft. */
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

/** A spot on the ruler as CSS: the track keeps 1.5rem free at each end, so art centred on the first or last minute stays whole. */
const at = (share: number) => `calc(1.5rem + (100% - 3rem) * ${share.toFixed(4)})`;

/**
 * The game after the lane as Race Rows (Can's pick on the timeline board, 2026-11-27, after "looks too much things
 * together"): one row per core, ours then the enemy's, each key item on its real minute on a ruler zoomed to where
 * the items land, with a bar of farm leading to it. The fight window (or hold zone), our ready mark, Roshan and the
 * viewer's checkpoint run down through every row. Nothing is pushed sideways, so close items read as close, and the
 * rows fit a phone without sideways scroll. What each chapter means is in the chapter cards under it.
 */
export function StoryTimeline({ story, heroIcons, items, checkpoint }: StoryTimelineProps) {
  const ours = byMinute(story.chapters.flatMap((c) => c.ours));
  const theirs = byMinute(story.chapters.flatMap((c) => c.theirs));
  if (!ours.length && !theirs.length && story.ready === undefined) return null;
  const band = raceBand(story);
  const minutes = [
    ...[...ours, ...theirs].map((s) => s.minute),
    ...(story.ready !== undefined ? [story.ready] : []),
    ...(band ? [band.from, band.to] : []),
    ...(story.roshan ? [story.roshan.minute] : []),
    ...(checkpoint ? [checkpoint.minute] : []),
  ];
  const span = rulerSpan(minutes);
  const share = (minute: number) => rulerAt(span, minute);
  const itemImg = itemArt(items);
  const label = `${timelineLabel(story)}${band ? ` ${band.label}.` : ""}${checkpoint ? ` ${checkpoint.question}` : ""}`;
  const groups = [
    { title: "Your Team", side: "us" as const, spikes: ours },
    { title: "Enemy", side: "them" as const, spikes: theirs },
  ].filter((g) => g.spikes.length);
  // The ruler's row, then each group's title row and one row per hero.
  const rows = 1 + groups.reduce((n, g) => n + 1 + g.spikes.length, 0);
  const flag = checkpoint && share(checkpoint.minute);
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-3">
      {/* Every cell has its row and column, because the lines through the rows share the second column with them. */}
      {/* Faces alone on a phone, faces and names from sm up; the second column is the ruler and its rows. */}
      <div className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
        <div aria-hidden className="col-start-1 row-start-1 h-20" />
        <Ruler span={span} share={share} />
        {groups.map((g, i) => (
          <Group key={g.side} row={2 + (i ? 1 + groups[0]!.spikes.length : 0)} title={g.title} side={g.side} spikes={g.spikes} heroIcons={heroIcons} itemImg={itemImg} share={share} />
        ))}
        {/* The lines through every row sit over the tracks and let clicks through to the item art. */}
        <div aria-hidden className="pointer-events-none relative col-start-2 row-start-1" style={{ gridRowEnd: `span ${rows}` }}>
          {band && <Band band={band} share={share} />}
          {story.ready !== undefined && !band && <ReadyLine minute={story.ready} share={share} />}
          {story.roshan && <RoshanLine minute={story.roshan.minute} share={share} />}
          {flag !== undefined && <div className="absolute bottom-0 top-[5.25rem] border-l border-dashed border-warn" style={{ left: at(flag) }} />}
        </div>
      </div>
      {checkpoint && flag !== undefined && (
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
          <div />
          {/* From sm up the flag's words hang from its line; on a phone they take the row under the rows. */}
          <div className="relative sm:h-24">
            <div
              className={`flex flex-col gap-1 sm:absolute sm:border-l sm:border-dashed sm:border-warn sm:pl-2 sm:top-0 sm:w-60 ${flag > 0.7 ? "sm:-translate-x-full sm:items-end sm:border-l-0 sm:border-r sm:pl-0 sm:pr-2 sm:text-right" : "sm:items-start"}`}
              style={{ left: at(flag) }}
            >
              <span className="chip h-6 self-start whitespace-nowrap bg-warn-tint px-2 text-sm font-medium text-warn shadow-none sm:self-auto">{checkpoint.question}</span>
              <span className="text-xs leading-snug text-muted">{checkpoint.answer}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Minute numbers along the top, every minute ticked; labels sit above the ticks for the lines that run down. */
function Ruler({ span, share }: { span: { from: number; to: number }; share: (m: number) => number }) {
  const step = rulerStep(span);
  const phoneStep = rulerStep(span, true);
  const minutes = Array.from({ length: span.to - span.from + 1 }, (_, i) => span.from + i);
  return (
    <div aria-hidden className="relative col-start-2 row-start-1 h-20">
      {minutes.map((m) => (
        <span
          key={m}
          className={`num absolute bottom-1 grid -translate-x-1/2 justify-items-center gap-1 text-xs text-muted ${m % 5 === 0 ? "font-semibold" : ""}`}
          style={{ left: at(share(m)) }}
        >
          <span className={m % phoneStep === 0 ? (m % step === 0 ? "" : "sm:invisible") : m % step === 0 ? "invisible sm:visible" : "invisible"}>{m}</span>
          <i className="block h-1.5 w-px bg-line-control" />
        </span>
      ))}
    </div>
  );
}

function Group({
  row,
  title,
  side,
  spikes,
  heroIcons,
  itemImg,
  share,
}: {
  /** The grid row of the group's title; its heroes take the rows under it. */
  row: number;
  title: string;
  side: "us" | "them";
  spikes: Spike[];
  heroIcons: Record<string, string>;
  itemImg: (name: string) => string | undefined;
  share: (m: number) => number;
}) {
  const color = side === "us" ? "bg-radiant" : "bg-dire";
  return (
    <>
      <div className="col-span-2 col-start-1 flex h-8 items-end gap-2 whitespace-nowrap text-xs text-muted" style={{ gridRowStart: row }}>
        <i className={`mb-0.5 block h-3.5 w-1 rounded-sm ${color}`} />
        {title}
      </div>
      {spikes.map((spike, i) => {
        const portrait = heroIcons[spike.hero];
        const x = share(spike.minute);
        const flip = x > MARK_FLIP_AT;
        // The minute sits on a small tag in the page colour, so the bar and the lines through the rows (ready, window,
        // Roshan, checkpoint) pass behind the number, never through it, and it reads the same inside the fight window.
        const minute = (
          <span className={`num whitespace-nowrap rounded-md text-xs font-semibold sm:text-sm bg-bg px-1.5 py-0.5 ${side === "us" ? "text-radiant" : "text-dire"}`}>{minuteText(spike)}</span>
        );
        const art = <SpikeArt spike={spike} side={side} portrait={portrait} img={itemImg(spike.item)} />;
        return (
          <div key={`${side}-${spike.hero}-${spike.item}`} className="contents">
            <div className="col-start-1 flex h-[3.25rem] min-w-0 items-center gap-3" style={{ gridRowStart: row + 1 + i }}>
              {portrait && <HeroFace portrait={portrait} name={spike.hero} size={40} isEnemy={side === "them"} isDecorative />}
              <span className={`whitespace-nowrap text-sm text-fg ${portrait ? "max-sm:sr-only" : "max-sm:text-xs"}`}>{spike.hero}</span>
            </div>
            <div className="relative col-start-2 h-[3.25rem] rounded-lg bg-raised" style={{ gridRowStart: row + 1 + i }}>
              <span className={`absolute left-0 top-1/2 -mt-0.5 h-1 rounded-sm opacity-40 ${color}`} style={{ width: at(x) }} />
              {/* The item's centre sits on its minute; the minute reads beside it. */}
              {/* Above the lines that run down through the rows, so the art stays whole. */}
              <span
                className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 sm:gap-1.5 ${flip ? "translate-x-[calc(-100%+1.125rem)] sm:translate-x-[calc(-100%+1.375rem)]" : "-translate-x-[1.125rem] sm:-translate-x-[1.375rem]"}`}
                style={{ left: at(x) }}
              >
                {flip ? (
                  <>
                    {minute}
                    {art}
                  </>
                ) : (
                  <>
                    {art}
                    {minute}
                  </>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function SpikeArt({ spike, side, portrait, img }: { spike: Spike; side: "us" | "them"; portrait?: string; img?: string }) {
  if (!img) return <span className="whitespace-nowrap text-xs text-muted">{spike.item}</span>;
  return (
    <ItemButton
      label={`${side === "us" ? "" : "Enemy "}${spike.hero}: ${spike.item}`}
      card={{
        name: spike.item,
        img,
        band: (
          <ItemBand
            timing={{ minute: spike.minute, around: spike.around, side: side === "us" ? "ally" : "enemy" }}
            chip={{ text: side === "us" ? spike.hero : `Enemy ${spike.hero}`, enemy: side === "them", faces: [{ name: spike.hero, portrait }] }}
          />
        ),
      }}
      className="block rounded-md"
    >
      <Image src={ITEM_CDN + img} alt="" width={44} height={32} className="block h-[1.625rem] w-9 rounded-md object-cover ring-2 ring-bg sm:h-8 sm:w-11" />
    </ItemButton>
  );
}

/** The fight window or hold zone, lit down every row, its label on the ruler's top line. */
function Band({ band, share }: { band: NonNullable<ReturnType<typeof raceBand>>; share: (m: number) => number }) {
  const from = share(band.from);
  const to = share(band.to);
  const flip = !band.fight || from >= FLIP_AT;
  // A fight window opens on our ready minute (solid copper) and closes on their item (dashed); a hold zone the other way round.
  const solid = "2px solid var(--accent)";
  const dashed = `1px dashed color-mix(in srgb, var(--${band.fight ? "accent" : "dire"}) 60%, transparent)`;
  return (
    <div
      className={`absolute bottom-0 top-[5.25rem] ${band.fight ? "bg-accent/10" : "bg-dire/10"}`}
      style={{ left: at(from), width: `calc((100% - 3rem) * ${(to - from).toFixed(4)})`, borderLeft: band.fight ? solid : dashed, borderRight: band.fight ? dashed : solid }}
    >
      <b
        className={`absolute -top-[5.25rem] whitespace-nowrap text-xs font-semibold leading-5 text-accent-bright ${flip ? "-right-0.5 border-r-2 border-accent pr-2" : "-left-0.5 border-l-2 border-accent pl-2"}`}
      >
        {band.label}
      </b>
    </div>
  );
}

/** Our ready minute when there is no fight window to carry it: a copper line with its label on the top line. */
function ReadyLine({ minute, share }: { minute: number; share: (m: number) => number }) {
  const x = share(minute);
  return (
    <div className="absolute bottom-0 top-[5.25rem] w-0.5 -translate-x-1/2 bg-accent" style={{ left: at(x) }}>
      <b className={`absolute -top-[5.25rem] whitespace-nowrap text-xs font-semibold leading-5 text-accent-bright ${x >= FLIP_AT ? "right-0 border-r-2 border-accent pr-2" : "left-0 border-l-2 border-accent pl-2"}`}>
        Ready to Fight
      </b>
    </div>
  );
}

/** Roshan once three key items are in: a quiet dashed line with the Aegis on the ruler's second line. */
function RoshanLine({ minute, share }: { minute: number; share: (m: number) => number }) {
  const x = share(minute);
  return (
    <div className="absolute bottom-0 top-[5.25rem] border-l border-dashed border-line-control" style={{ left: at(x) }}>
      <span
        className={`absolute -top-[3.75rem] flex items-center gap-1.5 whitespace-nowrap border-dashed border-line-control text-xs leading-5 text-muted ${x >= FLIP_AT ? "right-0 flex-row-reverse border-r pr-2" : "-left-px border-l pl-2"}`}
      >
        <Image src={ITEM_CDN + AEGIS} alt="" width={22} height={16} className="h-4 w-[1.375rem] rounded-sm object-cover" />
        Roshan {minute}+
      </span>
    </div>
  );
}

const byMinute = (spikes: Spike[]) => [...spikes].sort((a, b) => a.minute - b.minute);

/** Item art by display name. Recipes share their item's name, so the first non-recipe with a name wins. */
export function itemArt(items: Record<string, ItemInfo> | undefined): (name: string) => string | undefined {
  const byName = new Map<string, string>();
  for (const item of Object.values(items ?? {})) {
    if (!item.key.startsWith("recipe_") && !byName.has(item.name)) byName.set(item.name, item.img);
  }
  return (name) => byName.get(name);
}
