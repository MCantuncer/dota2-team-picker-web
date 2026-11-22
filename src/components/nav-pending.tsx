"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useSyncExternalStore } from "react";

/*
 * How many header links are opening a page right now. Pages such as Meta are built on the server for each visit
 * (about a second, longer on a cold start), so without a sign the click looked like it did nothing.
 */
let opening = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const change = (by: number) => {
  opening += by;
  for (const listener of listeners) listener();
};

/** True while a header link's page is on its way. */
export function useNavOpening() {
  return useSyncExternalStore(
    subscribe,
    () => opening > 0,
    () => false,
  );
}

/**
 * Put inside a header `Link`: reports while its page loads. With `bar`, it also shows a sweep under the item, placed
 * by the nearest positioned parent. The sweep fades in after a moment, so a quick open never flickers.
 */
export function NavPending({ bar = false }: { bar?: boolean }) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (!pending) return;
    change(1);
    return () => change(-1);
  }, [pending]);
  if (!bar || !pending) return null;
  return <PendingSweep className="inset-x-3" />;
}

/** The thin accent sweep that says a page is opening. */
export function PendingSweep({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`pending-sweep absolute -bottom-px h-0.5 overflow-hidden ${className}`}>
      <span className="sweep-bar block" />
    </span>
  );
}

/** Along the bottom of the header on phones, where the sections live in the account menu that closes on a tap. */
export function HeaderOpening() {
  const opening = useNavOpening();
  return opening ? <PendingSweep className="inset-x-0 sm:hidden" /> : null;
}
