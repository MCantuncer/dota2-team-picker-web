"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * A saved time in the viewer's own time zone, such as 6 Nov 2026, 16:58 in Turkey. The server can't know that zone,
 * so the first paint shows the time in UTC (labelled) and the browser swaps in its local time once it hydrates.
 */
export function LocalTime({ iso }: { iso: string }) {
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const text = date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    ...(inBrowser ? {} : { timeZone: "UTC" }),
  });
  return <time dateTime={iso}>{inBrowser ? text : `${text} UTC`}</time>;
}
