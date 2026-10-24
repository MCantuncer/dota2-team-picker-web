const MEDALS = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];
/** Stars as the game writes them: Legend IV, not Legend 4. */
const STARS = ["I", "II", "III", "IV", "V"];

/** OpenDota rank tier (54 = Legend 4) as text, e.g. "Legend IV". */
export function rankName(rankTier: number | null): string | null {
  if (!rankTier) return null;
  const medal = MEDALS[Math.floor(rankTier / 10) - 1];
  if (!medal) return null;
  const stars = rankTier % 10;
  return medal === "Immortal" || !stars ? medal : `${medal} ${STARS[stars - 1] ?? stars}`;
}
