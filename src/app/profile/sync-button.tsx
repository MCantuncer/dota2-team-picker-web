"use client";

import { useActionState } from "react";
import { syncRank } from "./actions";

export function SyncButton() {
  const [error, action, pending] = useActionState(syncRank, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <button type="submit" disabled={pending} className="btn btn-secondary">
        {pending ? "Refreshing…" : "Refresh from OpenDota"}
      </button>
      {error && <span className="text-sm text-dire">{error}</span>}
    </form>
  );
}
