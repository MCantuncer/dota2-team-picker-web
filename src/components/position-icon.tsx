import type { ReactNode } from "react";

/**
 * The role symbols players know from Dota's role screen, drawn for this site as a solid tile with the symbol cut
 * out: sword (Safe Lane, pos 1), bow (Mid Lane, pos 2), shield with lightning (Off Lane, pos 3), hand with a flame
 * (Soft Support, pos 4), hand with a cross (Hard Support, pos 5). The tile takes the text colour, so a selected
 * position is copper and the rest grey. Decorative: always sits next to the position's name.
 */
const HAND = (
  <>
    <path d="M2 14.5h3.5V21H2" />
    <path d="M5.5 15.5 9.5 14h4a1.7 1.7 0 0 1 0 3.4H10" />
    <path d="m13.5 17.4 5-2.4a1.7 1.7 0 0 1 2 2.7L15 21H5.5" />
  </>
);

const GLYPHS: Record<number, ReactNode> = {
  1: (
    <>
      <path d="M19.5 4.5 9.5 14.5" />
      <path d="M19.5 4.5v3.2L10.8 16.4" />
      <path d="M19.5 4.5h-3.2L7.6 13.2" />
      <path d="m6.2 12.8 5 5" />
      <path d="m8.2 15.8-3.4 3.4" />
      <circle cx="4.1" cy="19.9" r="1.1" fill="var(--bg)" />
    </>
  ),
  2: (
    <g transform="rotate(-45 12 12)">
      <path d="M10.5 2.2Q18.8 4.6 18.8 12Q18.8 19.4 10.5 21.8Q16.3 18.2 16.3 12Q16.3 5.8 10.5 2.2z" fill="var(--bg)" stroke="none" />
      <path d="M10.8 2.6 6.2 12l4.6 9.2" strokeWidth="1" />
      <path d="M6.2 12h13.2" strokeWidth="1.6" />
      <path d="M22.4 12 18.6 9.7v4.6z" fill="var(--bg)" stroke="none" />
      <path d="M6.2 12l-2.6-2.4h2.2l2.2 2.4-2.2 2.4h-2.2z" fill="var(--bg)" stroke="none" />
    </g>
  ),
  3: (
    <>
      <path d="M12 3 19.5 5.8v5.7c0 4.6-3.1 7.9-7.5 9.5-4.4-1.6-7.5-4.9-7.5-9.5V5.8z" />
      <path d="M13 7.5 9.8 12.6h4.4L11 17" />
    </>
  ),
  4: (
    <>
      {HAND}
      <path d="M12.5 2.5c1.9 2 3.2 3.6 3.2 5.4a3.2 3.2 0 0 1-6.4 0c0-1.1.5-1.9 1.2-2.6.2.9.7 1.4 1.3 1.5-.2-1.7.1-3 .7-4.3z" />
    </>
  ),
  5: (
    <>
      {HAND}
      <path d="M12.5 2.5v8M8.5 6.5h8" />
    </>
  ),
};

export function PositionIcon({ position, size = 28, className }: { position: number; size?: number; className?: string }) {
  const glyph = GLYPHS[position];
  if (!glyph) return null;
  // Thicker cut lines at small sizes so the symbol survives at 16px.
  const stroke = size <= 16 ? 2.6 : size <= 24 ? 2.2 : 1.9;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden className={className}>
      <rect x="0.5" y="0.5" width="23" height="23" rx="4" fill="currentColor" />
      <g transform="translate(3.2 3.2) scale(0.733)" stroke="var(--bg)" strokeWidth={stroke} strokeLinecap="butt" strokeLinejoin="miter">
        {glyph}
      </g>
    </svg>
  );
}
