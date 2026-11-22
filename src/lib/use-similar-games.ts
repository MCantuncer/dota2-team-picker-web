"use client";

import { useEffect, useMemo, useState } from "react";
import type { SimilarHeroAnswer } from "@/lib/engine/similar-games";
import {
  readSimilarAnswer,
  type SimilarReason,
  type SimilarRequest,
  similarRetryIn,
} from "@/lib/similar-games";
import { createClient } from "@/lib/supabase/client";

/** Wait this long after the draft or the open tab last changed before asking. */
export const SETTLE_MS = 1500;
/** Times to ask again while the hero's games are still being read, for each settled request. */
export const MAX_RETRIES = 6;

/** What the Similar Games answer shows for one hero. */
export type SimilarState =
  | { kind: "loading" }
  | { kind: "sign-in" }
  /** The hourly limit, the shared budget or a failure stopped the search before any games. */
  | { kind: "unavailable"; reason: "limit" | "failed" }
  | { kind: "ready"; answer: SimilarHeroAnswer; reasons: SimilarReason[] };

/** The HTTP status of a failed invoke, when Supabase gives one. */
const statusOf = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "context" in error &&
  error.context instanceof Response
    ? error.context.status
    : 0;

interface Lookup {
  state: SimilarState;
  retryIn: number | null;
}

async function lookup(request: SimilarRequest): Promise<Lookup> {
  const done = (state: SimilarState): Lookup => ({ state, retryIn: null });
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error("Session check failed", authError);
    return done({ kind: "unavailable", reason: "failed" });
  }
  if (!auth.session) return done({ kind: "sign-in" });
  const { data, error } = await supabase.functions.invoke("similar-games", {
    body: request,
  });
  if (error) {
    const status = statusOf(error);
    if (status === 401) return done({ kind: "sign-in" });
    // 429 is a daily limit: expected, so not logged as a fault.
    if (status === 429) return done({ kind: "unavailable", reason: "limit" });
    console.error("similar-games failed", error);
    return done({ kind: "unavailable", reason: "failed" });
  }
  const answer = readSimilarAnswer(data);
  if (!answer) {
    console.error("similar-games answered in an unknown shape");
    return done({ kind: "unavailable", reason: "failed" });
  }
  const hero = request.heroes[0];
  const mine = answer.heroes.find((h) => h.hero === hero);
  const retryIn = hero === undefined ? null : similarRetryIn(answer, hero);
  if (mine)
    return {
      state: { kind: "ready", answer: mine, reasons: answer.reasons },
      retryIn,
    };
  if (retryIn !== null) return { state: { kind: "loading" }, retryIn };
  const limited =
    answer.reasons.includes("user-limit") || answer.reasons.includes("budget");
  return done({ kind: "unavailable", reason: limited ? "limit" : "failed" });
}

/**
 * Asks similar-games once the request has settled, and again when the viewer signs in or out. While the hero's
 * games are still being read it asks again at the time the answer gives (up to MAX_RETRIES times); a retry that
 * fails keeps the games already shown. Null when there is no request.
 */
export function useSimilarGames(
  request: SimilarRequest | null,
): SimilarState | null {
  const key = request ? JSON.stringify(request) : null;
  // The request for this key; a new object with the same content keeps the same request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => request, [key]);
  // Undefined until the first auth event, so the page load asks once, as the right viewer.
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [answer, setAnswer] = useState<{
    key: string;
    state: SimilarState;
  } | null>(null);

  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_, session) =>
      setUser(session?.user.id ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const fullKey = key && user !== undefined ? `${user ?? ""}|${key}` : null;
  useEffect(() => {
    if (!fullKey || !stable) return;
    let live = true;
    let retries = 0;
    const ask = () => {
      lookup(stable)
        .catch((err: unknown): Lookup => {
          console.error("similar-games failed", err);
          return {
            state: { kind: "unavailable", reason: "failed" },
            retryIn: null,
          };
        })
        .then(({ state: got, retryIn }) => {
          if (!live) return;
          const again = retryIn !== null && retries < MAX_RETRIES;
          // Out of retries with nothing to show: say so rather than load forever.
          const state: SimilarState =
            got.kind === "loading" && !again
              ? { kind: "unavailable", reason: "failed" }
              : got;
          // A retry that gets less than a ready answer keeps the games already shown.
          setAnswer((prev) =>
            retries > 0 &&
            state.kind !== "ready" &&
            prev?.key === fullKey &&
            prev.state.kind === "ready"
              ? prev
              : { key: fullKey, state },
          );
          if (again) {
            retries++;
            timer = setTimeout(ask, retryIn);
          }
        });
    };
    let timer = setTimeout(ask, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [fullKey, stable]);

  if (!key) return null;
  return answer?.key === fullKey ? answer.state : { kind: "loading" };
}
