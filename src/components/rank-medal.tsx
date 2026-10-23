import Image from "next/image";
import { rankName } from "@/lib/rank";

/**
 * The in-game rank medal: the medal with its stars layered on top, the way the Dota client shows it.
 * Images are in public/ranks (rank_icon_N is the medal, rank_star_N the stars).
 */
export function RankMedal({ rankTier, size }: { rankTier: number; size: number }) {
  const medal = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  if (medal < 1 || medal > 8) return null;
  return (
    <span role="img" aria-label={rankName(rankTier) ?? undefined} className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <Image src={`/ranks/rank_icon_${medal}.png`} alt="" width={size} height={size} className="absolute inset-0" />
      {medal < 8 && stars >= 1 && stars <= 5 && (
        <Image src={`/ranks/rank_star_${stars}.png`} alt="" width={size} height={size} className="absolute inset-0" />
      )}
    </span>
  );
}
