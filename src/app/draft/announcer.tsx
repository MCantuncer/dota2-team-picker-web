"use client";

import { useEffect, useState } from "react";

/** How long the list must stay the same before it is read out, so a batch entry is announced once. */
export const SETTLE_MS = 700;

/**
 * Tells screen readers the suggestions changed, the way the refreshed cards tell everyone else. The first list
 * is what the page opens with, so it stays silent; every later change is read out once it settles.
 */
export function Announcer({ text }: { text: string }) {
  const [said, setSaid] = useState("");
  const [first, setFirst] = useState<string | null>(text || null);
  const [changed, setChanged] = useState(false);
  // Store what earlier renders saw (React's pattern for this, no refs read during render).
  if (first === null && text) setFirst(text);
  if (!changed && first !== null && text !== first) setChanged(true);

  useEffect(() => {
    if (!changed || !text) return;
    // The same sentence twice in a row would not be read again, so the repeat gets a trailing no-break space.
    const timer = setTimeout(() => setSaid((s) => (s === text ? `${text} ` : text)), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [text, changed]);

  return (
    <p aria-live="polite" className="sr-only">
      {said}
    </p>
  );
}

/** "Picks updated. Best: X, then Y and Z." for the first three suggestions. */
export function picksSentence(names: string[]): string {
  const [best, ...rest] = names;
  if (!best) return "";
  const next = rest.slice(0, 2);
  return next.length ? `Picks updated. Best: ${best}, then ${next.join(" and ")}.` : `Picks updated. Best: ${best}.`;
}
