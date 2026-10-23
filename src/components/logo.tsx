/** The brand mark: a square split on the diagonal into Radiant and Dire halves. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={className}>
      <rect width="28" height="28" rx="6" className="fill-raised" />
      <path d="M6 6h13.5L6 19.5Z" className="fill-radiant" />
      <path d="M22 22H8.5L22 8.5Z" className="fill-dire" />
    </svg>
  );
}
