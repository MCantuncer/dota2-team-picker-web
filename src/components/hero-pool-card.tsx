"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isPoolCardHidden, POSITION_WORDS, type PoolCard } from "@/lib/pool-cards";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./icon";

type Answer = "yes" | "no" | "later";

/** How long the "added" note stays before the card goes. */
const DONE_MS = 4000;

/**
 * "Add Monkey King to your carry heroes?" with Yes and No, bottom right on any page but the
 * draft and the sign in and join flows. Waits while a party invite or captain request is up
 * (they carry data-urgent-prompt). Never takes focus; Escape inside it and the close button
 * mean "ask me later" (3 days), never No.
 */
export function HeroPoolCard({ card, heroName, heroImage }: { card: PoolCard; heroName: string; heroImage: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"open" | "added" | "gone">("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = POSITION_WORDS[card.position];

  useEffect(() => {
    if (state !== "added") return;
    const timer = setTimeout(() => setState("gone"), DONE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  if (state === "gone" || isPoolCardHidden(pathname)) return null;

  const answer = async (choice: Answer) => {
    setBusy(true);
    const { error } = await supabase.rpc("answer_pool_suggestion", { card: card.id, answer: choice });
    setBusy(false);
    if (error) return setError("Your answer wasn't saved. Try again.");
    setError(null);
    if (choice === "yes") {
      setState("added");
      // The My Heroes page shows the new hero right away.
      if (pathname.startsWith("/my-heroes")) router.refresh();
    } else {
      setState("gone");
    }
  };

  return (
    <section
      aria-labelledby="pool-card-title"
      onKeyDown={(e) => {
        if (e.key === "Escape" && state === "open" && !busy) void answer("later");
      }}
      className="fixed bottom-4 left-4 right-4 z-40 flex flex-col overflow-hidden rounded-lg border border-line-strong bg-surface shadow-lg sm:left-auto sm:w-88 [body:has([data-urgent-prompt])_&]:hidden"
    >
      {heroImage && <Image src={heroImage} alt="" width={352} height={198} className="h-24 w-full object-cover object-[50%_20%]" />}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="label-caps">From Your Games</span>
            <h2 id="pool-card-title" className="font-medium leading-tight text-fg">
              {state === "added" ? `${heroName} is in your ${role} heroes` : card.question}
            </h2>
          </div>
          {state === "open" && (
            <button onClick={() => answer("later")} disabled={busy} aria-label="Ask me later" className="btn btn-ghost btn-icon btn-sm -mr-1 -mt-1">
              <Icon name="x" />
            </button>
          )}
        </div>
        {state === "added" ? (
          <p role="status" className="text-sm text-muted">
            Drafts and your party now count {heroName} as one of your {role} picks.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">{card.reason}</p>
            <p className="text-xs text-subtle">Adding also turns on {role} in your positions.</p>
            {error && (
              <p role="alert" className="text-sm text-dire">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => answer("yes")} disabled={busy} className="btn btn-primary flex-1">
                Add Hero
              </button>
              <button onClick={() => answer("no")} disabled={busy} className="btn btn-secondary flex-1">
                No
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
