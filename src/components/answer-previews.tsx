import Image from "next/image";
import type { LanePlan, LaneVerdict, PlayerPlan } from "@/lib/engine/game-plan";
import type { HeroAbilities } from "@/lib/engine/types";
import { HeroFace } from "./hero-frame";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";
const TALENT_ICON = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/icons/talents.svg";

/** How many core items the Item Build tab shows on itself, and how many levels the Skills tab does. */
export const PREVIEW_ITEMS = 4;
export const PREVIEW_LEVELS = 6;

const VERDICT_CHIPS: Record<LaneVerdict, { label: string; className: string }> = {
  win: { label: "Won Lane", className: "bg-radiant-tint text-radiant" },
  even: { label: "Even Lane", className: "bg-raised text-muted" },
  hard: { label: "Hard Lane", className: "bg-dire-tint text-dire" },
};

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

/** The Game Story tab's answer: the lane's verdict against its enemy faces, and the minute the team is ready. */
export function StoryPreview({ lane, ready, icons, heroName }: { lane?: LanePlan; ready?: number; icons: Record<number, string>; heroName: (id: number) => string }) {
  const chip = lane ? VERDICT_CHIPS[lane.verdict] : undefined;
  return (
    <span className="flex flex-col items-start gap-2">
      {lane && chip && (
        <span className="flex flex-wrap items-center gap-2">
          <span className={`chip h-6 px-2.5 text-[0.8125rem] font-medium shadow-none ${chip.className}`}>{chip.label}</span>
          {lane.theirs.map((id) =>
            icons[id] ? <HeroFace key={id} portrait={icons[id]} name={heroName(id)} size={24} isEnemy isDecorative /> : null,
          )}
        </span>
      )}
      {ready !== undefined && <span className="chip chip-accent h-6 px-2.5 text-[0.8125rem] font-medium">Ready at {ready} Min</span>}
    </span>
  );
}

export function storyPreviewText(lane: LanePlan | undefined, ready: number | undefined, heroName: (id: number) => string): string {
  const parts = [
    lane ? `${VERDICT_CHIPS[lane.verdict].label}${lane.theirs.length ? ` against ${lane.theirs.map(heroName).join(" and ")}` : ""}.` : "",
    ready !== undefined ? `Your team is ready at ${ready} min.` : "",
  ];
  return parts.filter(Boolean).join(" ") || "The game told minute by minute.";
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
