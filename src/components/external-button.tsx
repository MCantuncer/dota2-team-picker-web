import type { ReactNode } from "react";
import { Icon } from "@/components/icon";

/** The OpenDota page of one match. */
export function openDotaMatchUrl(matchId: number | string): string {
  return `https://www.opendota.com/matches/${matchId}`;
}

/**
 * A link to another site (OpenDota, Steam): a small ghost button that ends in the out arrow and opens a new tab.
 * The site never uses underlined text links; see docs/design-system.md. `label` names the link for screen readers
 * when the visible text alone is not enough ("Match 8012345678 on OpenDota"). `iconOnly` shows just the arrow,
 * for a crowded row; then `label` is required and also shows as the tooltip.
 */
export function ExternalButton({
  href,
  label,
  iconOnly = false,
  children,
}: {
  href: string;
  label?: string;
  iconOnly?: boolean;
  children?: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={iconOnly ? label : undefined}
      className={`btn btn-sm ${iconOnly ? "btn-icon" : "btn-ghost"}`}
    >
      {!iconOnly && children}
      <Icon name="external" />
    </a>
  );
}

/** The OpenDota button for one match, named "Match <id> on OpenDota" for screen readers. */
export function OpenDotaButton({ matchId, iconOnly = false }: { matchId: number | string; iconOnly?: boolean }) {
  return (
    <ExternalButton href={openDotaMatchUrl(matchId)} label={`Match ${matchId} on OpenDota`} iconOnly={iconOnly}>
      OpenDota
    </ExternalButton>
  );
}
