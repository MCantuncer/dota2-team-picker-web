"use client";

import Link from "next/link";
import { PARTY_SIZE } from "@/lib/party";

const chip =
  "hidden items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted ring-1 ring-inset ring-line-strong hover:text-fg md:flex";

/** The party shortcut in the header while you're in one: its size, opening the party on Draft. */
export function PartyChip({ size }: { size: number | null }) {
  if (size === null) return null;
  return (
    <Link href="/draft" className={chip}>
      <span aria-hidden className="live-dot text-radiant" />
      In Party{" "}
      <span className="num text-fg">
        {size}/{PARTY_SIZE}
      </span>
    </Link>
  );
}
