"use client";

import { useMemo, useState } from "react";
import { DraftCaptain } from "@/app/party/draft-captain";
import type { Party } from "@/lib/party";
import { createClient } from "@/lib/supabase/client";

/** The lobby's draft captain bar on the draft screen: take the role, ask for it or step down. */
export function DraftCaptainBar({ party, userId, refresh }: { party: Party; userId: string; refresh: () => Promise<void> }) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (what: string, call: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true);
    const { error } = await call();
    setBusy(false);
    if (error) return setError(`${what}: ${error.message}`);
    setError(null);
    await refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <DraftCaptain
        party={party}
        userId={userId}
        busy={busy}
        run={run}
        become={() => supabase.rpc("become_captain")}
        stepDown={() => supabase.rpc("step_down_captain")}
      />
      {error && (
        <p role="alert" className="notice notice-error text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
