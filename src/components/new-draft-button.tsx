"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { startNewDraft } from "@/app/draft/actions";
import { NEW_DRAFT_EVENT } from "@/lib/draft";
import { Icon } from "./icon";

/**
 * New Draft in the header. On Draft the board starts over in place; from another page the draft is cleared first
 * and Draft opens on the empty board, so the old picks never show. If clearing fails, Draft tries again (?new).
 */
export function NewDraftButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [clearing, startClearing] = useTransition();
  const onClick = () => {
    if (pathname === "/draft") {
      window.dispatchEvent(new Event(NEW_DRAFT_EVENT));
      return;
    }
    startClearing(async () => {
      const error = await startNewDraft().catch((e: unknown) => String(e));
      if (error) console.error("New Draft:", error);
      router.push(error ? "/draft?new=1" : "/draft");
    });
  };
  return (
    <button type="button" onClick={onClick} disabled={clearing} aria-busy={clearing} className="btn btn-primary btn-sm hidden md:inline-flex">
      <Icon name="plus" />
      New Draft
    </button>
  );
}
