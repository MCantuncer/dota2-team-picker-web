"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Whether friends can plan drafts with the player's heroes, positions, rank and hero records.
 * One-way: it never changes what the player sees of their friends.
 */
export function ShareHeroesSwitch({ initialOn }: { initialOn: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: boolean) => {
    // Shows the change at once and puts the saved value back if it doesn't save.
    setOn(next);
    setBusy(true);
    const { error } = await supabase.rpc("set_share_heroes_with_friends", { is_on: next });
    setBusy(false);
    if (error) {
      setOn(!next);
      return setError("Could not save that. Please try again.");
    }
    setError(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => change(e.target.checked)} className="lane-check" />
        Share My Heroes With Friends
      </label>
      <p className="max-w-prose text-sm text-muted">
        {on
          ? "Friends can plan drafts with your heroes, positions, rank and hero records."
          : "Friends can still add you to a draft, planned as if you can play any hero."}{" "}
        Owners and Managers of your Stacks, and people in your party, always can.
      </p>
      {error && (
        <p role="alert" className="text-sm text-dire">
          {error}
        </p>
      )}
    </div>
  );
}
