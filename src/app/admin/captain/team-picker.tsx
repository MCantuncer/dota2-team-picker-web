"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TeamRef {
  id: string;
  name: string;
  /** False for a team where you are a co-captain. */
  owned: boolean;
}

/** Switch between your teams (friend groups) and the ones you co-captain, or start a new one. */
export function TeamPicker({
  teams,
  current,
  userId,
  canCreate,
}: {
  teams: TeamRef[];
  current: string;
  userId: string;
  /** Only captains and admins can start teams. */
  canCreate: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = (id: string) => router.push(`/admin/captain?team=${id}`);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await supabase.from("teams").insert({ owner_id: userId, name: trimmed }).select("id").single();
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
            className="field w-64"
          />
          <button type="submit" className="btn btn-primary">
            Create
          </button>
          <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost">
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
            className="field min-w-48 font-semibold"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.owned ? t.name : `${t.name} (co-captain)`}
              </option>
            ))}
          </select>
          {canCreate && (
            <button onClick={() => setAdding(true)} className="btn btn-secondary">
              <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              New team
            </button>
          )}
        </>
      )}
      {error && <span className="text-sm text-dire">{error}</span>}
    </div>
  );
}
