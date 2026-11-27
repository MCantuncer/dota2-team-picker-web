import Image from "next/image";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { Story } from "@/lib/engine/story";
import type { HeroAbilities } from "@/lib/engine/types";
import { minuteText } from "@/lib/story-axis";
import { HeroFace } from "./hero-frame";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";
const TALENT_ICON = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/talents.svg";

/** How many core items the Item Build tab shows on itself, and how many levels the Skills tab does. */
export const PREVIEW_ITEMS = 4;
export const PREVIEW_LEVELS = 6;

/** A sentence for screen readers: what the tab shows on itself. */
export function itemsPreviewText(player: PlayerPlan): string {
  const core = player.build?.core.slice(0, PREVIEW_ITEMS) ?? [];
  if (!core.length) return "No item data for this hero yet.";
  const rough = player.build?.timings === "around";
  return `Next: ${core.map((i) => `${i.name} at ${rough ? "about " : ""}${i.minute} min`).join(", ")}.`;
}

/** The Item Build tab's answer: the first core items with their minutes. */
export function ItemsPreview({ player }: { player: PlayerPlan }) {
  const core = player.build?.core.slice(0, PREVIEW_ITEMS) ?? [];
  if (!core.length) return <span className="text-sm text-muted">No item data yet</span>;
  const rough = player.build?.timings === "around";
  return (
    <span className="flex flex-wrap items-end gap-3">
      {core.map((item) => (
        <span key={item.itemId} className="flex flex-col items-center gap-1">
          <Image src={ITEM_CDN + item.img} alt="" width={44} height={32} className="h-8 w-11 rounded-md object-cover" />
          <span className="num text-xs text-muted">
            {rough ? "~" : ""}
            {item.minute}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * The Game Story tab's answer: the minute our team is ready, and the enemy item that minute races. The lane is the
 * First 10 Minutes section's, above the tabs (Can, 2026-11-22), so it is not repeated here.
 */
export function StoryPreview({ ready, race, enemyPortrait }: { ready?: number; race?: Story["race"]; enemyPortrait?: string }) {
  if (ready === undefined) return <span className="text-sm text-muted">No item minutes yet</span>;
  return (
    <span className="flex flex-col items-start gap-2">
      <span className="chip chip-accent h-6 px-2.5 text-sm font-medium">Ready at {ready} Min</span>
      {race && (
        <span className="flex items-center gap-2 text-sm text-muted">
          {enemyPortrait && <HeroFace portrait={enemyPortrait} name={race.theirs.hero} size={24} isEnemy isDecorative />}
          <span>
            {race.theirs.item} <span className="num">{minuteText(race.theirs)}</span>
          </span>
        </span>
      )}
    </span>
  );
}

export function storyPreviewText(ready: number | undefined, race: Story["race"]): string {
  if (ready === undefined) return "No item minutes for this draft yet.";
  const theirs = race?.theirs;
  return [`Your team is ready at ${ready} min.`, theirs ? `Enemy ${theirs.hero}'s ${theirs.item} comes ${theirs.around ? "around" : "at"} ${theirs.minute} min.` : ""].filter(Boolean).join(" ");
}

interface LevelArt {
  level: number;
  /** The ability's key for its art, or "talent". */
  art: string | "talent";
  name: string;
}

/** The first levels of the skill order, as art: an ability's icon, or the talent mark for a talent level. */
export function firstLevels(player: PlayerPlan, abilities?: HeroAbilities, count = PREVIEW_LEVELS): LevelArt[] {
  const plan = player.skills;
  if (!plan?.levels) return [];
  const talentIds = new Set(plan.talents.flatMap((t) => t.options.map((o) => o.id)));
  return plan.levels.slice(0, count).flatMap((id, i): LevelArt[] => {
    if (id === 0) return [];
    if (talentIds.has(id)) return [{ level: i + 1, art: "talent", name: plan.names[id] ?? "Talent" }];
    const key = abilities?.abilities.find((a) => a.id === id)?.key;
    return key ? [{ level: i + 1, art: key, name: plan.names[id] ?? "" }] : [];
  });
}

/** The Skills and Talents tab's answer: the first six levels as ability icons. */
export function SkillsPreview({ levels }: { levels: LevelArt[] }) {
  if (!levels.length) return <span className="text-sm text-muted">No skill order yet</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {levels.map((l) => (
        <span key={l.level} className="flex flex-col items-center gap-1">
          {l.art === "talent" ? (
            <span className="flex size-7 items-center justify-center rounded-md bg-raised">
              <Image src={TALENT_ICON} alt="" width={18} height={19} unoptimized className="size-[1.125rem]" />
            </span>
          ) : (
            <Image src={`${ABILITY_CDN}${l.art}.png`} alt="" width={28} height={28} className="size-7 rounded-md" />
          )}
          <span className="num text-xs text-subtle">{l.level}</span>
        </span>
      ))}
    </span>
  );
}

export function skillsPreviewText(levels: LevelArt[]): string {
  if (!levels.length) return "No skill order for this hero yet.";
  return `Levels 1 to ${levels.at(-1)!.level}: ${levels.map((l) => l.name).join(", ")}.`;
}
