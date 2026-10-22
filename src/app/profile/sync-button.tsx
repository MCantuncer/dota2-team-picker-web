"use client";

import { useActionState } from "react";
import { syncRank } from "./actions";

export function SyncButton() {
  const [error, action, pending] = useActionState(syncRank, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <button type="submit" disabled={pending} className="rounded-md px-3 py-1.5 text-sm ring-1 ring-zinc-600 hover:bg-zinc-800">
        {pending ? "Refreshing…" : "Refresh from OpenDota"}
      </button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </form>
  );
}
