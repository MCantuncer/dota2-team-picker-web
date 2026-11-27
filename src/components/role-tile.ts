/**
 * The Role tile, where the role switches what a page shows (Meta, My Heroes): the role's symbol over its name. The
 * chosen tile takes the Lane Cut with a copper edge. See docs/design-system.md, "Role and Rank".
 */
const TILE = "grid min-w-0 justify-items-center rounded-lg ring-1 ring-inset transition-colors duration-(--dur-fast)";
const IDLE = "bg-surface text-muted ring-line-strong hover:bg-hover hover:text-fg";
const CHOSEN = "lane-cut [--cut:12px] [--cut-radius:8px] [--cut-edge:var(--accent-deep)] bg-accent-tint text-accent-bright ring-accent-deep";

/** The tile's classes; the caller adds its own gap and padding. */
export function roleTile(isChosen: boolean): string {
  return `${TILE} ${isChosen ? CHOSEN : IDLE}`;
}
