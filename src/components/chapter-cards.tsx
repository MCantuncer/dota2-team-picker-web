import Image from "next/image";
import type { CSSProperties } from "react";
import type { LanePlan, LaneVerdict } from "@/lib/engine/game-plan";
import type { PairLane } from "@/lib/engine/lane-odds";
import type { Chapter, Spike, Story } from "@/lib/engine/story";
import type { ItemInfo, Snapshot } from "@/lib/engine/types";
import { FaceStack } from "./face-stack";
import { HeroFace } from "./hero-frame";
import { ABILITY_CDN } from "./skill-track";
import { itemArt } from "./story-timeline";
import { namedHeroes } from "@/lib/story-axis";

const CDN = "https://cdn.cloudflare.steamstatic.com";
/** Roshan's Aegis is not a shop item, so its art is not in the snapshot's items. */
const AEGIS = "/apps/dota2/images/dota_react/items/aegis.png";

const LANE_TITLES: Record<string, string> = { "Safe lane": "Safe Lane", Mid: "Mid", "Off lane": "Off Lane" };
const VERDICT_WORDS: Record<LaneVerdict, string> = { win: "Won", even: "Even", hard: "Hard" };
const VERDICT_CHIPS: Record<LaneVerdict, string> = { win: "bg-radiant-tint text-radiant", even: "bg-raised text-muted", hard: "bg-dire-tint text-dire" };

export interface ChapterCardsProps {
  story: Story;
  lanes: LanePlan[];
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id. */
  icons: Record<number, string>;
  /** Each hero's abilities, to draw the combo's spells. */
  abilities?: Snapshot["heroAbilities"];
  /** Shop items, for the item art. */
  items?: Record<string, ItemInfo>;
}

/**
 * The game clock's chapters as cards, one under each of its columns (Can's pick, option A on the Game Clock Chapters
 * mockup, 2026-11-15): Lanes draws all three lanes with their real lane results, First Fight our combo's spells and
 * the fight window, Roshan the Aegis with the three key items that make us ready. A chapter with nothing measured to
 * draw keeps its one short line. On a phone the cards stack, so the clock is the only part that scrolls sideways.
 */
export function ChapterCards({ story, lanes, heroName, icons, abilities, items }: ChapterCardsProps) {
  const chapters = story.chapters;
  if (!chapters.length) return null;
  const heroIds = [...new Set(lanes.flatMap((l) => [...l.ours, ...l.theirs]))];
  const idOf = (name: string) => heroIds.find((id) => heroName(id) === name);
  const portraitOf = (name: string) => {
    const id = idOf(name);
    return id === undefined ? undefined : icons[id];
  };
  const itemImg = itemArt(items);
  const names = heroIds.map(heroName);
  return (
    <ol
      className="grid gap-4 lg:grid-cols-[repeat(var(--chapters),minmax(0,1fr))]"
      style={{ "--chapters": chapters.length } as CSSProperties}
      aria-label="Chapters"
    >
      {chapters.map((c) => (
        <li key={c.phase} className={`min-w-0 ${hasContent(c, story) ? "" : "max-lg:hidden"}`}>
          {hasContent(c, story) && (
            <article aria-label={`${title(c)}, ${c.phase}`} className="card flex h-full flex-col gap-4 p-5">
              <h4 className="text-base font-semibold text-fg">{title(c)}</h4>
              {c.focus === "lanes" ? (
                <LaneRows lanes={lanes} heroName={heroName} icons={icons} />
              ) : c.focus === "roshan" && story.roshan ? (
                <RoshanReady roshan={story.roshan} portraitOf={portraitOf} itemImg={itemImg} />
              ) : (
                <>
                  {c.focus === "combo" && story.combo ? (
                    <ComboArt combo={story.combo} idOf={idOf} portraitOf={portraitOf} abilities={abilities} />
                  ) : (
                    c.action && <ActionLine action={c.action} portraitOf={portraitOf} names={names} />
                  )}
                  {raceHere(c, story) && <RaceWindow chapter={c} story={story} />}
                </>
              )}
            </article>
          )}
        </li>
      ))}
    </ol>
  );
}

/** The race window goes on the chapter our team gets ready in, unless that chapter draws the lanes or Roshan. */
function raceHere(c: Chapter, story: Story): boolean {
  if (!story.race || c.focus === "lanes" || c.focus === "roshan") return false;
  const ready = story.race.ready;
  return ready >= c.from && (c.to === null || ready < c.to);
}

