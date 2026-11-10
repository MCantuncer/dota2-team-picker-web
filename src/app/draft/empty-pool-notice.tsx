import Link from "next/link";
import { Icon } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/draft";
import type { Position } from "@/lib/engine/types";

/**
 * Above the picks when none of them come from the player's own heroes for the position: either there are none
 * ("none") or all of them are picked or banned ("used"). The position's role symbol, one short title, one line on
 * what the list shows instead, and one way to fix it.
 */
export function EmptyPoolNotice({ position, reason }: { position: Position; reason: "none" | "used" }) {
  const name = POSITION_NAMES[position - 1];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-md bg-surface p-3 ring-1 ring-inset ring-line">
      <PositionIcon position={position} size={36} className="shrink-0 text-accent" />
      <p className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5 leading-tight">
        <span className="font-semibold text-fg">{reason === "none" ? `No ${name} Heroes Yet` : `All Your ${name} Heroes Are Taken`}</span>
        <span className="text-sm text-muted">Picks come from every hero.</span>
      </p>
      <Link href="/my-heroes" className="btn btn-secondary btn-sm max-sm:w-full">
        <Icon name="plus" />
        {reason === "none" ? `Add ${name} Heroes` : `Add More ${name} Heroes`}
      </Link>
    </div>
  );
}
