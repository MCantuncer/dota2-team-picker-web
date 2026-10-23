"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Optional: connect a Steam account to an email account, for rank and hero record. */
export function SteamLink({ linked, result }: { linked: boolean; result?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setPending(true);
    setError(null);
    const { data, error } = await createClient().functions.invoke<{ url: string }>("steam-link", {
      body: { next: "/my-heroes" },
    });
    if (error || !data?.url) {
      setPending(false);
      setError("Could not start linking. Please try again.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <section className="flex flex-wrap items-center gap-3 card px-4 py-3">
      <div className="mr-auto flex flex-col">
        <span className="font-semibold">Steam account</span>
        <span className="text-sm text-muted">
          {linked
            ? "Linked. Your rank and hero record count in suggestions, and you can sign in with Steam."
            : "Optional. Linking adds your rank and hero record to suggestions."}
        </span>
        {result && <span className="text-sm text-fg/90">{result}</span>}
        {error && <span className="text-sm text-dire">{error}</span>}
      </div>
      {!linked && (
        <button
          onClick={link}
          disabled={pending}
          className="btn btn-secondary"
        >
          {pending ? "Opening Steam…" : "Link Steam account"}
        </button>
      )}
    </section>
  );
}