function hasContent(c: Chapter, story: Story): boolean {
  return Boolean(c.action) || c.focus !== undefined || raceHere(c, story);
}

function title(c: Chapter): string {
  if (c.focus === "lanes") return "Lanes";
  if (c.focus === "combo") return "First Fight";
  if (c.focus === "roshan") return "Roshan";
  return c.from < 20 ? "Mid Game" : "Late Game";
}

const pct = (n: number, of: number) => Math.round((n / of) * 100);

/** Each lane: its verdict, our heroes against theirs, and the deciding pair's lane results as a bar. */
function LaneRows({ lanes, heroName, icons }: { lanes: LanePlan[]; heroName: (id: number) => string; icons: Record<number, string> }) {
  return (
    <ul className="flex flex-col gap-5">
      {lanes.map((lane) => (
        <li key={lane.name} className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-fg">{LANE_TITLES[lane.name] ?? lane.name}</span>
            <span className={`chip h-6 px-2.5 text-[0.8125rem] font-medium shadow-none ${VERDICT_CHIPS[lane.verdict]}`}>{VERDICT_WORDS[lane.verdict]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lane.ours.map((id) => (icons[id] ? <HeroFace key={id} portrait={icons[id]} name={heroName(id)} size={40} /> : null))}
            {lane.theirs.length > 0 && <span className="px-1 text-[0.8125rem] text-subtle">vs</span>}
            {lane.theirs.map((id) => (icons[id] ? <HeroFace key={id} portrait={icons[id]} name={heroName(id)} size={40} isEnemy /> : null))}
          </div>
          {lane.keyPair ? <LaneBar pair={lane.keyPair} heroName={heroName} /> : <p className="text-[0.8125rem] text-subtle">No lane results for these heroes yet</p>}
        </li>
      ))}
    </ul>
  );
}

function LaneBar({ pair, heroName }: { pair: PairLane; heroName: (id: number) => string }) {
  const won = pct(pair.won, pair.games);
  const even = pct(pair.drawn, pair.games);
  const lost = pct(pair.lost, pair.games);
  return (
    <div className="flex flex-col gap-1.5">
      <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-xs">
        {won > 0 && <i className="block bg-radiant" style={{ flex: won }} />}
        {even > 0 && <i className="block bg-line-control" style={{ flex: even }} />}
        {lost > 0 && <i className="block bg-dire" style={{ flex: lost }} />}
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8125rem]">
        <span className="num font-semibold text-radiant">{won}% won</span>
        <span className="num font-semibold text-dire">{lost}% lost</span>
        <span className="text-muted">
          <span className="num">{pair.games.toLocaleString("en-US")}</span> lanes, {heroName(pair.hero)} against {heroName(pair.enemy)}
          {pair.allRanks ? ", all ranks" : ""}
        </span>
      </p>
    </div>
  );
}

/**
 * The spell of a combo hero that the combo's line names ("Arena of Blood" in "Arena of Blood with Mortimer Kisses
 * inside"), the longest name first so a short name inside a longer one never wins.
 */
export function comboSpell(text: string, heroAbilities: { key: string; name: string }[] | undefined): { key: string; name: string } | undefined {
  // STRATZ writes some names in title case ("Arena Of Blood"), so case is ignored.
  const line = text.toLowerCase();
  return [...(heroAbilities ?? [])].sort((a, b) => b.name.length - a.name.length).find((a) => a.name && line.includes(a.name.toLowerCase()));
}

function ComboArt({
  combo,
  idOf,
  portraitOf,
  abilities,
}: {
  combo: NonNullable<Story["combo"]>;
  idOf: (name: string) => number | undefined;
  portraitOf: (name: string) => string | undefined;
  abilities?: Snapshot["heroAbilities"];
}) {
  const spells = combo.heroes.flatMap((hero) => {
    const id = idOf(hero);
    const spell = id === undefined ? undefined : comboSpell(combo.text, abilities?.[String(id)]?.abilities);
    return spell ? [spell] : [];
  });
  return (
    <div className="flex flex-col gap-3">
      {spells.length > 0 && (
        <div className="flex items-center gap-2" aria-hidden>
          {spells.map((s, i) => (
            <span key={s.key} className="flex items-center gap-2">
              {i > 0 && <span className="text-lg text-subtle">+</span>}
              <Image src={`${ABILITY_CDN}${s.key}.png`} alt="" width={48} height={48} className="size-12 rounded-md" />
            </span>
          ))}
        </div>
      )}
      <p className="text-[0.9375rem] font-medium leading-snug text-fg">{combo.text}</p>
      <div className="flex items-center gap-2">
        {combo.heroes.map((hero) => {
          const portrait = portraitOf(hero);
          return portrait ? <HeroFace key={hero} portrait={portrait} name={hero} size={40} /> : null;
        })}
      </div>
    </div>
  );
}

