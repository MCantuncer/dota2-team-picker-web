/**
 * A small minimap for a position, seen from Radiant: the lane the position plays is drawn bright.
 * Cores get the lane alone; supports get a dimmer lane and a ward dot, so 3 and 4 (and 1 and 5) read apart.
 */
const LANES = {
  off: "M6 18V6h12",
  mid: "M6 18 18 6",
  safe: "M6 18h12V6",
} as const;

const POSITION_LANE: Record<number, { lane: keyof typeof LANES; support: boolean; ward?: [number, number] }> = {
  1: { lane: "safe", support: false },
  2: { lane: "mid", support: false },
  3: { lane: "off", support: false },
  4: { lane: "off", support: true, ward: [9.5, 9.5] },
  5: { lane: "safe", support: true, ward: [14.5, 14.5] },
};

export function PositionIcon({ position, size = 28, className }: { position: number; size?: number; className?: string }) {
  const p = POSITION_LANE[position];
  if (!p) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden className={className}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="3" stroke="currentColor" strokeOpacity="0.3" />
      {Object.entries(LANES).map(([name, d]) => (
        <path key={name} d={d} stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <path
        d={LANES[p.lane]}
        stroke="currentColor"
        strokeOpacity={p.support ? 0.75 : 1}
        strokeWidth={p.support ? 1.75 : 2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {p.ward && <circle cx={p.ward[0]} cy={p.ward[1]} r="2.75" fill="currentColor" />}
    </svg>
  );
}
