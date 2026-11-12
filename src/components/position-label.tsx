import { POSITION_NAMES } from "@/lib/draft";
import { PositionIcon } from "./position-icon";

/**
 * A position as its role symbol and name ("Offlane" with the shield), never "Pos 3 Offlane" (Can, 2026-11-12). The
 * icon takes the text colour unless `iconClassName` sets one.
 */
export function PositionLabel({
  position,
  size = 16,
  className = "",
  iconClassName,
}: {
  position: number;
  size?: number;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <PositionIcon position={position} size={size} className={iconClassName} />
      {POSITION_NAMES[position - 1]}
    </span>
  );
}