function ActionLine({ action, portraitOf, names }: { action: string; portraitOf: (name: string) => string | undefined; names: string[] }) {
  return (
    <div className="flex items-start gap-2.5">
      <FaceStack icons={namedHeroes(action, names).flatMap((name) => portraitOf(name) ?? [])} />
      <p className="min-w-0 text-[0.9375rem] font-medium leading-snug text-fg">{action}</p>
    </div>
  );
}

const ITEM_MINUTE = (s: Spike) => `${s.around ? "around " : ""}${s.minute}`;

/** Our ready minute against the enemy item our fights race, as a bar across the chapter, and both said in words. */
function RaceWindow({ chapter, story }: { chapter: Chapter; story: Story }) {
  const race = story.race!; // raceHere() checked.
  const theirs = race.theirs;
  const from = Math.min(chapter.from, race.ready, theirs.minute);
  const to = Math.max(chapter.to ?? chapter.from + 10, race.ready, theirs.minute);
  const at = (m: number) => ((m - from) / (to - from)) * 100;
  const lo = Math.min(race.ready, theirs.minute);
  const hi = Math.max(race.ready, theirs.minute);
  const fight = race.ready < theirs.minute;
  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-4">
      <div className="flex items-center gap-2 text-xs text-subtle" aria-hidden>
        <span className="num">{from}</span>
        <span className="relative h-2.5 flex-1 rounded-xs bg-raised">
          {hi > lo && <i className={`absolute inset-y-0 rounded-xs ${fight ? "bg-accent" : "bg-dire/70"}`} style={{ left: `${at(lo)}%`, width: `${at(hi) - at(lo)}%` }} />}
        </span>
        <span className="num">{to}</span>
      </div>
      <p className="text-[0.9375rem] leading-snug text-fg">
        {fight ? (
          <>
            Your team is ready at <b className="num">{race.ready}</b>. {theirs.hero}&apos;s {theirs.item} comes at <b className="num">{ITEM_MINUTE(theirs)}</b>.
          </>
        ) : (
          <>
            {theirs.hero}&apos;s {theirs.item} comes at <b className="num">{ITEM_MINUTE(theirs)}</b>. Your team is ready at <b className="num">{race.ready}</b>.
          </>
        )}
      </p>
    </div>
  );
}

function RoshanReady({
  roshan,
  portraitOf,
  itemImg,
}: {
  roshan: NonNullable<Story["roshan"]>;
  portraitOf: (name: string) => string | undefined;
  itemImg: (name: string) => string | undefined;
}) {
  const last = roshan.spikes.at(-1);
  return (
    <>
      <div className="flex items-center gap-4">
        <Image src={CDN + AEGIS} alt="" width={66} height={48} className="h-12 w-[4.125rem] rounded-md object-cover" />
        <div className="flex flex-col gap-0.5">
          <b className="text-xl font-semibold tracking-[-0.01em] text-fg">From {roshan.minute} Min</b>
          {last && <span className="text-sm text-muted">Your three key items are in by {last.minute}</span>}
        </div>
      </div>
      <ul className="flex flex-col gap-2.5 border-t border-line pt-4">
        {roshan.spikes.map((s) => {
          const portrait = portraitOf(s.hero);
          const img = itemImg(s.item);
          return (
            <li key={`${s.hero}-${s.item}`} className="flex items-center gap-2.5">
              {portrait && <HeroFace portrait={portrait} name={s.hero} size={40} />}
              {img && <Image src={CDN + img} alt="" width={55} height={40} className="h-10 w-[3.4375rem] rounded-md object-cover" />}
              <span className="min-w-0 flex-1 text-sm text-muted">{s.item}</span>
              <b className="num text-radiant">{ITEM_MINUTE(s)}</b>
            </li>
          );
        })}
      </ul>
    </>
  );
}
