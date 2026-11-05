import type { IconName } from "./icon";
import type { PicksFeel } from "@/lib/game-check-in";

/** A 72px answer tile for the game check-in; pressed (aria-pressed) shows the gold ring. */
export const ANSWER_TILE =
  "relative flex h-18 flex-col items-center justify-center gap-2 rounded-md border border-line-strong bg-raised px-1 text-sm text-muted " +
  "transition-colors hover:border-line-hover aria-pressed:border-accent aria-pressed:bg-accent-tint aria-pressed:text-fg";

/** The icon and colour of each answer to "How were the picks?". */
export const PICK_ICONS: Record<PicksFeel, { icon: IconName; tone: string }> = {
  good: { icon: "thumbs-up", tone: "text-radiant" },
  okay: { icon: "circle-minus", tone: "text-muted" },
  bad: { icon: "thumbs-down", tone: "text-dire" },
};
