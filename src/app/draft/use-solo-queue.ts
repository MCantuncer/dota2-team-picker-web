"use client";

import { useEffect, useState } from "react";
import { soloQueueStorageKey } from "@/lib/solo-queue";

/**
 * Whether Solo Queue is on, kept per account in this browser. Read after mount, since
 * localStorage isn't there on the server. Off by default and whenever storage fails.
 */
export function useSoloQueue(userId: string | null, enabled: boolean) {
  const [on, setOn] = useState(false);
  const key = soloQueueStorageKey(userId);

  useEffect(() => {
    if (!enabled) return;
    try {
      // "Draft for <Stack>" opens /draft?stack=<id>: that Stack wins over a saved Solo Queue.
      if (new URLSearchParams(window.location.search).has("stack")) return localStorage.removeItem(key);
      // Reading browser storage after mount is the one way to restore it without a server mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOn(localStorage.getItem(key) === "on");
    } catch {
      // No storage: Solo Queue starts off.
    }
  }, [key, enabled]);

  const set = (next: boolean) => {
    setOn(next);
    try {
      if (next) localStorage.setItem(key, "on");
      else localStorage.removeItem(key);
    } catch {
      // Not keeping the choice in this browser is fine.
    }
  };

  return { on: enabled && on, set };
}
