"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tells the backend this player is around, so the trends job checks their recent games. The
 * database writes at most once every 10 minutes, so calling it on each page load is cheap.
 */
export function ActivityMark() {
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    // Only a hint for the job: a failure changes nothing on the page.
    void supabase.rpc("mark_active");
  }, [supabase]);
  return null;
}
