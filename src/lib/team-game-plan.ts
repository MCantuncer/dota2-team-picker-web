import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** A plan older than this belongs to a game that is already over. */
const FRESH_MS = 2 * 60 * 60 * 1000;

/** A finished draft a captain sent to one of your teams. */
export interface SentPlan {
  /** Our heroes by position (index 0 = pos 1). */
  picks: number[];
  enemies: number[];
  rankBracket: number | null;
  /** Who played each position when it was sent. */
  players: (string | null)[];
  teamName: string;
  createdAt: string;
}

/**
 * The latest game plan sent to any of your teams in the last two hours, or null. The database
 * only returns plans of teams you are in. Throws when the query fails.
 */
export async function latestSentPlan(supabase: SupabaseClient<Database>, now = Date.now()): Promise<SentPlan | null> {
  const { data, error } = await supabase
    .from("team_game_plans")
    .select("picks, enemies, rank_bracket, players, created_at, teams(name)")
    .gt("created_at", new Date(now - FRESH_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    picks: data.picks,
    enemies: data.enemies,
    rankBracket: data.rank_bracket,
    players: data.players,
    teamName: (data.teams as unknown as { name: string } | null)?.name ?? "your team",
    createdAt: data.created_at,
  };
}
