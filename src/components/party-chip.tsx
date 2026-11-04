"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PARTY_SIZE } from "@/lib/party";
import { Icon } from "./icon";

const chip =
  "hidden items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted ring-1 ring-inset ring-line-strong hover:text-fg md:flex";

/**
 * The party shortcut in the header: the party size while you're in one, else a nudge to start one.
 * The nudge hides on the Party page, which has its own Start a Party button.
 */
export function PartyChip({ size }: { size: number | null }) {
  const pathname = usePathname();
  if (size === null) {
    if (pathname === "/party") return null;
    return (
      <Link href="/party" className={chip}>
        <Icon name="plus" />
        Create Party
      </Link>
    );
  }
  return (
    <Link href="/party" className={chip}>
      <span aria-hidden className="live-dot text-radiant" />
      In Party{" "}
      <span className="num text-fg">
        {size}/{PARTY_SIZE}
      </span>
    </Link>
  );
}
