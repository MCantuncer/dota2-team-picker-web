"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Joins the party behind an invite link, then opens the lobby. */
export function JoinPartyButton({ code }: { code: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("join_party_by_link", { code });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    router.push("/draft");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <button onClick={join} disabled={busy} className="btn btn-primary self-start">
        {busy ? "Joining…" : "Join Party"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-dire">
          {error}
        </p>
      )}
    </div>
  );
}
