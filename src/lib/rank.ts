const MEDALS = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];

/** OpenDota rank tier (54 = Legend 4) as text. */
export function rankName(rankTier: number | null): string | null {
  if (!rankTier) return null;
  const medal = MEDALS[Math.floor(rankTier / 10) - 1];
  if (!medal) return null;
  const stars = rankTier % 10;
  return medal === "Immortal" || !stars ? medal : `${medal} ${stars}`;
}
