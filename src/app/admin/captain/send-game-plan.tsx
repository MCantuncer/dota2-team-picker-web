"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SendGamePlanProps {
  teamId: string;
  userId: string;
  /** The finished draft: our heroes by position (index 0 = pos 1), five enemies and the bans. */
  picks: number[];
  enemies: number[];
  bans: number[];
  rank: number | null;
  /** Who plays each position, so each player sees their own card first. */
  players: (string | null)[];
}

type Status = "idle" | "sending" | "sent" | "failed";

/**
 * Sends the finished draft to the team, so every member sees the game plan on their Party page.
 * Remount it (with a new key) when the draft changes, so a changed draft can be sent again.
 */
export function SendGamePlan({ teamId, userId, picks, enemies, bans, rank, players }: SendGamePlanProps) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<Status>("idle");

  const send = async () => {
    setStatus("sending");
    const { error } = await supabase
      .from("team_game_plans")
      .insert({ team_id: teamId, sent_by: userId, picks, enemies, bans, rank_bracket: rank, players: players as string[] });
    setStatus(error ? "failed" : "sent");
  };

  return (
    <div className="flex items-center gap-2">
      <p role="status" className="text-xs text-muted">
        {status === "sent" && "Sent. Your team sees it on their Party page."}
        {status === "failed" && <span className="text-dire">Couldn&apos;t send the plan. Try again.</span>}
      </p>
      <button onClick={send} disabled={status === "sending" || status === "sent"} className="btn btn-primary btn-sm">
        {status === "sending" ? "Sending…" : status === "sent" ? "Sent to team" : "Send to team"}
      </button>
    </div>
  );
}
