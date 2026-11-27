import type { NeutralItem } from "@/lib/engine/types";

/** The game's tier colours for neutral items, from the site's tokens: grey, green, blue, purple. */
export const TIER_COLOR: Record<number, string> = {
  1: "var(--subtle)",
  2: "var(--radiant)",
  3: "var(--attr-int)",
  4: "var(--attr-uni)",
};

/**
 * What kind of neutral item a card shows, where a shop item shows its gold: "Tier 3 Artifact" in the tier's colour, or
 * "Enchantment, Level 2". A used-up artifact (Disgraced Regalia) keeps its tier.
 */
export function NeutralKind({ item, level }: { item: NeutralItem; level?: number }) {
  if (item.kind === "enchantment") {
    return (
      <span className="text-base font-semibold text-muted">
        Enchantment
        {level ? (
          <>
            , Level <span className="num">{level}</span>
          </>
        ) : null}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 text-base font-semibold" style={{ color: TIER_COLOR[item.tier ?? 0] ?? "var(--muted)" }}>
      <span aria-hidden className="size-2.5 rotate-45 rounded-xs bg-current" />
      <span>
        Tier <span className="num">{item.tier}</span> Artifact
      </span>
    </span>
  );
}
