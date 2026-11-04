import { Icon, type IconName } from "@/components/icon";
import type { FindingKind, Tone } from "@/lib/player-feedback";

/** One icon per kind of strength or problem, so the same point looks the same on every card and row. */
export const KIND_ICONS: Record<FindingKind, IconName> = {
  early_deaths: "skull",
  deaths: "skull",
  laning: "swords",
  farm: "coins",
  damage: "flame",
  healing: "heart",
  towers: "castle",
};

/**
 * A finding's icon: a 40px tile tinted green for a strength or red for a problem on cards, or the bare 16px icon
 * in that colour on list rows. Decorative: the headline next to it says what it is.
 */
export function FindingIcon({ kind, tone, tile = false }: { kind: FindingKind | null; tone: Tone; tile?: boolean }) {
  const name = (kind && KIND_ICONS[kind]) || (tone === "strength" ? "check" : "alert");
  if (!tile) return <span className={tone === "strength" ? "text-radiant" : "text-dire"}>{<Icon name={name} />}</span>;
  return (
    <span
      aria-hidden
      className={`flex size-10 shrink-0 items-center justify-center rounded-sm ${
        tone === "strength" ? "bg-radiant-tint text-radiant" : "bg-dire-tint text-dire"
      }`}
    >
      <Icon name={name} large />
    </span>
  );
}
