"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { syncRank } from "./actions";

/** A round icon button beside the rank that reads the rank and hero record from OpenDota again. */
export function SyncButton() {
  const [error, action, pending] = useActionState(syncRank, null);
  const label = pending ? "Refreshing from OpenDota" : "Refresh from OpenDota";
  return (
    <form action={action} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        title={label}
        className="btn btn-icon size-10 rounded-full border border-line-hover hover:border-accent hover:text-accent"
      >
        <span className={`flex ${pending ? "motion-safe:animate-spin" : ""}`}>
          <Icon name="refresh" large />
        </span>
      </button>
      <span role="status" className="text-sm text-dire">
        {error}
      </span>
    </form>
  );
}
