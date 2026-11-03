"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The switch for hero suggestions from the player's own games, and why there are none when
 * OpenDota can't see their games.
 */
export function PoolCardsSwitch({ initialOn, gamesHidden }: { initialOn: boolean; gamesHidden: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: boolean) => {
    // Shows the change at once and puts it back if it isn't saved.
    setOn(next);
    setBusy(true);
    const { error } = await supabase.rpc("set_pool_suggestions_off", { is_off: !next });
    setBusy(false);
    if (error) {
      setOn(!next);
      return setError("Could not save that. Please try again.");
    }
    setError(null);
    // Turning it off also closes the waiting cards; the page shows that.
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => change(e.target.checked)} className="lane-check" />
        Suggest heroes from my recent games
      </label>
      {on && gamesHidden && (
        <p className="text-xs text-subtle">
          We can&apos;t see your recent games, so there are no suggestions yet. In Dota 2, turn on Settings &gt; Options &gt; Social &gt;{" "}
          <i>Expose Public Match Data</i>.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-dire">
          {error}
        </p>
      )}
    </div>
  );
}
