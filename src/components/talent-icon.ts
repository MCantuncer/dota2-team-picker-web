import type { HeroAbilities } from "@/lib/engine/types";
import { ABILITY_CDN, TALENT_ICON } from "./skill-track";

const ICONS = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/";
/** The game's mark for an innate ability (their own icons aren't on the CDN). */
export const INNATE_ICON = `${ICONS}icons/innate_icon.png`;

/** A talent that is only a hero stat ("+15 Strength"), by the stat's name in lower case, to the game's icon for it. */
const STAT_ICONS: Record<string, string> = {
  strength: "icons/hero_strength.png",
  agility: "icons/hero_agility.png",
  intelligence: "icons/hero_intelligence.png",
  "all attributes": "icons/hero_universal.png",
  "attack speed": "heroes/stats/icon_attack_speed.png",
  "movement speed": "heroes/stats/icon_movement_speed.png",
  "attack range": "heroes/stats/icon_attack_range.png",
  damage: "heroes/stats/icon_damage.png",
  "base damage": "heroes/stats/icon_damage.png",
  armor: "heroes/stats/icon_armor.png",
  "magic resistance": "heroes/stats/icon_magic_resist.png",
  "base attack time": "heroes/stats/icon_attack_time.png",
};

/** What a talent buffs, as the tree shows it: a skill, an innate ability, a hero stat, or (anything else) a talent. */
export interface TalentIcon {
  kind: "skill" | "innate" | "stat" | "talent";
  src: string;
  /** The skill, innate ability or stat it buffs, for the hover and screen readers. */
  label?: string;
}

/** The number at the front of a talent ("-50s", "+9%/18%", "2x") and the rest of its name; no number gives "". */
export function splitTalent(name: string): { value: string; rest: string } {
  const m = /^([-+]?\d[\d.,]*[s%x]?(?:\/[-+]?\d[\d.,]*[s%x]?)*)\s+(.+)$/.exec(name.trim());
  return m ? { value: m[1] ?? "", rest: m[2] ?? "" } : { value: "", rest: name.trim() };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whether the talent names `word` as a whole word, plural too ("+2 Chaos Meteors"). */
const names = (talent: string, word: string) => new RegExp(`(^|[^a-z])${escape(word.toLowerCase())}s?([^a-z]|$)`).test(talent.toLowerCase());

/**
 * The icon for a talent: the skill it names (the longest name wins, so "Mana Void" beats "Void"), else the innate
 * ability it names, else the stat it is, else the game's talent mark.
 */
export function talentIcon(name: string, abilities?: HeroAbilities): TalentIcon {
  const skills = [...(abilities?.abilities ?? [])].sort((a, b) => b.name.length - a.name.length);
  const skill = skills.find((a) => a.name && names(name, a.name));
  if (skill) return { kind: "skill", src: `${ABILITY_CDN}${skill.key}.png`, label: skill.name };
  const innate = [...(abilities?.innate ?? [])].sort((a, b) => b.length - a.length).find((n) => names(name, n));
  if (innate) return { kind: "innate", src: INNATE_ICON, label: innate };
  const { value, rest } = splitTalent(name);
  const stat = value ? STAT_ICONS[rest.toLowerCase()] : undefined;
  if (stat) return { kind: "stat", src: `${ICONS}${stat}`, label: rest };
  return { kind: "talent", src: TALENT_ICON };
}
