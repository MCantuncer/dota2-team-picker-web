/**
 * The brand mark, "Lane map": the map frame with only the mid lane, and the copper dot in mid for
 * the pick we give you.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <rect x="3" y="3" width="42" height="42" rx="4" className="fill-surface stroke-line-hover" strokeWidth="1.5" />
      <path d="M11 37 37 11" strokeWidth="3" strokeLinecap="round" className="stroke-fg" />
      <circle cx="24" cy="24" r="5" className="fill-accent" />
    </svg>
  );
}
