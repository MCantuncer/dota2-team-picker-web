"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TeamRef {
  id: string;
  name: string;
}

/** Switch between the captain's teams (friend groups), or start a new one. */
export function TeamPicker({ teams, current, ownerId }: { teams: TeamRef[]; current: string; ownerId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = (id: string) => router.push(`/admin/captain?team=${id}`);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await supabase.from("teams").insert({ owner_id: ownerId, name: trimmed }).select("id").single();
    if (error || !data) return setError(`Team not created: ${error?.message}`);
    setAdding(false);
    setName("");
    open(data.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="flex gap-2"
        >
          <input
            id="new-team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
            placeholder="Team name, e.g. Office stack"
            maxLength={40}
            autoFocus
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button type="submit" className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400">
            Create
          </button>
          <button type="button" onClick={() => setAdding(false)} className="rounded-md px-3 py-1.5 text-sm ring-1 ring-zinc-700 hover:bg-zinc-800">
            Cancel
          </button>
        </form>
      ) : (
        <>
          <select
            id="team-picker"
            aria-label="Team"
            value={current}
            onChange={(e) => open(e.target.value)}
            className="rounded-md bg-zinc-800 px-2 py-1.5 text-sm font-semibold text-zinc-100 ring-1 ring-zinc-700"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button onClick={() => setAdding(true)} className="rounded-md px-3 py-1.5 text-sm ring-1 ring-zinc-700 hover:bg-zinc-800">
            + New team
          </button>
        </>
      )}
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}
